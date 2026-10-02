/**
 * Flow — a canvas of nodes joined by edges, that you pan, pinch and rearrange
 * with a finger.
 *
 * ```tsx
 * <Flow>
 *   <Flow.Background variant="dots" />
 *   <Flow.Node id="db" position={{ x: 24, y: 40 }}>
 *     <Frame>…</Frame>
 *   </Flow.Node>
 *   <Flow.Node id="web" position={{ x: 220, y: 200 }}>
 *     <Frame>…</Frame>
 *   </Flow.Node>
 *   <Flow.Edge from="web" to="db" dashed animated />
 *   <Flow.Controls />
 * </Flow>
 * ```
 *
 * ## Where the positions live
 *
 * Every node's box is kept twice: on the UI thread, where a drag writes it
 * every frame and the node's own transform reads it, and in React state, where
 * the edges are rendered from it. A dragged node therefore never lags its own
 * finger, and the edges attached to it redraw as it moves.
 *
 * The tempting design is one copy — everything on the UI thread, edges
 * animating their own path strings, no renders at all. It does not draw. An
 * animated SVG path in React Native reliably animates its `d` and nothing
 * else, and only while nothing else about it is animated; anything more is
 * dropped with no error, leaving a path that never receives its geometry. So
 * the edges are ordinary elements and cost a render per drag frame. That is a
 * real cost and it is the right trade.
 *
 * An `animated` edge keeps that arrangement and animates the one property the
 * geometry does not own: the dash offset. Its `d` still arrives by re-render,
 * so a dragged node reshapes the edge while the dashes keep marching.
 *
 * JavaScript is told a drag has finished through `onNodeDragEnd`. Positions
 * are otherwise yours to leave alone: pass `position` once and the canvas
 * takes it from there, or keep it in state and pass it back to drive nodes
 * from outside.
 *
 * ## Two gestures, one canvas
 *
 * The pane pans and pinches; a node drags; a handle draws a new connection.
 * They are nested gesture detectors rather than one gesture doing three jobs,
 * so the innermost thing under the finger wins, which is what a finger expects.
 */
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  Rect,
} from 'react-native-svg';
import { tv } from 'tailwind-variants';
import {
  IconColorProvider,
  LockIcon,
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
  UnlockIcon,
} from '../../icons';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  anchorOf,
  arrivalDirection,
  arrowHeadPath,
  autoSides,
  edgePath,
  standOff,
  type FlowPoint,
  type FlowRect,
  type FlowSide,
} from './flow-paths';
import {
  clampNodePosition,
  FLOW_DELETE_ACTION,
  FLOW_MOVE_ACTIONS,
  getFlowConnectionActions,
  moveNodePosition,
  type FlowAccessibilityHandle,
  type FlowAccessibilityNode,
} from './flow-accessibility';
import {
  encodeFlowEdgeKey,
  encodeFlowHandleKey,
  resolveFlowEndpoint,
  type FlowEndpoint,
  type FlowEndpointReference,
} from './flow-identifiers';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const SPRING = { duration: 320, easing: Easing.out(Easing.cubic) } as const;

/**
 * Without this the transform pivots on the layer's centre, and every zoom
 * throws the graph across the screen.
 */
const TRANSFORM_ORIGIN = { transformOrigin: 'top left' } as const;

/** How many screens of grid to draw around the container in each direction. */
const GRID_SPAN = 4;

/**
 * The step the layer grows in once the graph outruns it.
 *
 * Quantised because the layer's size is React state on the render path: sized
 * to the graph exactly, every frame of every drag would resize it and the SVG
 * drawn at its size. Rounded up to a step, it changes a handful of times over a
 * session instead.
 */
const LAYER_STEP = 600;

/**
 * An SVG is backed by a single texture, and a texture has a maximum size the
 * platform will allocate — past it, nothing is drawn at all rather than
 * something clipped. This keeps the grid comfortably under it at 3× device
 * scale, which is why the grid is the only thing sized in graph space.
 */
function clampCanvas(value: number): number {
  return Math.max(Math.min(value, 4000), 1);
}

/** How close a finger has to get to a handle for a connection to land. */
const CONNECT_RADIUS = 44;

/**
 * How far short of a container an edge stops. A group draws its own border, so
 * an edge landing exactly on it would run under the stroke; a node has no
 * border of its own and takes none of this.
 */
const GROUP_EDGE_STANDOFF = 5;

/** Dash and gap length for a broken edge, in graph points. */
const EDGE_DASH = 6;

/**
 * How long an animated edge takes to travel one dash-and-gap. Slow enough to
 * read as flow rather than flicker, fast enough to look live.
 */
const EDGE_MARCH_DURATION = 600;

export type FlowEdgeVariant = 'bezier' | 'smoothstep' | 'step' | 'straight';

export interface FlowViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface FlowNodePosition {
  x: number;
  y: number;
}

/** What `onConnect` is handed when a connection lands. */
export interface FlowConnection {
  /** Node the drag started from. */
  source: string;
  /** Handle it started from, when it started from one. */
  sourceHandle?: string;
  /** Node it was dropped on. */
  target: string;
  /** Handle it was dropped on, when it landed on one. */
  targetHandle?: string;
}

interface HandleEntry extends FlowAccessibilityHandle {
  side: FlowSide;
  offset: number;
}

interface FlowContextValue {
  /**
   * Every node's box in graph coordinates, on the UI thread — what a drag
   * writes to and what the handle hit-test reads.
   */
  rects: SharedValue<Record<string, FlowRect>>;
  /**
   * The same boxes in React state. Edges are ordinary elements rendered from
   * this, not animated ones, so they need a copy React can see.
   */
  boxes: Record<string, FlowRect>;
  /** Write a node's box to both copies. */
  setNodeRect: (id: string, rect: Partial<FlowRect>) => void;
  /** Forget a node's box, when it unmounts. */
  dropNodeRect: (id: string) => void;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  zoom: SharedValue<number>;
  /** The connection being drawn, in graph coordinates. `active` is 0 or 1. */
  connection: SharedValue<{ active: number; x1: number; y1: number; x2: number; y2: number }>;
  size: SharedValue<{ width: number; height: number }>;
  /**
   * The same size as `size`, in React state. An `<Svg>` needs concrete width
   * and height props, which a shared value cannot supply — this changes once
   * per layout, not once per frame.
   */
  box: { width: number; height: number };
  /** The node and grid layer's size. Both layers share it exactly. */
  layer: { width: number; height: number };
  /**
   * Half the node layer's extent. The layer is positioned at `-origin` and a
   * node translates by its graph position plus this, so graph (0, 0) still
   * lands where the container's top-left is.
   */
  origin: { x: number; y: number };
  minZoom: number;
  maxZoom: number;
  locked: boolean;
  setLocked: (locked: boolean) => void;
  nodes: FlowAccessibilityNode[];
  /**
   * Which of `nodeIds` are containers rather than nodes. A group writes its box
   * into the same registry — that is what lets an edge name one and the minimap
   * find it — so the only thing separating the two is this list.
   */
  groupIds: string[];
  handles: HandleEntry[];
  edges: { key: string; props: FlowEdgeProps }[];
  registerNode: (id: string, label?: string) => void;
  unregisterNode: (id: string) => void;
  registerGroup: (id: string) => void;
  unregisterGroup: (id: string) => void;
  registerHandle: (entry: HandleEntry) => void;
  unregisterHandle: (key: string) => void;
  registerEdge: (key: string, props: FlowEdgeProps) => void;
  unregisterEdge: (key: string) => void;
  connectNodes: (connection: FlowConnection) => void;
  canConnect: boolean;
  onNodeDragEnd?: (id: string, position: FlowNodePosition) => void;
  fitView: () => void;
  zoomBy: (factor: number) => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

function useFlow(component: string): FlowContextValue {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Flow>`);
  }
  return context;
}

/**
 * Which layer a part belongs to. Declared on the component as a static so the
 * root can sort its children without depending on function identity.
 */
type FlowSlot = 'background' | 'overlay';

/** Set by Flow.Group, so a node inside one registers as its child. */
const FlowGroupContext = createContext<string | null>(null);

/** Set by Flow.Node, so a handle knows which node it belongs to. */
const FlowNodeContext = createContext<string | null>(null);

const flowVariants = tv({
  slots: {
    root: 'flex-1 overflow-hidden bg-background',
    controls: 'absolute bottom-4 right-4 overflow-hidden rounded-xl border border-border bg-card',
    control: 'h-10 w-10 items-center justify-center active:bg-muted',
    minimap: 'absolute overflow-hidden rounded-xl border border-border bg-card/90',
    handle: 'absolute h-3.5 w-3.5 rounded-full border-2 border-background bg-muted-foreground',
  },
});

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export interface FlowProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** Where the canvas starts. `zoom` of 1 is one graph point per screen point. */
  defaultViewport?: FlowViewport;
  /** Closest the canvas will zoom out. */
  minZoom?: number;
  /** Closest it will zoom in. */
  maxZoom?: number;
  /** Drag the empty canvas to move it. */
  panOnDrag?: boolean;
  /** Pinch to zoom. */
  zoomOnPinch?: boolean;
  /**
   * Frame every node once they have all measured themselves. For a graph whose
   * positions come from data and are not laid out against a known screen size.
   */
  fitViewOnMount?: boolean;
  /** Padding left around the graph when fitting, in screen points. */
  fitViewPadding?: number;
  /** The canvas has moved or zoomed. Fired as it happens, on the JS thread. */
  onViewportChange?: (viewport: FlowViewport) => void;
  /** A node was dropped somewhere new. The only time a drag reaches JavaScript. */
  onNodeDragEnd?: (id: string, position: FlowNodePosition) => void;
  /**
   * A connection was drawn between two handles. The canvas never adds the edge
   * itself — the graph is yours, so what a new connection means is yours too.
   */
  onConnect?: (connection: FlowConnection) => void;
  /** Refuse a connection before `onConnect` sees it. */
  isValidConnection?: (connection: FlowConnection) => boolean;
  children?: ReactNode;
}

function FlowRoot({
  className,
  defaultViewport,
  minZoom = 0.3,
  maxZoom = 2.5,
  panOnDrag = true,
  zoomOnPinch = true,
  fitViewOnMount = false,
  fitViewPadding = 48,
  onViewportChange,
  onNodeDragEnd,
  onConnect,
  isValidConnection,
  children,
  ...props
}: FlowProps) {
  const rects = useSharedValue<Record<string, FlowRect>>({});
  const translateX = useSharedValue(defaultViewport?.x ?? 0);
  const translateY = useSharedValue(defaultViewport?.y ?? 0);
  const zoom = useSharedValue(defaultViewport?.zoom ?? 1);
  const connection = useSharedValue({ active: 0, x1: 0, y1: 0, x2: 0, y2: 0 });
  const size = useSharedValue({ width: 0, height: 0 });

  const [locked, setLocked] = useState(false);
  const [nodes, setNodes] = useState<FlowAccessibilityNode[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [handles, setHandles] = useState<HandleEntry[]>([]);
  const [edges, setEdges] = useState<{ key: string; props: FlowEdgeProps }[]>([]);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [boxes, setBoxes] = useState<Record<string, FlowRect>>({});
  /** The authoritative copy. Both `boxes` and `rects` are written from it. */
  const boxesRef = useRef<Record<string, FlowRect>>({});

  /**
   * Node geometry is kept twice on purpose: on the UI thread, where a drag
   * writes it every frame and the node's own transform reads it, and in React
   * state, where the edges are rendered from it.
   *
   * The single-copy version — everything on the UI thread, edges animating
   * their own path strings — is the tempting one, and it does not draw. An
   * animated SVG path in React Native only reliably animates its `d`, and only
   * when nothing else about it is animated; anything more and the update is
   * dropped with no error, leaving a path that never receives its geometry.
   * So the edges are plain elements, the way they are in every implementation
   * of this that works, and they cost a render per drag frame. That is a real
   * cost and it is the right trade: a graph that redraws is worth more than
   * one that theoretically would not have to.
   */
  const setNodeRect = useCallback(
    (id: string, patch: Partial<FlowRect>) => {
      const existing = boxesRef.current[id] ?? { x: 0, y: 0, width: 0, height: 0 };
      const next = { ...existing, ...patch };
      if (
        existing.x === next.x &&
        existing.y === next.y &&
        existing.width === next.width &&
        existing.height === next.height
      ) {
        return;
      }
      // Merged against the ref, never against the state updater's argument.
      // A state updater runs during render, and touching a shared value there
      // is both a Reanimated violation and a correctness one: the write can be
      // replayed or dropped, so the two copies drift and the edges end up
      // drawn against positions the nodes are not at.
      boxesRef.current = { ...boxesRef.current, [id]: next };
      rects.value = boxesRef.current;
      setBoxes(boxesRef.current);
    },
    [rects]
  );

  const dropNodeRect = useCallback(
    (id: string) => {
      if (!(id in boxesRef.current)) return;
      const { [id]: _removed, ...rest } = boxesRef.current;
      boxesRef.current = rest;
      rects.value = rest;
      setBoxes(rest);
    },
    [rects]
  );

  /**
   * The node layer is given real extent rather than being left the size of the
   * container. A view translated past its parent's bounds still draws, but it
   * stops receiving touches — which is why a node dragged off toward the edge
   * of the canvas would quietly become unmovable. Sizing the layer to the same
   * span as the grid keeps every node inside its parent, where it can be hit.
   */
  /**
   * How far the graph reaches from graph (0, 0), in its worst direction. The
   * layer is symmetric about the origin, so one number covers all four sides.
   *
   * Without this the layer is a fixed multiple of the container, and a graph
   * that grows past it has its edges clipped by the SVG drawn at that size —
   * leaving nodes on screen with the lines between them missing, which reads as
   * the graph having lost its connections rather than as a clipped canvas.
   */
  const reach = useMemo(() => {
    let out = 0;
    for (const id in boxes) {
      const rect = boxes[id]!;
      out = Math.max(
        out,
        Math.abs(rect.x),
        Math.abs(rect.y),
        Math.abs(rect.x + rect.width),
        Math.abs(rect.y + rect.height)
      );
    }
    return Math.ceil(out / LAYER_STEP) * LAYER_STEP;
  }, [boxes]);

  const layer = useMemo(
    () => ({
      width: clampCanvas(Math.max(Math.max(box.width, 320) * GRID_SPAN, reach * 2)),
      height: clampCanvas(Math.max(Math.max(box.height, 480) * GRID_SPAN, reach * 2)),
    }),
    [box.height, box.width, reach]
  );
  const origin = useMemo(
    () => ({ x: layer.width / 2, y: layer.height / 2 }),
    [layer.height, layer.width]
  );

  const viewportChangeRef = useRef(onViewportChange);
  viewportChangeRef.current = onViewportChange;

  const reportViewport = useCallback((x: number, y: number, z: number) => {
    viewportChangeRef.current?.({ x, y, zoom: z });
  }, []);

  const registerNode = useCallback((id: string, label = id) => {
    setNodes((current) => [...current.filter((entry) => entry.id !== id), { id, label }]);
  }, []);

  const unregisterNode = useCallback((id: string) => {
    setNodes((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const registerGroup = useCallback((id: string) => {
    setGroupIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const unregisterGroup = useCallback((id: string) => {
    setGroupIds((current) => current.filter((entry) => entry !== id));
  }, []);

  const registerHandle = useCallback((entry: HandleEntry) => {
    setHandles((current) => [...current.filter((h) => h.key !== entry.key), entry]);
  }, []);

  const unregisterHandle = useCallback((key: string) => {
    setHandles((current) => current.filter((h) => h.key !== key));
  }, []);

  const registerEdge = useCallback((key: string, props: FlowEdgeProps) => {
    setEdges((current) => {
      const rest = current.filter((edge) => edge.key !== key);
      return [...rest, { key, props }];
    });
  }, []);

  const unregisterEdge = useCallback((key: string) => {
    setEdges((current) => current.filter((edge) => edge.key !== key));
  }, []);

  const connectRef = useRef(onConnect);
  connectRef.current = onConnect;
  const validConnectionRef = useRef(isValidConnection);
  validConnectionRef.current = isValidConnection;
  const connectNodes = useCallback((next: FlowConnection) => {
    if (validConnectionRef.current && !validConnectionRef.current(next)) return;
    connectRef.current?.(next);
  }, []);

  const fitView = useCallback(() => {
    const { width, height } = size.value;
    const all = Object.values(rects.value);
    if (!width || !height || all.length === 0) return;

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const rect of all) {
      if (rect.width === 0 || rect.height === 0) continue;
      left = Math.min(left, rect.x);
      top = Math.min(top, rect.y);
      right = Math.max(right, rect.x + rect.width);
      bottom = Math.max(bottom, rect.y + rect.height);
    }
    if (!Number.isFinite(left)) return;

    const graphWidth = Math.max(right - left, 1);
    const graphHeight = Math.max(bottom - top, 1);
    const next = Math.min(
      Math.max(
        Math.min(
          (width - fitViewPadding * 2) / graphWidth,
          (height - fitViewPadding * 2) / graphHeight
        ),
        minZoom
      ),
      maxZoom
    );

    zoom.value = withTiming(next, SPRING);
    translateX.value = withTiming(width / 2 - (left + graphWidth / 2) * next, SPRING);
    translateY.value = withTiming(height / 2 - (top + graphHeight / 2) * next, SPRING);
    reportViewport(translateX.value, translateY.value, next);
  }, [
    fitViewPadding,
    maxZoom,
    minZoom,
    rects,
    reportViewport,
    size,
    translateX,
    translateY,
    zoom,
  ]);

  /** Zoom about the middle of the screen, which is where a button press means. */
  const zoomBy = useCallback(
    (factor: number) => {
      const { width, height } = size.value;
      const current = zoom.value;
      const next = Math.min(Math.max(current * factor, minZoom), maxZoom);
      if (next === current) return;

      const focalX = width / 2;
      const focalY = height / 2;
      const ratio = next / current;
      const x = focalX - (focalX - translateX.value) * ratio;
      const y = focalY - (focalY - translateY.value) * ratio;

      zoom.value = withTiming(next, SPRING);
      translateX.value = withTiming(x, SPRING);
      translateY.value = withTiming(y, SPRING);
      reportViewport(x, y, next);
    },
    [maxZoom, minZoom, reportViewport, size, translateX, translateY, zoom]
  );

  // Nodes measure themselves on their first layout pass, so a fit asked for at
  // mount has nothing to fit to yet. One frame later they do.
  const fitOnMount = useRef(fitViewOnMount);
  useEffect(() => {
    if (!fitOnMount.current || nodes.length === 0) return;
    const timer = setTimeout(fitView, 32);
    return () => clearTimeout(timer);
  }, [fitView, nodes.length]);

  const panStart = useSharedValue({ x: 0, y: 0 });
  const pinchStart = useSharedValue({ zoom: 1, x: 0, y: 0 });

  const paneGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(panOnDrag && !locked)
      .averageTouches(true)
      .onBegin(() => {
        'worklet';
        panStart.value = { x: translateX.value, y: translateY.value };
      })
      .onUpdate((event) => {
        'worklet';
        translateX.value = panStart.value.x + event.translationX;
        translateY.value = panStart.value.y + event.translationY;
      })
      .onEnd(() => {
        'worklet';
        runOnJS(reportViewport)(translateX.value, translateY.value, zoom.value);
      });

    const pinch = Gesture.Pinch()
      .enabled(zoomOnPinch && !locked)
      .onBegin((event) => {
        'worklet';
        pinchStart.value = {
          zoom: zoom.value,
          x: translateX.value,
          y: translateY.value,
        };
        // Keep the point under the fingers still: the translation that holds a
        // focal point in place is the one that scales the distance from it.
        connection.value = { ...connection.value };
        panStart.value = { x: event.focalX, y: event.focalY };
      })
      .onUpdate((event) => {
        'worklet';
        const next = Math.min(
          Math.max(pinchStart.value.zoom * event.scale, minZoom),
          maxZoom
        );
        const ratio = next / pinchStart.value.zoom;
        zoom.value = next;
        translateX.value = event.focalX - (event.focalX - pinchStart.value.x) * ratio;
        translateY.value = event.focalY - (event.focalY - pinchStart.value.y) * ratio;
      })
      .onEnd(() => {
        'worklet';
        runOnJS(reportViewport)(translateX.value, translateY.value, zoom.value);
      });

    return Gesture.Simultaneous(pan, pinch);
  }, [
    connection,
    locked,
    maxZoom,
    minZoom,
    panOnDrag,
    panStart,
    pinchStart,
    reportViewport,
    translateX,
    translateY,
    zoom,
    zoomOnPinch,
  ]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: zoom.value },
    ],
  }));

  const context = useMemo<FlowContextValue>(
    () => ({
      rects,
      boxes,
      setNodeRect,
      dropNodeRect,
      translateX,
      translateY,
      zoom,
      connection,
      size,
      box,
      layer,
      origin,
      minZoom,
      maxZoom,
      locked,
      setLocked,
      nodes,
      groupIds,
      handles,
      edges,
      registerNode,
      unregisterNode,
      registerGroup,
      unregisterGroup,
      registerHandle,
      unregisterHandle,
      registerEdge,
      unregisterEdge,
      connectNodes,
      canConnect: Boolean(onConnect),
      onNodeDragEnd,
      fitView,
      zoomBy,
    }),
    [
      boxes,
      setNodeRect,
      dropNodeRect,
      box,
      layer,
      origin,
      connection,
      edges,
      fitView,
      handles,
      registerEdge,
      unregisterEdge,
      connectNodes,
      locked,
      maxZoom,
      minZoom,
      nodes,
      groupIds,
      onConnect,
      onNodeDragEnd,
      rects,
      registerGroup,
      registerHandle,
      registerNode,
      size,
      translateX,
      translateY,
      unregisterGroup,
      unregisterHandle,
      unregisterNode,
      zoom,
      zoomBy,
    ]
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      size.value = { width, height };
      setBox((current) =>
        current.width === width && current.height === height ? current : { width, height }
      );
    },
    [size]
  );

  // Children are sorted into the layers that actually draw them. Only nodes go
  // inside the transform; the grid and the edges map graph coordinates to
  // screen coordinates themselves, and the controls must not pan away with the
  // graph they control.
  const { background, overlay, canvas } = useMemo(() => splitChildren(children), [children]);

  return (
    <View
      className={flowVariants().root({ className })}
      onLayout={onLayout}
      collapsable={false}
      accessibilityRole="none"
      {...props}
    >
      <FlowContext.Provider value={context}>
        <GestureDetector gesture={paneGesture}>
          <View collapsable={false} style={{ flex: 1 }}>
            {/* Painted in this order: grid, edges, nodes. Only the nodes are
                transformed — the other two do their own mapping, because an
                SVG large enough to hold a whole graph is larger than the
                platform will allocate a texture for. */}
            {/* One transformed layer holding the grid, the edges and the
                nodes, in that paint order. Everything inside it is in graph
                coordinates and the transform carries the pan and the zoom, so
                nothing inside does any work when the canvas moves. */}
            <Animated.View
              collapsable={false}
              style={[
                {
                  position: 'absolute',
                  left: -origin.x,
                  top: -origin.y,
                  width: layer.width,
                  height: layer.height,
                  // Pivot on graph (0, 0), not on this layer's own corner.
                  // The layer starts half its width up and to the left of the
                  // container, so scaling about its corner would throw the
                  // graph off screen by half the layer on every zoom.
                  transformOrigin: [origin.x, origin.y, 0],
                },
                contentStyle,
              ]}
            >
              {background}
              <FlowEdgeLayer />
              {canvas}
            </Animated.View>
          </View>
        </GestureDetector>
        {overlay}
      </FlowContext.Provider>
    </View>
  );
}

/**
 * Sorts what was declared inside `<Flow>` into the three layers that actually
 * draw it.
 *
 * An edge reads best written next to the nodes it joins, but it is an SVG
 * element and has to be inside the canvas's single `<Svg>`; controls and the
 * minimap read best written last, but have to sit outside the transform or
 * they pan away with the graph they control. Rather than make the caller
 * arrange the file to match the paint order, the parts are recognised here.
 *
 * Nested fragments and arrays are flattened on the way, so a `.map()` over
 * edges works exactly as it looks like it should.
 */
function splitChildren(children: ReactNode): {
  background: ReactNode[];
  overlay: ReactNode[];
  canvas: ReactNode[];
} {
  const background: ReactNode[] = [];
  const overlay: ReactNode[] = [];
  const canvas: ReactNode[] = [];

  const visit = (node: ReactNode) => {
    if (node === null || node === undefined || typeof node === 'boolean') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === 'object' && 'type' in node) {
      const type = (node as { type: unknown }).type;
      // Matched on a static marker rather than on the function itself. Identity
      // is the obvious test and the fragile one: it fails the moment two copies
      // of the module exist, and it fails silently — an unrecognised edge would
      // land among the nodes, where it is not an SVG element and draws nothing.
      const slot =
        typeof type === 'function' ? (type as { slot?: FlowSlot }).slot : undefined;

      if (slot === 'background') {
        background.push(node);
        return;
      }
      if (slot === 'overlay') {
        overlay.push(node);
        return;
      }
      // A fragment is a wrapper the caller used for their own reasons, not a
      // layer — look through it rather than dropping its contents on the floor.
      if (type === Fragment) {
        visit((node as { props?: { children?: ReactNode } }).props?.children);
        return;
      }
    }
    canvas.push(node);
  };

  visit(children);
  return { background, overlay, canvas };
}

/* -------------------------------------------------------------------------- */
/* Background                                                                 */
/* -------------------------------------------------------------------------- */

export interface FlowBackgroundProps {
  /** The mark repeated across the canvas. */
  variant?: 'dots' | 'lines' | 'cross' | 'none';
  /** Points between marks. */
  gap?: number;
  /** How big each mark is drawn. */
  size?: number;
  /** Mark colour. Defaults to a muted theme token. */
  color?: string;
}

/**
 * The grid behind everything. It lives inside the transformed layer, so it
 * pans and scales with the graph — which is the whole point: a grid that
 * stayed put would say the canvas was not moving.
 */
function FlowBackground({
  variant = 'dots',
  gap = 24,
  size = 1.6,
  color,
}: FlowBackgroundProps) {
  const { box, layer, origin, translateX, translateY, zoom } = useFlow('Flow.Background');
  const token = useCSSVariable('--color-muted-foreground');
  const tint = color ?? (typeof token === 'string' ? token : '#737373');
  // A pattern is referenced by id, and two canvases on one screen would collide.
  const id = `panelui-flow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  /*
   * The grid is a tile that follows the viewport in whole-cell steps.
   *
   * It is drawn inside the transformed layer, so panning and zooming it costs
   * nothing and the dots stay nailed to the canvas — a grid whose pattern is
   * re-tiled each frame visibly crawls instead of travelling. But a tile fixed
   * in graph space runs out the moment you pan past its edge, and it cannot
   * simply be made enormous: an SVG is one texture, and a texture has a size
   * the platform will not exceed, past which it draws nothing at all.
   *
   * So the tile moves with you, rounded to a whole number of cells. Rounding is
   * what makes the move invisible: shifted by an exact multiple of the grid
   * spacing, the tile is the same picture it was before.
   */
  const follow = useAnimatedStyle(() => {
    // The graph coordinate at the middle of the container. Following the
    // middle rather than the left edge is what makes the tile cover the view
    // at every zoom: centred, it reaches half its width in each direction, and
    // zooming out grows the visible area in both.
    const centreX = (-translateX.value + box.width / 2) / zoom.value;
    const centreY = (-translateY.value + box.height / 2) / zoom.value;
    return {
      transform: [
        { translateX: Math.round(centreX / gap) * gap },
        { translateY: Math.round(centreY / gap) * gap },
      ],
    };
  });

  if (variant === 'none') return null;

  /*
   * The grid fills its layer exactly, and the layer is the same box the nodes
   * live in. It used to be an oversized SVG inside a container-sized parent,
   * which the canvas's own `overflow-hidden` then clipped back down — so the
   * dots ran out as soon as you zoomed out far enough to see past the
   * container, which looked like them disappearing.
   */
  const width = layer.width;
  const height = layer.height;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, follow]}>
      {/* No viewBox: it would rescale the tile whenever the viewport and the
          laid-out size disagreed, and a grid drawn at a different scale from
          the nodes is worse than no grid. The pattern tiles from the layer's
          own origin, which only shifts the dots' phase — invisible. */}
      <Svg pointerEvents="none" width={width} height={height}>
        <Defs>
          <Pattern
            id={id}
            x={0}
            y={0}
            width={gap}
            height={gap}
            patternUnits="userSpaceOnUse"
          >
            {variant === 'dots' ? (
              <Circle cx={gap / 2} cy={gap / 2} r={size} fill={tint} opacity={0.5} />
            ) : null}
            {variant === 'lines' ? (
              <Path
                d={`M0,0 L${gap},0 M0,0 L0,${gap}`}
                stroke={tint}
                strokeWidth={Math.max(size / 2, 0.4)}
                opacity={0.3}
              />
            ) : null}
            {variant === 'cross' ? (
              <Path
                d={`M${gap / 2 - size * 2},${gap / 2} L${gap / 2 + size * 2},${gap / 2} M${gap / 2},${gap / 2 - size * 2} L${gap / 2},${gap / 2 + size * 2}`}
                stroke={tint}
                strokeWidth={Math.max(size / 2, 0.4)}
                opacity={0.42}
              />
            ) : null}
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
FlowBackground.displayName = 'Flow.Background';
FlowBackground.slot = 'background' as FlowSlot;

/* -------------------------------------------------------------------------- */
/* Node                                                                       */
/* -------------------------------------------------------------------------- */

export interface FlowNodeProps extends Omit<ViewProps, 'children'> {
  /** Identifies the node to edges and to `onNodeDragEnd`. Must be unique. */
  id: string;
  /** Where it starts, in graph coordinates. */
  position: FlowNodePosition;
  className?: string;
  /** Let a finger move it. */
  draggable?: boolean;
  /**
   * Keep the node inside the `Flow.Group` it is drawn in. A drag stops at the
   * container's edge instead of leaving it. Ignored outside a group — there is
   * nothing to be kept inside of.
   */
  confine?: boolean;
  /**
   * Hold the node still: it takes no drag of its own and moves only when its
   * container does. For a diagram where the boxes are what you rearrange and
   * their contents are a fixed part of them.
   */
  pinned?: boolean;
  /** Draw the selected ring. */
  selected?: boolean;
  /** Tapping the node — separate from dragging it. */
  onPress?: () => void;
  /**
   * Delete the node when assistive technology requests the advertised Delete
   * node action. No delete action is exposed when this is omitted.
   */
  onDelete?: () => void;
  /** Graph points covered by each Move up, right, down or left accessibility action. */
  accessibilityMoveStep?: number;
  /** Spoken name. Defaults to the node's id. */
  accessibilityLabel?: string;
  children?: ReactNode;
}

/**
 * One box on the canvas. Its own content is whatever you put inside — a Frame
 * is the usual answer, since a node is a titled card of rows more often than
 * it is anything else.
 */
function FlowNode({
  id,
  position,
  className,
  draggable = true,
  confine = false,
  pinned = false,
  selected = false,
  onPress,
  onDelete,
  accessibilityMoveStep = 24,
  accessibilityLabel,
  accessibilityActions,
  onAccessibilityAction,
  children,
  ...props
}: FlowNodeProps) {
  const flow = useFlow('Flow.Node');
  const group = useContext(FlowGroupContext);
  const {
    rects,
    zoom,
    locked,
    origin,
    setNodeRect,
    dropNodeRect,
    registerNode,
    unregisterNode,
    registerGroup,
    unregisterGroup,
    onNodeDragEnd,
    nodes,
    handles,
    connectNodes,
    canConnect,
  } = flow;

  /*
   * Registered twice, on purpose. As a node, because its box belongs in the
   * same registry every other box lives in — that is what lets an edge name it
   * and fitView account for it. As a group, because the minimap and the edge
   * layer both need to know it is a container and not a card.
   */
  useEffect(() => {
    registerNode(id, accessibilityLabel ?? id);
    registerGroup(id);
    return () => {
      unregisterNode(id);
      unregisterGroup(id);
    };
  }, [accessibilityLabel, id, registerGroup, registerNode, unregisterGroup, unregisterNode]);

  // Writing on every render would fight the drag, snapping a node back to the
  // position it was first given. Only an actual change to the prop moves it.
  const lastPosition = useRef<FlowNodePosition | null>(null);
  useEffect(() => {
    const previous = lastPosition.current;
    if (previous && previous.x === position.x && previous.y === position.y) return;
    lastPosition.current = position;
    setNodeRect(id, { x: position.x, y: position.y });
  }, [id, position, setNodeRect]);

  useEffect(() => {
    return () => dropNodeRect(id);
  }, [dropNodeRect, id]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setNodeRect(id, { width, height });
    },
    [id, setNodeRect]
  );

  const dragEnd = useCallback(
    (x: number, y: number) => onNodeDragEnd?.(id, { x, y }),
    [id, onNodeDragEnd]
  );

  /**
   * The node itself moves on the UI thread; this tells React where it got to,
   * so the edges attached to it redraw. Called every frame of a drag — which
   * is what it costs to have edges that follow, and what every working
   * implementation of this pays.
   */
  const dragTo = useCallback(
    (x: number, y: number) => setNodeRect(id, { x, y }),
    [id, setNodeRect]
  );

  const start = useSharedValue({ x: 0, y: 0 });
  const pressRef = useRef(onPress);
  pressRef.current = onPress;
  const press = useCallback(() => pressRef.current?.(), []);

  const moveNode = useCallback(
    (actionName: string) => {
      const rect = rects.value[id];
      if (!rect) return;
      const bounds = confine && group ? rects.value[group] : undefined;
      const next = moveNodePosition(rect, bounds, actionName, accessibilityMoveStep);
      if (!next) return;
      setNodeRect(id, next);
      dragEnd(next.x, next.y);
    },
    [accessibilityMoveStep, confine, dragEnd, group, id, rects, setNodeRect]
  );

  const connectionActions = useMemo(
    () => (canConnect && !locked ? getFlowConnectionActions(id, nodes, handles) : []),
    [canConnect, handles, id, locked, nodes]
  );
  const connectionByAction = useMemo(
    () => new Map(connectionActions.map((entry) => [entry.name, entry.connection])),
    [connectionActions]
  );
  const movable = draggable && !pinned && !locked;
  const nodeActions = useMemo(
    () => [
      ...(onPress ? [{ name: 'activate' }] : []),
      ...(movable ? FLOW_MOVE_ACTIONS : []),
      ...connectionActions.map(({ name, label }) => ({ name, label })),
      ...(onDelete ? [FLOW_DELETE_ACTION] : []),
      ...(accessibilityActions ?? []),
    ],
    [accessibilityActions, connectionActions, movable, onDelete, onPress]
  );

  const handleAccessibilityAction = useCallback<
    NonNullable<ViewProps['onAccessibilityAction']>
  >(
    (event) => {
      const action = event.nativeEvent.actionName;
      if (action === 'activate' && onPress) {
        press();
        return;
      }
      if (movable && FLOW_MOVE_ACTIONS.some((entry) => entry.name === action)) {
        moveNode(action);
        return;
      }
      const nextConnection = connectionByAction.get(action);
      if (nextConnection) {
        connectNodes(nextConnection);
        return;
      }
      if (action === FLOW_DELETE_ACTION.name && onDelete) {
        onDelete();
        return;
      }
      onAccessibilityAction?.(event);
    },
    [connectNodes, connectionByAction, movable, moveNode, onAccessibilityAction, onDelete, onPress, press]
  );

  const drag = useMemo(
    () =>
      Gesture.Pan()
        // A pinned node takes no drag at all: it is part of its container, and
        // the container is what moves.
        .enabled(draggable && !pinned && !locked)
        .onBegin(() => {
          'worklet';
          const rect = rects.value[id];
          start.value = { x: rect?.x ?? 0, y: rect?.y ?? 0 };
        })
        .onUpdate((event) => {
          'worklet';
          const rect = rects.value[id];
          if (!rect) return;
          // Divided by the zoom, so the node keeps up with the finger rather
          // than with the graph coordinate the finger happens to be over.
          let x = start.value.x + event.translationX / zoom.value;
          let y = start.value.y + event.translationY / zoom.value;

          /*
           * Clamped before anything is written, so the box React is told about
           * and the box on screen are the same one. Clamping after the write
           * would leave the edges drawn to a position the node never reached.
           */
          if (confine && group) {
            const next = clampNodePosition(rect, rects.value[group], { x, y });
            x = next.x;
            y = next.y;
          }

          rects.value = { ...rects.value, [id]: { ...rect, x, y } };
          runOnJS(dragTo)(x, y);
        })
        .onEnd(() => {
          'worklet';
          const rect = rects.value[id];
          if (rect) runOnJS(dragEnd)(rect.x, rect.y);
        }),
    [confine, dragEnd, dragTo, draggable, group, id, locked, pinned, rects, start, zoom]
  );

  // Raced with the drag rather than layered on top of it. A plain touch handler
  // would fire at the end of a drag too, so every rearrangement would also read
  // as a tap on whatever was moved.
  const gesture = useMemo(
    () =>
      onPress
        ? Gesture.Race(
            drag,
            Gesture.Tap().onEnd(() => {
              'worklet';
              runOnJS(press)();
            })
          )
        : drag,
    [drag, onPress, press]
  );

  const style = useAnimatedStyle(() => {
    const rect = rects.value[id];
    return {
      transform: [
        { translateX: (rect?.x ?? 0) + origin.x },
        { translateY: (rect?.y ?? 0) + origin.y },
      ],
    };
  });

  return (
    <FlowNodeContext.Provider value={id}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          {...props}
          collapsable={false}
          onLayout={onLayout}
          style={[{ position: 'absolute', top: 0, left: 0 }, style]}
          className={cn(
            selected && 'rounded-3xl ring-2 ring-ring',
            className
          )}
          accessible
          accessibilityRole={onPress ? 'button' : 'none'}
          accessibilityLabel={accessibilityLabel ?? id}
          accessibilityState={{ selected }}
          accessibilityActions={nodeActions}
          onAccessibilityAction={handleAccessibilityAction}
        >
          {textChildren(children)}
        </Animated.View>
      </GestureDetector>
    </FlowNodeContext.Provider>
  );
}
FlowNode.displayName = 'Flow.Node';

/* -------------------------------------------------------------------------- */
/* Handle                                                                     */
/* -------------------------------------------------------------------------- */

export interface FlowHandleProps {
  /** Names the handle to an edge, as `"nodeId.handleId"`. */
  id?: string;
  /** Which face it sits on. */
  position?: FlowSide;
  /**
   * `source` starts connections, `target` receives them, `both` does either.
   * A drag from a source can only land on a target, and the other way round.
   */
  type?: 'source' | 'target' | 'both';
  /** Where along the face, 0–1. For more than one handle on a side. */
  offset?: number;
  className?: string;
  /**
   * Spoken handle name used in the parent node's connection actions. Defaults
   * to the handle's id.
   */
  accessibilityLabel?: string;
  /** Draw nothing. The handle still anchors edges and still accepts a drop. */
  hidden?: boolean;
}

/**
 * A port on a node — both the point an edge attaches to and the grip a new
 * connection is dragged from.
 *
 * Its position is worked out from the node's box and the face it names, so it
 * never has to measure itself. That matters: a handle that measured would be
 * one frame behind the node it sits on, and the edge would trail its own port.
 */
function FlowHandle({
  id = 'default',
  position = 'right',
  type = 'both',
  offset = 0.5,
  className,
  accessibilityLabel,
  hidden = false,
}: FlowHandleProps) {
  const flow = useFlow('Flow.Handle');
  const node = useContext(FlowNodeContext);
  if (!node) {
    throw new Error('Flow.Handle must be used within a <Flow.Node>');
  }

  const {
    rects,
    zoom,
    connection,
    handles,
    locked,
    registerHandle,
    unregisterHandle,
    connectNodes,
  } = flow;
  const key = encodeFlowHandleKey(node, id);

  useEffect(() => {
    registerHandle({
      key,
      node,
      id,
      label: accessibilityLabel ?? id,
      side: position,
      offset,
      type,
    });
    return () => unregisterHandle(key);
  }, [
    accessibilityLabel,
    id,
    key,
    node,
    offset,
    position,
    registerHandle,
    type,
    unregisterHandle,
  ]);

  const land = useCallback(
    (target: string, targetHandle: string | undefined) => {
      connectNodes({
        source: node,
        sourceHandle: id,
        target,
        targetHandle,
      });
    },
    [connectNodes, id, node]
  );

  // A snapshot of what a drag can land on, rebuilt only when handles come and
  // go — the drop test runs on the UI thread and cannot read React state.
  const targets = useMemo(
    () =>
      handles
        .filter((entry) => entry.node !== node && entry.type !== 'source')
        .map((entry) => ({
          node: entry.node,
          id: entry.id,
          side: entry.side,
          offset: entry.offset,
        })),
    [handles, node]
  );

  const connect = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!locked && type !== 'target')
        .onBegin(() => {
          'worklet';
          const rect = rects.value[node];
          if (!rect) return;
          const anchor = anchorOf(rect, position, offset);
          connection.value = {
            active: 1,
            x1: anchor.x,
            y1: anchor.y,
            x2: anchor.x,
            y2: anchor.y,
          };
        })
        .onUpdate((event) => {
          'worklet';
          const current = connection.value;
          if (current.active === 0) return;
          connection.value = {
            ...current,
            x2: current.x1 + event.translationX / zoom.value,
            y2: current.y1 + event.translationY / zoom.value,
          };
        })
        .onEnd(() => {
          'worklet';
          const current = connection.value;
          connection.value = { active: 0, x1: 0, y1: 0, x2: 0, y2: 0 };
          if (current.active === 0) return;

          const drop = { x: current.x2, y: current.y2 };
          const reach = CONNECT_RADIUS / zoom.value;

          // Nearest handle wins. A finger is blunt, so the first thing inside
          // the radius is rarely the one that was meant.
          let bestNode: string | null = null;
          let bestHandle: string | undefined;
          let bestDistance = reach;

          for (let i = 0; i < targets.length; i += 1) {
            const entry = targets[i]!;
            const rect = rects.value[entry.node];
            if (!rect) continue;
            const anchor = anchorOf(rect, entry.side, entry.offset);
            const dx = anchor.x - drop.x;
            const dy = anchor.y - drop.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestNode = entry.node;
              bestHandle = entry.id;
            }
          }

          // Nothing close enough to a handle: dropping anywhere on a node is
          // the friendlier reading of the gesture on a small screen.
          if (bestNode === null) {
            const entries = Object.entries(rects.value);
            for (let i = 0; i < entries.length; i += 1) {
              const [candidate, rect] = entries[i]!;
              if (candidate === node) continue;
              if (
                drop.x >= rect.x &&
                drop.x <= rect.x + rect.width &&
                drop.y >= rect.y &&
                drop.y <= rect.y + rect.height
              ) {
                bestNode = candidate;
                bestHandle = undefined;
                break;
              }
            }
          }

          if (bestNode !== null) runOnJS(land)(bestNode, bestHandle);
        }),
    [connection, land, locked, node, offset, position, rects, targets, type, zoom]
  );

  if (hidden) return null;

  // Positioned as a percentage of the node it sits in, so it follows the node's
  // own size without either of them measuring the other.
  const along = `${offset * 100}%` as DimensionValue;
  const placement: ViewStyle =
    position === 'top'
      ? { top: -7, left: along, marginLeft: -7 }
      : position === 'bottom'
        ? { bottom: -7, left: along, marginLeft: -7 }
        : position === 'left'
          ? { left: -7, top: along, marginTop: -7 }
          : { right: -7, top: along, marginTop: -7 };

  return (
    <GestureDetector gesture={connect}>
      <View
        collapsable={false}
        hitSlop={12}
        accessible={false}
        style={placement}
        className={flowVariants().handle({ className })}
      />
    </GestureDetector>
  );
}
FlowHandle.displayName = 'Flow.Handle';

/* -------------------------------------------------------------------------- */
/* Edges                                                                      */
/* -------------------------------------------------------------------------- */

export interface FlowEdgeProps {
  /** Source node or handle. Strings retain the `"nodeId.handleId"` shorthand. */
  from: FlowEndpointReference;
  /** Target node or handle, in the same shape. */
  to: FlowEndpointReference;
  /** How the edge is routed. */
  variant?: FlowEdgeVariant;
  /**
   * Mark the edge as carrying something — a request, a build, a dependency
   * that is live rather than declared. Draws it dashed and marches the dashes
   * from source to target. Falls back to a still dashed edge when the
   * operating system is set to reduce motion.
   */
  animated?: boolean;
  /** Draw it broken rather than solid. */
  dashed?: boolean;
  /**
   * Stroke colour. Defaults to the muted-foreground token — an edge is content
   * rather than chrome, and the border token it would otherwise share with the
   * nodes is, by design, barely there.
   */
  color?: string;
  /** Stroke width in graph points. */
  width?: number;
  /** Put an arrowhead on the target end. */
  arrow?: boolean;
  /** Override the face it leaves from. Otherwise worked out from the layout. */
  fromSide?: FlowSide;
  /** Override the face it arrives at. */
  toSide?: FlowSide;
  /** Corner radius for `smoothstep`. */
  radius?: number;
  /** How far the edge steps clear of a node before turning. */
  gap?: number;
  /** Curve strength for `bezier`. */
  curvature?: number;
}

/**
 * A line between two nodes. It names them rather than coordinates, and works
 * out its own geometry from wherever they currently are — including which face
 * to use, which is why a graph the user rearranges does not need re-specifying.
 *
 * It draws nothing where it is written. Every edge in a canvas has to end up
 * inside one `<Svg>`, under every node — an SVG element rendered among the
 * nodes is not in an SVG at all and silently draws nothing — so an edge
 * registers itself and the canvas paints it in the right layer. Which means an
 * edge can be written wherever it reads best: beside the nodes it joins, inside
 * a group, inside a `.map`, behind a condition.
 */
function FlowEdge(props: FlowEdgeProps) {
  const { registerEdge, unregisterEdge } = useFlow('Flow.Edge');
  const key = encodeFlowEdgeKey(props.from, props.to);

  // Re-registered whenever any prop changes, so `animated` toggling or a
  // variant switch reaches the layer that draws it.
  const json = JSON.stringify(props);
  useEffect(() => {
    registerEdge(key, props);
    return () => unregisterEdge(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, json, registerEdge, unregisterEdge]);

  return null;
}

/**
 * A dashed edge whose dashes travel from source to target.
 *
 * The dash offset is the only animated property here, and the geometry is
 * deliberately not one: `d` arrives as an ordinary prop and changes by
 * re-render when a node moves. A path in React Native draws reliably when one
 * property animates and the rest are plain, so splitting them this way lets a
 * dragged node reshape the edge without ever interrupting the march.
 *
 * One dash and one gap of travel per cycle, which is why the loop is seamless:
 * the end state is the start state shifted by exactly one period.
 */
function FlowMarchingEdge({
  d,
  stroke,
  width,
}: {
  d: string;
  stroke: string;
  width: number;
}) {
  const offset = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      offset.value = 0;
      return undefined;
    }
    // Negative, so the dashes run the way the path was drawn: source to target.
    offset.value = withRepeat(
      withTiming(-EDGE_DASH * 2, {
        duration: EDGE_MARCH_DURATION,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    return () => cancelAnimation(offset);
  }, [offset, reducedMotion]);

  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <AnimatedPath
      animatedProps={dashProps}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${EDGE_DASH} ${EDGE_DASH}`}
    />
  );
}

/** The part that actually draws an edge, inside the canvas's one `<Svg>`. */
function FlowEdgePath({
  from,
  to,
  variant = 'bezier',
  animated = false,
  dashed = false,
  color,
  width = 2,
  arrow = false,
  fromSide,
  toSide,
  radius = 8,
  gap = 20,
  curvature = 0.25,
  boxes,
  handles,
  groups,
  tint,
  origin,
}: FlowEdgeProps & {
  boxes: Record<string, FlowRect>;
  handles: HandleEntry[];
  groups: Set<string>;
  tint: string;
  origin: { x: number; y: number };
}) {
  const nodes = Object.keys(boxes);
  const source = resolveEnd(from, fromSide, nodes, handles);
  const target = resolveEnd(to, toSide, nodes, handles);

  const fromRect = boxes[source.node];
  const toRect = boxes[target.node];
  if (!fromRect || !toRect || fromRect.width === 0 || toRect.width === 0) return null;

  const auto = autoSides(fromRect, toRect);
  const sideA: FlowSide = source.side ?? auto.from;
  const sideB: FlowSide = target.side ?? auto.to;
  const rawA = anchorOf(fromRect, sideA, source.offset);
  const rawB = anchorOf(toRect, sideB, target.offset);

  // Shifted into the layer's own coordinates, which is exactly what a node
  // does with its translate. Both use the same arithmetic on purpose: an SVG
  // `viewBox` would have done the shift too, but it also rescales its contents
  // to fit whenever the viewport and the laid-out size disagree, and an edge
  // drawn at a slightly different scale from the nodes misses them by a little
  // everywhere — which looks like bad routing rather than a bad transform.
  /*
   * A container's edge is a drawn border rather than the invisible edge of a
   * card, so an edge that lands exactly on it disappears under the stroke.
   * Standing a few points off it reads as a line arriving at the box.
   */
  const offA = groups.has(source.node) ? GROUP_EDGE_STANDOFF : 0;
  const offB = groups.has(target.node) ? GROUP_EDGE_STANDOFF : 0;
  const outA = standOff(rawA, sideA, offA);
  const outB = standOff(rawB, sideB, offB);

  const a = { x: outA.x + origin.x, y: outA.y + origin.y };
  const b = { x: outB.x + origin.x, y: outB.y + origin.y };

  const d = edgePath(variant, a, sideA, b, sideB, curvature, radius, gap);
  const dash = dashed || animated ? EDGE_DASH : 0;
  const stroke = color ?? tint;

  const head = arrow
    ? (() => {
        const dir = arrivalDirection(variant, a, b, sideB);
        return arrowHeadPath(b, dir.x, dir.y, Math.max(width * 3.5, 7));
      })()
    : null;

  return (
    <>
      {animated ? (
        <FlowMarchingEdge d={d} stroke={stroke} width={width} />
      ) : (
        <Path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash ? `${dash} ${dash}` : undefined}
        />
      )}
      {head ? <Path d={head} fill={stroke} /> : null}
    </>
  );
}

/**
 * Resolves a node or handle without parsing either identifier. Legacy
 * `"node.handle"` references are matched against the structured registry.
 */
function resolveEnd(
  reference: FlowEndpointReference,
  explicit: FlowSide | undefined,
  nodes: string[],
  handles: HandleEntry[]
): { node: string; side: FlowSide | undefined; offset: number } {
  const endpoint = resolveFlowEndpoint(reference, nodes, handles);
  const entry =
    endpoint.handle === undefined
      ? undefined
      : handles.find(
          (handle) => handle.node === endpoint.node && handle.id === endpoint.handle
        );
  return {
    node: endpoint.node,
    side: explicit ?? entry?.side,
    offset: entry?.offset ?? 0.5,
  };
}

/**
 * The one SVG every edge draws into, sitting inside the transformed layer in
 * graph coordinates — so panning and zooming the canvas moves the edges with
 * it, for free, and no edge does any work per frame.
 */
function FlowEdgeLayer() {
  const { boxes, edges, handles, groupIds, connection, layer, origin } = useFlow('Flow');
  const token = useCSSVariable('--color-muted-foreground');
  const tint = typeof token === 'string' ? token : '#878787';

  // A set rather than the array: every edge asks about both of its ends.
  const groups = useMemo(() => new Set(groupIds), [groupIds]);

  const lineProps = useAnimatedProps(() => {
    const current = connection.value;
    if (current.active === 0) return { d: '' };
    return {
      d:
        `M${current.x1 + origin.x},${current.y1 + origin.y} ` +
        `L${current.x2 + origin.x},${current.y2 + origin.y}`,
    };
  });

  return (
    <Svg
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0 }}
      width={layer.width}
      height={layer.height}
    >
      {edges.map((edge) => (
        <FlowEdgePath
          key={edge.key}
          {...edge.props}
          boxes={boxes}
          handles={handles}
          groups={groups}
          tint={tint}
          origin={origin}
        />
      ))}
      {/* The connection line follows a finger, so it is the path that animates
          `d` — and only `d`, which is the one thing that works while the
          geometry is what moves. An animated edge inverts the split: static
          `d`, animated dash offset. Either is fine; both at once is not. */}
      <AnimatedPath
        animatedProps={lineProps}
        fill="none"
        stroke={tint}
        strokeWidth={2}
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Group                                                                      */
/* -------------------------------------------------------------------------- */

export interface FlowGroupProps extends Omit<ViewProps, 'children'> {
  /** Identifies the group, the same way a node's id does. */
  id: string;
  /** Where the container sits. */
  position: FlowNodePosition;
  /** How big the container is. Children are positioned inside it. */
  size: { width: number; height: number };
  /** Caption drawn along the top edge. */
  label?: string;
  className?: string;
  /** Move the group, and everything in it, with a finger. */
  draggable?: boolean;
  children?: ReactNode;
}

/**
 * A container other nodes sit in and travel with.
 *
 * Dragging it offsets every child in the same worklet that moves the group, so
 * a group of twenty nodes costs one frame's work rather than twenty.
 */
function FlowGroup({
  id,
  position,
  size,
  label,
  className,
  draggable = true,
  children,
  ...props
}: FlowGroupProps) {
  const flow = useFlow('Flow.Group');
  const {
    rects,
    zoom,
    locked,
    origin,
    setNodeRect,
    dropNodeRect,
    registerNode,
    unregisterNode,
    onNodeDragEnd,
  } = flow;

  useEffect(() => {
    registerNode(id, label ?? id);
    return () => unregisterNode(id);
  }, [id, label, registerNode, unregisterNode]);

  useEffect(() => {
    setNodeRect(id, {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    });
    return () => dropNodeRect(id);
  }, [dropNodeRect, id, position.x, position.y, setNodeRect, size.height, size.width]);

  // Which nodes travel with the group, captured when they register rather than
  // read per frame.
  const childIds = useMemo(() => collectNodeIds(children), [children]);

  const start = useSharedValue<Record<string, FlowNodePosition>>({});

  /**
   * Reports the group *and* everything that travelled with it. Reporting only
   * the container would leave a graph whose positions are driven from outside
   * holding stale coordinates for every node in it.
   */
  const dragEnd = useCallback(
    (moved: Record<string, FlowNodePosition>) => {
      for (const [key, next] of Object.entries(moved)) onNodeDragEnd?.(key, next);
    },
    [onNodeDragEnd]
  );

  /** Tells React where the group and everything in it got to. */
  const dragTo = useCallback(
    (moved: Record<string, FlowNodePosition>) => {
      for (const [key, next] of Object.entries(moved)) setNodeRect(key, next);
    },
    [setNodeRect]
  );

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .enabled(draggable && !locked)
        .onBegin(() => {
          'worklet';
          const snapshot: Record<string, FlowNodePosition> = {};
          const group = rects.value[id];
          if (group) snapshot[id] = { x: group.x, y: group.y };
          for (let i = 0; i < childIds.length; i += 1) {
            const child = rects.value[childIds[i]!];
            if (child) snapshot[childIds[i]!] = { x: child.x, y: child.y };
          }
          start.value = snapshot;
        })
        .onUpdate((event) => {
          'worklet';
          const dx = event.translationX / zoom.value;
          const dy = event.translationY / zoom.value;
          const next = { ...rects.value };
          const moved: Record<string, FlowNodePosition> = {};
          const ids = Object.keys(start.value);
          for (let i = 0; i < ids.length; i += 1) {
            const key = ids[i]!;
            const rect = next[key];
            const from = start.value[key];
            if (!rect || !from) continue;
            const x = from.x + dx;
            const y = from.y + dy;
            next[key] = { ...rect, x, y };
            moved[key] = { x, y };
          }
          rects.value = next;
          runOnJS(dragTo)(moved);
        })
        .onEnd(() => {
          'worklet';
          const settled: Record<string, FlowNodePosition> = {};
          const ids = Object.keys(start.value);
          for (let i = 0; i < ids.length; i += 1) {
            const key = ids[i]!;
            const rect = rects.value[key];
            if (rect) settled[key] = { x: rect.x, y: rect.y };
          }
          runOnJS(dragEnd)(settled);
        }),
    [childIds, dragEnd, dragTo, draggable, id, locked, rects, start, zoom]
  );

  const style = useAnimatedStyle(() => {
    const rect = rects.value[id];
    return {
      transform: [
        { translateX: (rect?.x ?? 0) + origin.x },
        { translateY: (rect?.y ?? 0) + origin.y },
      ],
    };
  });

  return (
    <FlowGroupContext.Provider value={id}>
      <GestureDetector gesture={drag}>
        <Animated.View
          collapsable={false}
          style={[
            { position: 'absolute', top: 0, left: 0, width: size.width, height: size.height },
            style,
          ]}
          className={cn(
            'rounded-2xl border border-dashed border-border bg-muted/25',
            className
          )}
          accessibilityRole="none"
          accessibilityLabel={label ?? id}
          {...props}
        >
          {label ? (
            <Text size="xs" muted className="px-3 pt-2 uppercase tracking-wider">
              {label}
            </Text>
          ) : null}
        </Animated.View>
      </GestureDetector>
      {/* Children are siblings of the container, not descendants of it: a node
          inside an absolutely-positioned box would be positioned against that
          box, and every graph coordinate would mean something different
          depending on which group it happened to be in. */}
      {textChildren(children)}
    </FlowGroupContext.Provider>
  );
}
FlowGroup.displayName = 'Flow.Group';

function collectNodeIds(children: ReactNode): string[] {
  const ids: string[] = [];
  const list = Array.isArray(children) ? children.flat(Infinity) : [children];
  for (const child of list) {
    if (
      child &&
      typeof child === 'object' &&
      'props' in child &&
      typeof (child as { props?: { id?: unknown } }).props?.id === 'string'
    ) {
      ids.push((child as { props: { id: string } }).props.id);
    }
  }
  return ids;
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

export interface FlowControlsProps {
  className?: string;
  /** Show the zoom in and out buttons. */
  zoom?: boolean;
  /** Show the fit-to-graph button. */
  fit?: boolean;
  /** Show the lock, which freezes panning, zooming and dragging together. */
  lock?: boolean;
  /** How much one press of zoom in multiplies the scale by. */
  step?: number;
}

/**
 * The button stack in the corner. It sits outside the transformed layer, so it
 * stays put while the canvas moves under it.
 *
 * Worth having even where pinch works: on a phone, pinching to a specific
 * scale is imprecise, and framing the whole graph by hand is worse.
 */
function FlowControls({
  className,
  zoom: showZoom = true,
  fit = true,
  lock = true,
  step = 1.3,
}: FlowControlsProps) {
  const { zoomBy, fitView, locked, setLocked } = useFlow('Flow.Controls');
  const slots = flowVariants();
  // One colour for every glyph in the stack. Without it each icon falls back
  // to its own default, and the minus sign's is white — drawn for a checked
  // checkbox, and invisible on the card.
  const token = useCSSVariable('--color-muted-foreground');
  const tint = typeof token === 'string' ? token : '#737373';

  return (
    <IconColorProvider color={tint}>
      <View className={slots.controls({ className })}>
        {showZoom ? (
          <>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              className={slots.control()}
              onPress={() => zoomBy(step)}
            >
              <PlusIcon size={16} />
            </AnimatedPressable>
            <View className="h-px bg-border" />
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              className={slots.control()}
              onPress={() => zoomBy(1 / step)}
            >
              <MinusIcon size={16} strokeWidth={2} />
            </AnimatedPressable>
          </>
        ) : null}
        {fit ? (
          <>
            <View className="h-px bg-border" />
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Fit the whole graph on screen"
              className={slots.control()}
              onPress={fitView}
            >
              <MaximizeIcon size={16} />
            </AnimatedPressable>
          </>
        ) : null}
        {lock ? (
          <>
            <View className="h-px bg-border" />
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={locked ? 'Unlock the canvas' : 'Lock the canvas'}
              accessibilityState={{ selected: locked }}
              className={slots.control()}
              onPress={() => setLocked(!locked)}
            >
              {locked ? <LockIcon size={16} /> : <UnlockIcon size={16} />}
            </AnimatedPressable>
          </>
        ) : null}
      </View>
    </IconColorProvider>
  );
}
FlowControls.displayName = 'Flow.Controls';
FlowControls.slot = 'overlay' as FlowSlot;

/* -------------------------------------------------------------------------- */
/* MiniMap                                                                    */
/* -------------------------------------------------------------------------- */

export interface FlowMiniMapProps {
  className?: string;
  /** Which corner it sits in. */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Box size in screen points. */
  width?: number;
  height?: number;
  /** Colour of a node in the map. Defaults to the muted-foreground token. */
  nodeColor?: string;
}

const MINIMAP_CORNERS = {
  'top-left': 'left-4 top-4',
  'top-right': 'right-4 top-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-20 right-4',
} as const;

/**
 * An overview of the whole graph with the visible region marked on it — for a
 * canvas bigger than the screen, where panning alone loses you.
 *
 * The map's own scale is derived once per frame and shared by every node in it,
 * so N nodes cost one bounds calculation rather than N.
 */
function FlowMiniMap({
  className,
  position = 'bottom-right',
  width = 120,
  height = 84,
  nodeColor,
}: FlowMiniMapProps) {
  const { rects, nodes, groupIds, translateX, translateY, zoom, size } =
    useFlow('Flow.MiniMap');
  const token = useCSSVariable('--color-muted-foreground');
  const tint = nodeColor ?? (typeof token === 'string' ? token : '#737373');
  const ringToken = useCSSVariable('--color-ring');
  const ring = typeof ringToken === 'string' ? ringToken : '#737373';
  const borderToken = useCSSVariable('--color-border');
  const outline = typeof borderToken === 'string' ? borderToken : '#404040';

  const groups = useMemo(() => new Set(groupIds), [groupIds]);

  const padding = 6;

  /** The graph's bounds and the scale that fits them in the box. Once a frame. */
  const fit = useDerivedValue(() => {
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    const all = Object.values(rects.value);
    for (let i = 0; i < all.length; i += 1) {
      const rect = all[i]!;
      if (rect.width === 0) continue;
      left = Math.min(left, rect.x);
      top = Math.min(top, rect.y);
      right = Math.max(right, rect.x + rect.width);
      bottom = Math.max(bottom, rect.y + rect.height);
    }

    if (!Number.isFinite(left)) {
      return { left: 0, top: 0, scale: 1 };
    }

    // A floor under the graph's size, and a ceiling over the scale. Before
    // every node has measured, the bounds can be a single small box — and the
    // scale that fits one box to the map blows every rectangle up until the
    // map is a solid block of colour.
    const graphWidth = Math.max(right - left, 200);
    const graphHeight = Math.max(bottom - top, 200);
    const scale = Math.min(
      (width - padding * 2) / graphWidth,
      (height - padding * 2) / graphHeight,
      1
    );
    return { left, top, scale };
  });

  const viewportProps = useAnimatedProps(() => {
    const { left, top, scale } = fit.value;
    const screen = size.value;
    if (screen.width === 0) return { x: 0, y: 0, width: 0, height: 0 };


    // The graph rectangle currently on screen, mapped into the map's space.
    const graphX = -translateX.value / zoom.value;
    const graphY = -translateY.value / zoom.value;
    return {
      x: padding + (graphX - left) * scale,
      y: padding + (graphY - top) * scale,
      width: Math.min((screen.width / zoom.value) * scale, width),
      height: Math.min((screen.height / zoom.value) * scale, height),
    };
  });

  return (
    <View
      pointerEvents="none"
      style={{ width, height }}
      className={cn(
        flowVariants().minimap(),
        MINIMAP_CORNERS[position],
        className
      )}
      accessibilityLabel="Graph overview"
    >
      <Svg width={width} height={height}>
        {/* Containers first and drawn as outlines, so the map reads the way
            the canvas does — boxes with things in them, rather than a wash of
            identical rectangles where the largest happens to be a group. */}
        {nodes.map(({ id }) => {
          const group = groups.has(id);
          return (
            <MiniMapNode
              key={id}
              id={id}
              group={group}
              rects={rects}
              fit={fit}
              padding={padding}
              color={group ? outline : tint}
              width={width}
              height={height}
            />
          );
        })}
        <AnimatedRect
          animatedProps={viewportProps}
          fill="none"
          stroke={ring}
          strokeWidth={1}
          rx={2}
        />
      </Svg>
    </View>
  );
}
FlowMiniMap.displayName = 'Flow.MiniMap';
FlowMiniMap.slot = 'overlay' as FlowSlot;

function MiniMapNode({
  id,
  group = false,
  rects,
  fit,
  padding,
  color,
  width,
  height,
}: {
  id: string;
  /** Draw it as a container: outlined, not filled. */
  group?: boolean;
  rects: SharedValue<Record<string, FlowRect>>;
  fit: SharedValue<{ left: number; top: number; scale: number }>;
  padding: number;
  color: string;
  width: number;
  height: number;
}) {
  const props = useAnimatedProps(() => {
    const rect = rects.value[id];
    if (!rect || rect.width === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const { left, top, scale } = fit.value;
    return {
      x: padding + (rect.x - left) * scale,
      y: padding + (rect.y - top) * scale,
      width: Math.min(Math.max(rect.width * scale, 2), width),
      height: Math.min(Math.max(rect.height * scale, 2), height),
    };
  });

  if (group) {
    return (
      <AnimatedRect
        animatedProps={props}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.9}
        rx={2}
      />
    );
  }

  return <AnimatedRect animatedProps={props} fill={color} opacity={0.55} rx={1.5} />;
}

export const Flow = Object.assign(FlowRoot, {
  Background: FlowBackground,
  Node: FlowNode,
  Handle: FlowHandle,
  Edge: FlowEdge,
  Group: FlowGroup,
  Controls: FlowControls,
  MiniMap: FlowMiniMap,
});

export type { FlowEndpoint, FlowEndpointReference, FlowSide, FlowRect, FlowPoint };
