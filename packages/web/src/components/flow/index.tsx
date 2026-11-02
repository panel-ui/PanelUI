'use client';

/**
 * Flow — a canvas of nodes joined by edges, that you pan, zoom and rearrange.
 *
 * ```tsx
 * <Flow>
 *   <Flow.Background variant="dots" />
 *   <Flow.Node id="source" position={{ x: 24, y: 40 }}>
 *     <Flow.NodeContent>
 *       <Flow.NodeTitle>Source</Flow.NodeTitle>
 *       <Flow.NodeDescription>main</Flow.NodeDescription>
 *     </Flow.NodeContent>
 *   </Flow.Node>
 *   <Flow.Node id="build" position={{ x: 24, y: 200 }}>…</Flow.Node>
 *   <Flow.Edge from="source" to="build" dashed animated arrow />
 *   <Flow.Controls />
 * </Flow>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's Flow, so a graph written
 * for one reads the same in the other. What differs is the hand: here the
 * pane is dragged with a mouse, zoomed with a pinch or with Control and the
 * wheel, and every node can be reached and moved from the keyboard.
 *
 * ## Where the positions live
 *
 * A node's `position` is where it starts. From then on the canvas holds it:
 * a drag moves it there, and `onNodeDragEnd` says where it came to rest. Pass
 * a new `position` and the node goes to it, which is how nodes are driven
 * from outside.
 *
 * A node drawn inside a `Flow.Group` is positioned within it, and travels
 * with it. `confine` keeps its drag inside the group's box; `pinned` gives the
 * drag to the group instead, so the node moves only when the group does.
 *
 * Edges are drawn from the boxes of the nodes they join, measured off the
 * page. An edge therefore follows a node whatever is inside it, and redraws
 * as either end is dragged.
 *
 * ## Three gestures, one canvas
 *
 * The pane pans, a node drags, and a handle draws a new connection. Each is
 * taken by the innermost thing under the pointer, which is what a hand
 * expects.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { tv } from 'tailwind-variants';
import {
  anchorOf,
  arrivalDirection,
  arrowHeadPath,
  autoSides,
  bezierPath,
  edgePath,
  type FlowPoint,
  type FlowRect,
  type FlowSide,
} from './flow-paths';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type * as ReactTypes from 'react';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type FlowEdgeVariant = 'bezier' | 'smoothstep' | 'step' | 'straight';

/** Which of the theme's roles an edge is drawn in. */
export type FlowColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

/** Where the canvas is looking: how far it is panned, and how far zoomed. */
export interface FlowViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface FlowNodePosition {
  x: number;
  y: number;
}

/** One end of an edge: a node, and optionally one of its handles by `id`. */
export interface FlowEndpoint {
  node: string;
  handle?: string;
}

export type FlowEndpointReference = string | FlowEndpoint;

/** What `onConnect` is handed when a connection lands. */
export interface FlowConnection {
  /** Node the drag started from. */
  source: string;
  /** Handle it started from, when that handle has an `id`. */
  sourceHandle?: string;
  /** Node it was dropped on. */
  target: string;
  /** Handle it was dropped on, when it landed on one with an `id`. */
  targetHandle?: string;
}

const flowVariants = tv({
  slots: {
    root: 'relative h-96 w-full cursor-grab touch-none select-none overflow-hidden rounded-2xl border bg-background text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
    underlay: 'pointer-events-none absolute inset-0 text-muted-foreground/35',
    layer: 'absolute left-0 top-0 origin-top-left will-change-transform',
    overlay: 'pointer-events-none absolute inset-0 *:pointer-events-auto',
    node: 'absolute left-0 top-0 z-10 cursor-grab rounded-2xl border bg-card text-card-foreground shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
    group:
      'absolute left-0 top-0 cursor-grab rounded-3xl border border-dashed bg-muted/40 p-3 pt-8 outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
    groupLabel: 'absolute start-4 top-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground',
    // What goes inside a node. The padding is on the parts, so a header can
    // draw its rule from edge to edge.
    nodeHeader: 'flex items-center justify-between gap-3 border-b px-4 py-2.5',
    // Inside a group item the item already has its padding.
    nodeContent: 'px-4 py-3 in-data-[slot=flow-group-item]:p-0',
    nodeTitle: 'text-sm font-medium',
    nodeDescription: 'text-sm text-muted-foreground in-data-[slot=flow-group-item]:text-xs',
    nodeBadge:
      'rounded-full bg-[color-mix(in_oklab,var(--pu-color)_14%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--pu-color)]',
    groupItem:
      'flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 [&_svg]:size-4 [&_svg]:text-muted-foreground',
    handle:
      'absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-background bg-muted-foreground outline-none transition-[scale,background-color] hover:scale-150 hover:bg-foreground focus-visible:ring-2 focus-visible:ring-ring',
    edge: 'pointer-events-none absolute left-0 top-0 size-px overflow-visible text-[var(--pu-color)]',
    controls:
      'absolute flex flex-col divide-y divide-border overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm',
    control:
      'flex size-9 cursor-pointer items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground active:bg-muted [&_svg]:size-4',
    minimap: 'absolute overflow-hidden rounded-xl border bg-card/90 shadow-sm backdrop-blur-sm',
  },
  variants: {
    color: {
      primary: { edge: '[--pu-color:var(--primary)]', nodeBadge: '[--pu-color:var(--primary)]' },
      info: { edge: '[--pu-color:var(--info)]', nodeBadge: '[--pu-color:var(--info)]' },
      success: { edge: '[--pu-color:var(--success)]', nodeBadge: '[--pu-color:var(--success)]' },
      warning: { edge: '[--pu-color:var(--warning)]', nodeBadge: '[--pu-color:var(--warning)]' },
      destructive: { edge: '[--pu-color:var(--destructive)]', nodeBadge: '[--pu-color:var(--destructive)]' },
      // The colour of a hairline that is meant to be seen but not looked at.
      muted: {
        edge: '[--pu-color:var(--muted-foreground)]',
        nodeBadge: 'bg-muted text-muted-foreground',
      },
    },
    selected: { true: { node: 'z-20 ring-2 ring-ring' } },
    position: {
      'top-left': { controls: 'left-3 top-3', minimap: 'left-3 top-3' },
      'top-right': { controls: 'right-3 top-3', minimap: 'right-3 top-3' },
      'bottom-left': { controls: 'bottom-3 left-3', minimap: 'bottom-3 left-3' },
      'bottom-right': { controls: 'bottom-3 right-3', minimap: 'bottom-3 right-3' },
    },
  },
});

interface HandleEntry {
  id?: string;
  side: FlowSide;
  offset: number;
}

interface FlowContextValue {
  viewport: FlowViewport;
  /** Every box on the graph, in graph coordinates. What edges are drawn from. */
  rects: Record<string, FlowRect>;
  /** The same boxes as they were placed: a node in a group, relative to the group. */
  local: Record<string, FlowRect>;
  handles: Record<string, HandleEntry[]>;
  locked: boolean;
  size: { width: number; height: number };
  underlay: HTMLElement | null;
  overlay: HTMLElement | null;
  place(id: string, position: FlowNodePosition, group?: string | null): void;
  measure(id: string, width: number, height: number): void;
  forget(id: string): void;
  setHandle(node: string, key: string, entry: HandleEntry | null): void;
  zoomBy(factor: number): void;
  fit(): void;
  setLocked(locked: boolean): void;
  connectFrom(source: string, handle: HandleEntry, event: ReactPointerEvent): void;
  onNodeDragEnd?: (id: string, position: FlowNodePosition) => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);
const NodeContext = createContext<string | null>(null);
/** The group a node is drawn inside, if any. */
const GroupContext = createContext<string | null>(null);

function useFlow(part: string): FlowContextValue {
  const flow = useContext(FlowContext);
  if (!flow) throw new Error(`${part} must be used inside a <Flow>.`);
  return flow;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

const OPPOSITE: Record<FlowSide, FlowSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export interface FlowProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Where the canvas looks to begin with. */
  defaultViewport?: FlowViewport;
  /** The furthest out it can be zoomed. */
  minZoom?: number;
  /** The furthest in it can be zoomed. */
  maxZoom?: number;
  /** Whether dragging the pane pans it. */
  panOnDrag?: boolean;
  /** Whether a pinch, or Control with the wheel, zooms it. */
  zoomOnPinch?: boolean;
  /** Fits every node into view once they have been measured. */
  fitViewOnMount?: boolean;
  /** The room left round the nodes when fitting them, in pixels. */
  fitViewPadding?: number;
  /** Called as the canvas is panned or zoomed. */
  onViewportChange?: (viewport: FlowViewport) => void;
  /** Called with a node's new position when a drag or a key press has moved it. */
  onNodeDragEnd?: (id: string, position: FlowNodePosition) => void;
  /** Called when a connection drawn from a handle lands on another node. */
  onConnect?: (connection: FlowConnection) => void;
  /** Decides whether a connection may land. Without it, any two different nodes may be joined. */
  isValidConnection?: (connection: FlowConnection) => boolean;
  /** What a screen reader calls the canvas. */
  label?: string;
  children?: ReactNode;
}

function FlowRoot({
  defaultViewport = { x: 0, y: 0, zoom: 1 },
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
  label = 'Diagram',
  className,
  children,
  onKeyDown,
  ...props
}: FlowProps) {
  const slots = flowVariants();
  const root = useRef<HTMLDivElement>(null);
  const [viewport, setViewportState] = useState(defaultViewport);
  const [local, setRects] = useState<Record<string, FlowRect>>({});
  const [parents, setParents] = useState<Record<string, string>>({});
  // A node in a group is placed relative to it; everything that draws or
  // fits reads the box where it actually is on the graph.
  const rects = useMemo(() => {
    const out: Record<string, FlowRect> = {};
    for (const [id, box] of Object.entries(local)) {
      const parent = parents[id] ? local[parents[id]] : undefined;
      out[id] = parent ? { ...box, x: parent.x + box.x, y: parent.y + box.y } : box;
    }
    return out;
  }, [local, parents]);
  const [handles, setHandles] = useState<Record<string, HandleEntry[]>>({});
  const [locked, setLocked] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [underlay, setUnderlay] = useState<HTMLElement | null>(null);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  /** A connection being drawn: where it leaves from and where the pointer is. */
  const [wire, setWire] = useState<{ from: FlowPoint; side: FlowSide; to: FlowPoint } | null>(null);

  const live = useRef({ viewport, rects, size, locked });
  live.current = { viewport, rects, size, locked };
  const callbacks = useRef({ onViewportChange, onConnect, isValidConnection });
  callbacks.current = { onViewportChange, onConnect, isValidConnection };

  const setViewport = useCallback((next: FlowViewport) => {
    setViewportState(next);
    callbacks.current.onViewportChange?.(next);
  }, []);

  /** A point on the page, as a point on the graph. */
  const toGraph = useCallback((clientX: number, clientY: number): FlowPoint => {
    const box = root.current?.getBoundingClientRect();
    const { x, y, zoom } = live.current.viewport;
    return { x: (clientX - (box?.left ?? 0) - x) / zoom, y: (clientY - (box?.top ?? 0) - y) / zoom };
  }, []);

  /** Zooms about a point on the canvas, so that point stays where it is. */
  const zoomAbout = useCallback(
    (factor: number, px: number, py: number) => {
      const { x, y, zoom } = live.current.viewport;
      const next = clamp(zoom * factor, minZoom, maxZoom);
      const ratio = next / zoom;
      setViewport({ x: px - (px - x) * ratio, y: py - (py - y) * ratio, zoom: next });
    },
    [minZoom, maxZoom, setViewport]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const { width, height } = live.current.size;
      zoomAbout(factor, width / 2, height / 2);
    },
    [zoomAbout]
  );

  const fit = useCallback(() => {
    const boxes = Object.values(live.current.rects).filter((box) => box.width > 0);
    const { width, height } = live.current.size;
    if (boxes.length === 0 || width === 0) return;
    const left = Math.min(...boxes.map((box) => box.x));
    const top = Math.min(...boxes.map((box) => box.y));
    const right = Math.max(...boxes.map((box) => box.x + box.width));
    const bottom = Math.max(...boxes.map((box) => box.y + box.height));
    const zoom = clamp(
      Math.min(
        (width - fitViewPadding * 2) / Math.max(1, right - left),
        (height - fitViewPadding * 2) / Math.max(1, bottom - top),
        1
      ),
      minZoom,
      maxZoom
    );
    setViewport({
      x: (width - (right - left) * zoom) / 2 - left * zoom,
      y: (height - (bottom - top) * zoom) / 2 - top * zoom,
      zoom,
    });
  }, [fitViewPadding, minZoom, maxZoom, setViewport]);

  // The canvas's own size, for fitting and for the minimap.
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: node.clientWidth, height: node.clientHeight });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Fitted once, when every node has been measured and the canvas has a size.
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitViewOnMount || fitted.current || size.width === 0) return;
    const boxes = Object.values(rects);
    if (boxes.length === 0 || boxes.some((box) => box.width === 0)) return;
    fitted.current = true;
    fit();
  }, [fitViewOnMount, rects, size, fit]);

  // Control with the wheel, which is also what a trackpad pinch sends. The
  // plain wheel is left alone: a diagram in a page must not trap its scroll.
  useEffect(() => {
    const node = root.current;
    if (!node || !zoomOnPinch) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (live.current.locked) return;
      const box = node.getBoundingClientRect();
      zoomAbout(Math.exp(-event.deltaY * 0.01), event.clientX - box.left, event.clientY - box.top);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomOnPinch, zoomAbout]);

  /* Panning, and pinching with two fingers. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; spread: number } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).hasAttribute('data-flow-pane')) return;
    if (event.button !== 0 || locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current = null;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const held = pointers.current.get(event.pointerId);
    if (!held) return;
    const all = [...pointers.current.values()];
    if (all.length === 1 && panOnDrag) {
      const { x, y, zoom } = live.current.viewport;
      setViewport({ x: x + event.clientX - held.x, y: y + event.clientY - held.y, zoom });
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (all.length === 2 && zoomOnPinch) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const spread = Math.hypot(a.x - b.x, a.y - b.y);
      const box = event.currentTarget.getBoundingClientRect();
      const mid = { x: (a.x + b.x) / 2 - box.left, y: (a.y + b.y) / 2 - box.top };
      if (gesture.current) zoomAbout(spread / gesture.current.spread, mid.x, mid.y);
      gesture.current = { ...mid, spread };
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    gesture.current = null;
  };

  /* Drawing a connection from a handle. */
  const connectFrom = useCallback(
    (source: string, handle: HandleEntry, event: ReactPointerEvent) => {
      const box = live.current.rects[source];
      if (!box || live.current.locked) return;
      const from = anchorOf(box, handle.side, handle.offset);
      setWire({ from, side: handle.side, to: toGraph(event.clientX, event.clientY) });

      const move = (next: PointerEvent) => {
        setWire({ from, side: handle.side, to: toGraph(next.clientX, next.clientY) });
      };
      const up = (next: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        setWire(null);
        if (next.type === 'pointercancel') return;
        const under = document.elementFromPoint(next.clientX, next.clientY);
        const onHandle = under?.closest<HTMLElement>('[data-flow-handle]');
        const onNode = under?.closest<HTMLElement>('[data-flow-node]');
        const target = onNode?.dataset.flowNode;
        if (!target || target === source || !root.current?.contains(onNode ?? null)) return;
        const connection: FlowConnection = {
          source,
          sourceHandle: handle.id,
          target,
          targetHandle: onHandle?.dataset.flowHandle || undefined,
        };
        if (callbacks.current.isValidConnection?.(connection) === false) return;
        callbacks.current.onConnect?.(connection);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    [toGraph]
  );

  const place = useCallback((id: string, position: FlowNodePosition, group?: string | null) => {
    if (group !== undefined) {
      setParents((current) => {
        if ((current[id] ?? null) === group) return current;
        const { [id]: _was, ...rest } = current;
        return group ? { ...rest, [id]: group } : rest;
      });
    }
    setRects((current) => {
      const before = current[id];
      if (before && before.x === position.x && before.y === position.y) return current;
      return {
        ...current,
        [id]: { x: position.x, y: position.y, width: before?.width ?? 0, height: before?.height ?? 0 },
      };
    });
  }, []);

  const measure = useCallback((id: string, width: number, height: number) => {
    setRects((current) => {
      const before = current[id];
      if (!before || (before.width === width && before.height === height)) return current;
      return { ...current, [id]: { ...before, width, height } };
    });
  }, []);

  const forget = useCallback((id: string) => {
    setParents((current) => {
      if (!(id in current)) return current;
      const { [id]: _gone, ...rest } = current;
      return rest;
    });
    setRects((current) => {
      if (!(id in current)) return current;
      const { [id]: _gone, ...rest } = current;
      return rest;
    });
  }, []);

  const setHandle = useCallback((node: string, key: string, entry: HandleEntry | null) => {
    setHandles((current) => {
      const others = (current[node] ?? []).filter((handle) => (handle.id ?? handle.side) !== key);
      return { ...current, [node]: entry ? [...others, entry] : others };
    });
  }, []);

  const context = useMemo<FlowContextValue>(
    () => ({
      viewport,
      rects,
      local,
      handles,
      locked,
      size,
      underlay,
      overlay,
      place,
      measure,
      forget,
      setHandle,
      zoomBy,
      fit,
      setLocked,
      connectFrom,
      onNodeDragEnd,
    }),
    [
      viewport,
      rects,
      local,
      handles,
      locked,
      size,
      underlay,
      overlay,
      place,
      measure,
      forget,
      setHandle,
      zoomBy,
      fit,
      connectFrom,
      onNodeDragEnd,
    ]
  );

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [40, 0],
      ArrowRight: [-40, 0],
      ArrowUp: [0, 40],
      ArrowDown: [0, -40],
    };
    const by = pan[event.key];
    if (by && !locked) {
      event.preventDefault();
      setViewport({ ...viewport, x: viewport.x + by[0], y: viewport.y + by[1] });
    } else if (event.key === '+' || event.key === '=') zoomBy(1.3);
    else if (event.key === '-') zoomBy(1 / 1.3);
    else if (event.key === '0') fit();
  };

  return (
    <FlowContext.Provider value={context}>
      <div
        ref={root}
        role="application"
        aria-label={label}
        aria-roledescription="Diagram"
        tabIndex={0}
        data-locked={locked ? '' : undefined}
        className={slots.root({ className })}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={keys}
        {...props}
      >
        <div ref={setUnderlay} data-flow-pane="" className={slots.underlay()} />
        <div
          data-flow-layer=""
          className={slots.layer()}
          style={{
            transform: `translate(${viewport.x.toFixed(2)}px, ${viewport.y.toFixed(2)}px) scale(${viewport.zoom.toFixed(4)})`,
          }}
        >
          {children}
          {wire ? (
            <svg aria-hidden="true" className={flowVariants({ color: 'muted' }).edge()}>
              <path
                // It arrives facing back the way it left, which is the shape a
                // wire has while it is still in the hand.
                d={bezierPath(wire.from, wire.side, wire.to, OPPOSITE[wire.side], 0.25)}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
            </svg>
          ) : null}
        </div>
        <div ref={setOverlay} className={slots.overlay()} />
      </div>
    </FlowContext.Provider>
  );
}
FlowRoot.displayName = 'Flow';

/* -------------------------------------------------------------------------- */
/* Background                                                                 */
/* -------------------------------------------------------------------------- */

export interface FlowBackgroundProps {
  /** Dots, a grid of lines, small crosses, or nothing. */
  variant?: 'dots' | 'lines' | 'cross' | 'none';
  /** The distance from one mark to the next, in pixels at a zoom of 1. */
  gap?: number;
  /** How big a mark is: a dot's radius, a line's thickness, half a cross's arm. */
  size?: number;
  className?: string;
}

/** The pattern behind the graph, which moves and scales with it. */
function FlowBackground({ variant = 'dots', gap = 24, size, className }: FlowBackgroundProps) {
  const flow = useFlow('Flow.Background');
  const id = useId();
  if (!flow.underlay || variant === 'none') return null;
  const { x, y, zoom } = flow.viewport;
  const mark = size ?? (variant === 'dots' ? 1.2 : variant === 'lines' ? 1 : 3);

  return createPortal(
    <svg aria-hidden="true" className={className ?? 'size-full'}>
      <pattern
        id={id}
        width={gap}
        height={gap}
        patternUnits="userSpaceOnUse"
        patternTransform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${zoom.toFixed(4)})`}
      >
        {variant === 'dots' ? <circle cx={gap / 2} cy={gap / 2} r={mark} fill="currentColor" /> : null}
        {variant === 'lines' ? (
          <path d={`M${gap} 0H0V${gap}`} fill="none" stroke="currentColor" strokeWidth={mark} opacity="0.5" />
        ) : null}
        {variant === 'cross' ? (
          <path
            d={`M${gap / 2 - mark} ${gap / 2}h${mark * 2}M${gap / 2} ${gap / 2 - mark}v${mark * 2}`}
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        ) : null}
      </pattern>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>,
    flow.underlay
  );
}
FlowBackground.displayName = 'Flow.Background';

/* -------------------------------------------------------------------------- */
/* Node and Group                                                             */
/* -------------------------------------------------------------------------- */

export interface FlowNodeProps extends Omit<ComponentProps<'div'>, 'id'> {
  /** What edges and `onNodeDragEnd` call this node. */
  id: string;
  /** Where its top left corner is, on the graph. */
  position: FlowNodePosition;
  /** Whether it can be dragged and moved with the arrow keys. */
  draggable?: boolean;
  /**
   * Inside a `Flow.Group`, stop a drag at the group's edge instead of letting
   * the node leave it. Does nothing outside a group.
   */
  confine?: boolean;
  /**
   * Inside a `Flow.Group`, take no drag of its own: a drag that starts on it
   * moves the group, and the node goes with it.
   */
  pinned?: boolean;
  /** Draws it as the one that has been picked. */
  selected?: boolean;
  /** Called when it is pressed without being dragged, or with Enter. */
  onPress?: () => void;
  /** Called when Delete or Backspace is pressed on it. */
  onDelete?: () => void;
  /** How far one arrow key press moves it, in pixels. Shift moves four times as far. */
  moveStep?: number;
}

/** What a node and a group share: a box on the graph that can be moved. */
function useMovable({
  id,
  position,
  draggable,
  confine,
  pinned,
  group,
  onPress,
  onDelete,
  moveStep,
}: Pick<FlowNodeProps, 'id' | 'position' | 'draggable' | 'confine' | 'pinned' | 'onPress' | 'onDelete' | 'moveStep'> & {
  group: string | null;
}) {
  const flow = useFlow('Flow.Node');
  const element = useRef<HTMLDivElement>(null);
  const { place, measure, forget } = flow;
  const step = moveStep ?? 24;
  const movable = draggable !== false && !pinned && !flow.locked;

  useLayoutEffect(() => {
    place(id, position, group);
    // Only when the caller's position changes, not on every drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, position.x, position.y, group, place]);

  /** Where a move would put it, held inside its group when it is confined. */
  const within = (next: FlowNodePosition): FlowNodePosition => {
    const box = group && confine ? flow.local[group] : undefined;
    if (!box || box.width === 0) return next;
    const self = flow.local[id];
    return {
      x: clamp(next.x, 0, Math.max(0, box.width - (self?.width ?? 0))),
      y: clamp(next.y, 0, Math.max(0, box.height - (self?.height ?? 0))),
    };
  };

  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    const read = () => measure(id, node.offsetWidth, node.offsetHeight);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [id, measure]);

  useEffect(() => () => forget(id), [id, forget]);

  const at = flow.local[id] ?? { ...position, width: 0, height: 0 };
  const drag = useRef<{ x: number; y: number; from: FlowNodePosition; moved: boolean } | null>(null);
  const latest = useRef(at);
  latest.current = at;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // A handle starts a connection, and a control inside a node is pressed.
    if (
      (event.target as HTMLElement).closest('[data-flow-handle], button, a, input, textarea, select, [data-no-drag]')
    ) {
      return;
    }
    // A pinned node lets the press through to the group it is in, which
    // takes the drag.
    if (pinned && group) return;
    // Kept from the pane, and from a group this node may be sitting in.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, from: { x: at.x, y: at.y }, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved && Math.hypot(dx, dy) < 3) return;
    state.moved = true;
    if (!movable) return;
    place(id, within({ x: state.from.x + dx / flow.viewport.zoom, y: state.from.y + dy / flow.viewport.zoom }));
  };

  const onPointerUp = () => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    if (!state.moved) onPress?.();
    else if (movable) {
      flow.onNodeDragEnd?.(id, { x: latest.current.x, y: latest.current.y });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const by = moves[event.key];
    if (by) {
      // Kept from the canvas, which would pan on the same key.
      event.stopPropagation();
      if (!movable) return;
      event.preventDefault();
      const far = step * (event.shiftKey ? 4 : 1);
      const next = within({ x: at.x + by[0] * far, y: at.y + by[1] * far });
      place(id, next);
      flow.onNodeDragEnd?.(id, next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (!onPress) return;
      event.preventDefault();
      onPress();
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && onDelete) {
      event.preventDefault();
      onDelete();
    }
  };

  return {
    element,
    style: { translate: `${at.x.toFixed(2)}px ${at.y.toFixed(2)}px` },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: () => {
        drag.current = null;
      },
      onKeyDown,
    },
  };
}

/** A box on the graph. Fill it with the node parts below, or with anything of your own. */
function FlowNode({
  id,
  position,
  draggable = true,
  confine = false,
  pinned = false,
  selected = false,
  onPress,
  onDelete,
  moveStep,
  className,
  style,
  children,
  ...props
}: FlowNodeProps) {
  const group = useContext(GroupContext);
  const movable = useMovable({ id, position, draggable, confine, pinned, group, onPress, onDelete, moveStep });
  return (
    <NodeContext.Provider value={id}>
      <div
        ref={movable.element}
        data-flow-node={id}
        data-pinned={pinned && group ? '' : undefined}
        tabIndex={0}
        aria-roledescription="Node"
        aria-selected={selected || undefined}
        className={flowVariants({ selected }).node({ className })}
        style={{ ...movable.style, ...style }}
        {...movable.handlers}
        {...props}
      >
        {children}
      </div>
    </NodeContext.Provider>
  );
}
FlowNode.displayName = 'Flow.Node';

export interface FlowGroupProps extends Omit<FlowNodeProps, 'confine' | 'pinned'> {
  /** Written in the corner of the group. */
  label?: ReactNode;
  /**
   * A fixed size for the group. Give one when it holds `Flow.Node`s, which are
   * placed inside it rather than laid out by it, so they do not size it.
   */
  size?: { width: number; height: number };
}

/**
 * A dashed box round a few things that belong together. It is a node like any
 * other: it is dragged as one, and an edge can be joined to it.
 */
function FlowGroup({
  id,
  position,
  draggable = true,
  selected: _selected,
  onPress,
  onDelete,
  moveStep,
  label,
  size,
  className,
  style,
  children,
  ...props
}: FlowGroupProps) {
  const movable = useMovable({ id, position, draggable, group: null, onPress, onDelete, moveStep });
  return (
    <GroupContext.Provider value={id}>
      <NodeContext.Provider value={id}>
        <div
          ref={movable.element}
          data-flow-node={id}
          tabIndex={0}
          aria-roledescription="Group"
          className={flowVariants().group({ className })}
          style={{ ...movable.style, ...(size ? { width: size.width, height: size.height } : null), ...style }}
          {...movable.handlers}
          {...props}
        >
          {label !== undefined ? <span className={flowVariants().groupLabel()}>{label}</span> : null}
          {children}
        </div>
      </NodeContext.Provider>
    </GroupContext.Provider>
  );
}
FlowGroup.displayName = 'Flow.Group';

/* -------------------------------------------------------------------------- */
/* What goes in a node                                                        */
/* -------------------------------------------------------------------------- */

export interface FlowNodeHeaderProps extends ComponentProps<'div'> {}

/** A strip across the top of a node, ruled off from the rest: a step number and a state. */
function FlowNodeHeader({ className, render, ...props }: FlowNodeHeaderProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'flow-node-header', className: flowVariants().nodeHeader({ className }) }, props),
  });
}
FlowNodeHeader.displayName = 'Flow.NodeHeader';

export interface FlowNodeContentProps extends ComponentProps<'div'> {}

/** The body of a node, with the node's padding: a title over a description. */
function FlowNodeContent({ className, render, ...props }: FlowNodeContentProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'flow-node-content', className: flowVariants().nodeContent({ className }) },
      props
    ),
  });
}
FlowNodeContent.displayName = 'Flow.NodeContent';

export interface FlowNodeTitleProps extends ComponentProps<'p'> {}

/** What the node is. */
function FlowNodeTitle({ className, render, ...props }: FlowNodeTitleProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps({ 'data-slot': 'flow-node-title', className: flowVariants().nodeTitle({ className }) }, props),
  });
}
FlowNodeTitle.displayName = 'Flow.NodeTitle';

export interface FlowNodeDescriptionProps extends ComponentProps<'p'> {}

/** A quieter line about the node. Smaller inside a `Flow.GroupItem`. */
function FlowNodeDescription({ className, render, ...props }: FlowNodeDescriptionProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      { 'data-slot': 'flow-node-description', className: flowVariants().nodeDescription({ className }) },
      props
    ),
  });
}
FlowNodeDescription.displayName = 'Flow.NodeDescription';

export interface FlowNodeBadgeProps extends Omit<ComponentProps<'span'>, 'color'> {
  /** Which of the theme's roles it is tinted with. `muted` is grey. Default `muted`. */
  color?: FlowColor | 'muted';
}

/** A word in a pill, for a node's state: done, now, waiting. */
function FlowNodeBadge({ color = 'muted', className, render, ...props }: FlowNodeBadgeProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'flow-node-badge', className: flowVariants({ color }).nodeBadge({ className }) },
      props
    ),
  });
}
FlowNodeBadge.displayName = 'Flow.NodeBadge';

export interface FlowGroupItemProps extends ComponentProps<'div'> {}

/**
 * One thing inside a `Flow.Group` that is not a node of its own: an icon
 * beside a `Flow.NodeContent`. It moves with the group and edges cannot join it.
 */
function FlowGroupItem({ className, render, ...props }: FlowGroupItemProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'flow-group-item', className: flowVariants().groupItem({ className }) }, props),
  });
}
FlowGroupItem.displayName = 'Flow.GroupItem';

/* -------------------------------------------------------------------------- */
/* Handle                                                                     */
/* -------------------------------------------------------------------------- */

export interface FlowHandleProps extends Omit<ComponentProps<'span'>, 'id'> {
  /** A name for this handle, so an edge can be joined to it and not only to the node. */
  id?: string;
  /** Which face of the node it sits on. */
  position?: FlowSide;
  /** How far along that face, from 0 to 1. */
  offset?: number;
}

const SIDE_STYLE: Record<FlowSide, (offset: number) => { left: string; top: string }> = {
  top: (offset) => ({ left: `${offset * 100}%`, top: '0%' }),
  bottom: (offset) => ({ left: `${offset * 100}%`, top: '100%' }),
  left: (offset) => ({ left: '0%', top: `${offset * 100}%` }),
  right: (offset) => ({ left: '100%', top: `${offset * 100}%` }),
};

/** A point on a node's edge that a connection can be drawn from, or dropped on. */
function FlowHandle({
  id,
  position = 'right',
  offset = 0.5,
  className,
  style,
  render,
  ...props
}: FlowHandleProps & RenderProp<'span'>) {
  const flow = useFlow('Flow.Handle');
  const node = useContext(NodeContext);
  if (node === null) throw new Error('Flow.Handle must be used inside a <Flow.Node>.');
  const { setHandle, connectFrom } = flow;

  useEffect(() => {
    const key = id ?? position;
    setHandle(node, key, { id, side: position, offset });
    return () => setHandle(node, key, null);
  }, [node, id, position, offset, setHandle]);

  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'data-flow-handle': id ?? '',
        'aria-hidden': 'true',
        className: flowVariants().handle({ className }),
        style: { ...SIDE_STYLE[position](offset), ...style },
        onPointerDown: (event: ReactTypes.PointerEvent<HTMLSpanElement>) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          connectFrom(node, { id, side: position, offset }, event);
        },
      },
      props
    ),
  });
}
FlowHandle.displayName = 'Flow.Handle';

/* -------------------------------------------------------------------------- */
/* Edge                                                                       */
/* -------------------------------------------------------------------------- */

export interface FlowEdgeProps {
  /** Where it leaves from: a node's `id`, `"node.handle"` for one of its handles, or `{ node, handle }`. */
  from: FlowEndpointReference;
  /** Where it arrives. */
  to: FlowEndpointReference;
  /** A curve, a rounded right-angled route, a square one, or a straight line. */
  variant?: FlowEdgeVariant;
  /** Sets the dashes marching towards the target. */
  animated?: boolean;
  /** Draws it dashed. */
  dashed?: boolean;
  /** One of the theme's roles. Without it the edge is a quiet grey. */
  color?: FlowColor;
  /** How thick the line is, in pixels at a zoom of 1. */
  width?: number;
  /** Draws an arrowhead where it arrives. */
  arrow?: boolean;
  /** The face it leaves from. Worked out from where the two nodes are when left out. */
  fromSide?: FlowSide;
  /** The face it arrives at. */
  toSide?: FlowSide;
  /** How round the corners of a `smoothstep` route are. */
  radius?: number;
  /** How far a routed edge runs straight out of a node before it turns. */
  gap?: number;
  /** How far a `bezier` bulges when its target is behind its source. */
  curvature?: number;
}

/**
 * `"node"`, `"node.handle"` or `{ node, handle }`. A string that is a node's
 * whole id names that node, so an id with a dot in it still works.
 */
const endpoint = (reference: FlowEndpointReference, rects: Record<string, FlowRect>): FlowEndpoint => {
  if (typeof reference !== 'string') return reference;
  const dot = reference.lastIndexOf('.');
  if (dot <= 0 || reference in rects) return { node: reference };
  return { node: reference.slice(0, dot), handle: reference.slice(dot + 1) };
};

/** A line from one node to another, which follows them as they move. */
function FlowEdge({
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
}: FlowEdgeProps) {
  const flow = useFlow('Flow.Edge');
  // Whether motion is wanted is only known in the browser.
  const [still, setStill] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setStill(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);

  const source = endpoint(from, flow.rects);
  const target = endpoint(to, flow.rects);
  const a = flow.rects[source.node];
  const b = flow.rects[target.node];
  // Nothing to draw until both ends have been measured.
  if (!a || !b || a.width === 0 || b.width === 0) return null;

  const named = (node: string, handle?: string) =>
    handle === undefined ? undefined : flow.handles[node]?.find((entry) => entry.id === handle);
  const out = named(source.node, source.handle);
  const into = named(target.node, target.handle);
  const auto = autoSides(a, b);
  const sideA = fromSide ?? out?.side ?? auto.from;
  const sideB = toSide ?? into?.side ?? auto.to;
  const start = anchorOf(a, sideA, out?.offset ?? 0.5);
  const tip = anchorOf(b, sideB, into?.offset ?? 0.5);
  // The line stops short of the tip when there is an arrowhead to finish it.
  const head = arrow ? 9 : 0;
  const direction = arrivalDirection(variant, start, tip, sideB);
  const length = Math.hypot(direction.x, direction.y) || 1;
  const end = { x: tip.x - (direction.x / length) * head * 0.6, y: tip.y - (direction.y / length) * head * 0.6 };
  const d = edgePath(variant, start, sideA, end, sideB, curvature, radius, gap);
  const dash = dashed || animated ? '6 6' : undefined;

  return (
    <svg aria-hidden="true" className={flowVariants({ color: color ?? 'muted' }).edge()}>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={color ? 1 : 0.7}
      >
        {animated && !still ? (
          <animate attributeName="stroke-dashoffset" from="12" to="0" dur="0.6s" repeatCount="indefinite" />
        ) : null}
      </path>
      {arrow ? (
        <path d={arrowHeadPath(tip, direction.x, direction.y, head)} fill="currentColor" opacity={color ? 1 : 0.7} />
      ) : null}
    </svg>
  );
}
FlowEdge.displayName = 'Flow.Edge';

/* -------------------------------------------------------------------------- */
/* Controls and MiniMap                                                       */
/* -------------------------------------------------------------------------- */

type FlowCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface FlowControlsProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Shows the two zoom buttons. */
  zoom?: boolean;
  /** Shows the button that fits every node into view. */
  fit?: boolean;
  /** Shows the button that locks the canvas against panning, zooming and dragging. */
  lock?: boolean;
  /** How much one press of a zoom button zooms. */
  step?: number;
  /** Which corner of the canvas they sit in. */
  position?: FlowCorner;
}

const icon = (path: ReactNode) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);

/** Buttons for what a pinch and a drag do, for anyone without either. */
function FlowControls({
  zoom = true,
  fit = true,
  lock = true,
  step = 1.3,
  position = 'bottom-right',
  className,
  ...props
}: FlowControlsProps) {
  const flow = useFlow('Flow.Controls');
  const slots = flowVariants({ position });
  if (!flow.overlay) return null;

  return createPortal(
    <div role="group" aria-label="Canvas controls" className={slots.controls({ className })} {...props}>
      {zoom ? (
        <>
          <button type="button" aria-label="Zoom in" className={slots.control()} onClick={() => flow.zoomBy(step)}>
            {icon(<path d="M12 5v14M5 12h14" />)}
          </button>
          <button type="button" aria-label="Zoom out" className={slots.control()} onClick={() => flow.zoomBy(1 / step)}>
            {icon(<path d="M5 12h14" />)}
          </button>
        </>
      ) : null}
      {fit ? (
        <button type="button" aria-label="Fit everything in view" className={slots.control()} onClick={flow.fit}>
          {icon(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />)}
        </button>
      ) : null}
      {lock ? (
        <button
          type="button"
          aria-label="Lock the canvas"
          aria-pressed={flow.locked}
          className={slots.control()}
          onClick={() => flow.setLocked(!flow.locked)}
        >
          {icon(
            <>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d={flow.locked ? 'M8 11V8a4 4 0 0 1 8 0v3' : 'M8 11V8a4 4 0 0 1 7.5-2'} />
            </>
          )}
        </button>
      ) : null}
    </div>,
    flow.overlay
  );
}
FlowControls.displayName = 'Flow.Controls';

export interface FlowMiniMapProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** How wide the map is, in pixels. */
  width?: number;
  /** How tall the map is, in pixels. */
  height?: number;
  /** Which corner of the canvas it sits in. */
  position?: FlowCorner;
}

/** The whole graph, small, with the part in view marked on it. */
function FlowMiniMap({
  width = 120,
  height = 80,
  position = 'bottom-left',
  className,
  style,
  ...props
}: FlowMiniMapProps) {
  const flow = useFlow('Flow.MiniMap');
  const slots = flowVariants({ position });
  if (!flow.overlay) return null;

  const boxes = Object.values(flow.rects).filter((box) => box.width > 0);
  const { x, y, zoom } = flow.viewport;
  // What the canvas is showing, in the graph's own coordinates.
  const view = { x: -x / zoom, y: -y / zoom, width: flow.size.width / zoom, height: flow.size.height / zoom };
  const all = [...boxes, view];
  const left = Math.min(...all.map((box) => box.x));
  const top = Math.min(...all.map((box) => box.y));
  const right = Math.max(...all.map((box) => box.x + box.width));
  const bottom = Math.max(...all.map((box) => box.y + box.height));
  const pad = 20;

  return createPortal(
    <div aria-hidden="true" className={slots.minimap({ className })} style={{ width, height, ...style }} {...props}>
      <svg
        viewBox={`${(left - pad).toFixed(1)} ${(top - pad).toFixed(1)} ${(right - left + pad * 2).toFixed(1)} ${(bottom - top + pad * 2).toFixed(1)}`}
        className="size-full"
      >
        {boxes.map((box, index) => (
          <rect
            key={index}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            rx="10"
            className="fill-muted-foreground/40"
          />
        ))}
        <rect
          x={view.x}
          y={view.y}
          width={view.width}
          height={view.height}
          rx="8"
          className="fill-foreground/5 stroke-foreground/50"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>,
    flow.overlay
  );
}
FlowMiniMap.displayName = 'Flow.MiniMap';

export const Flow = Object.assign(FlowRoot, {
  Background: FlowBackground,
  Node: FlowNode,
  Handle: FlowHandle,
  Edge: FlowEdge,
  Group: FlowGroup,
  GroupItem: FlowGroupItem,
  NodeHeader: FlowNodeHeader,
  NodeContent: FlowNodeContent,
  NodeTitle: FlowNodeTitle,
  NodeDescription: FlowNodeDescription,
  NodeBadge: FlowNodeBadge,
  Controls: FlowControls,
  MiniMap: FlowMiniMap,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  FlowBackground,
  FlowNode,
  FlowHandle,
  FlowEdge,
  FlowGroup,
  FlowGroupItem,
  FlowNodeHeader,
  FlowNodeContent,
  FlowNodeTitle,
  FlowNodeDescription,
  FlowNodeBadge,
  FlowControls,
  FlowMiniMap,
};
export type { FlowSide, FlowRect, FlowPoint };
