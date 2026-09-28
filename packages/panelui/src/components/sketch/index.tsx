/**
 * Sketch — a drawing surface with its tools around it: a pen, a set of
 * shapes, an eraser, a stroke width, colours and undo.
 *
 * ```tsx
 * <Sketch.Sheet open={open} onOpenChange={setOpen} onDone={({ svg }) => attach(svg)} />
 *
 * // or a whole screen of it
 * <Sketch onClose={router.back} onDone={save} />
 * ```
 *
 * ## Layout
 *
 * The chrome sits at the two ends of the surface — close, the tools and undo
 * across the top; colours and confirm across the bottom — so the middle is all
 * canvas and the controls are where thumbs already are. The stroke width is a
 * short vertical slider against the leading edge, over the canvas rather than
 * beside it, because a column of its own would take width from every drawing
 * to hold one control.
 *
 * The shape grid and the colour picker open as cards over the canvas rather
 * than as popovers. A popover is drawn through a portal at the root of the
 * app, and inside the platform's own sheet the root is *behind* the sheet —
 * the picker would open where nobody can see it.
 *
 * ## Why the live stroke never reaches React
 *
 * The stroke being drawn lives in shared values and becomes an SVG path in a
 * worklet on the UI thread, so the line keeps up with the finger however much
 * is already on the canvas. When the finger lifts, the finished path crosses
 * to JavaScript once and is appended to the document as a static element.
 *
 * ## How the eraser rubs out
 *
 * The eraser paints into a mask rather than deleting what it touches. Each run
 * of eraser strokes masks everything drawn before it, so ink drawn afterwards
 * over an erased patch is untouched — the same as a pencil on paper. Undo
 * takes an eraser stroke back like any other. The document stays vector, and
 * `toSVG()` writes the same masks out, so an export matches the screen.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Mask, Path, Rect, Stop, LinearGradient } from 'react-native-svg';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import EraserIcon from '@hugeicons/core-free-icons/EraserIcon';
import LineSquiggleIcon from '@hugeicons/core-free-icons/LineSquiggleIcon';
import Shapes01Icon from '@hugeicons/core-free-icons/Shapes01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import Undo03Icon from '@hugeicons/core-free-icons/Undo03Icon';
import { BottomSheet, bottomSheetDetentHeight } from '../bottom-sheet';
import { ColorPicker } from '../color-picker';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** `react-native-view-shot`'s capture function, or null. PNG export only. */
const captureRef: ((view: unknown, options: unknown) => Promise<string>) | null =
  (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native-view-shot');
      return (mod?.captureRef as (v: unknown, o: unknown) => Promise<string>) ?? null;
    } catch {
      return null;
    }
  })();

/** True when a sketch can be rasterised to PNG. */
export const hasSketchRaster = captureRef !== null;

export type SketchTool = 'pen' | 'shape' | 'eraser';

export type SketchShape =
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'heart';

const ALL_SHAPES: SketchShape[] = [
  'line',
  'arrow',
  'rectangle',
  'ellipse',
  'triangle',
  'diamond',
  'star',
  'heart',
];

/**
 * The ink on offer. A spread of hues rather than a palette of tints: in a
 * sketch a colour is there to be told apart from the others at a glance.
 */
const DEFAULT_COLORS = [
  '#ffffff',
  '#000000',
  '#8e8e93',
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
];

const SHAPE_LABEL: Record<SketchShape, string> = {
  line: 'Line',
  arrow: 'Arrow',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  diamond: 'Diamond',
  star: 'Star',
  heart: 'Heart',
};

const TOOL_LABEL: Record<SketchTool, string> = {
  pen: 'Pen',
  shape: 'Shapes',
  eraser: 'Eraser',
};

/** How tall the stroke-width slider's track is, in points. */
const SLIDER_TRACK = 140;
/** The slider thumb's diameter. */
const SLIDER_THUMB = 28;
/** Width of the slider's touch area, wider than the track so it is findable. */
const SLIDER_HIT = 44;

/** Points closer together than this are dropped from a stroke as they arrive. */
const MIN_DISTANCE = 1.5;

/** The eraser is wider than the pen at the same setting, as a real one is. */
const ERASER_SCALE = 2.5;

const GLYPH_STROKE = 1.8;

/** One document entry. Shapes are stored as the path they were drawn as. */
export type SketchItem =
  | { type: 'stroke'; d: string; color: string; width: number }
  | { type: 'shape'; shape: SketchShape; d: string; color: string; width: number }
  | { type: 'erase'; d: string; width: number };

export interface SketchResult {
  /** The drawing as a standalone SVG document, sized to the canvas. */
  svg: string;
  /** The canvas size in points, which is the SVG's coordinate space. */
  width: number;
  height: number;
  /** Everything drawn, in order, including eraser strokes. */
  items: SketchItem[];
}

export interface SketchHandle {
  /** Take back the last stroke, shape or eraser stroke. */
  undo(): void;
  /** Remove everything. */
  clear(): void;
  /** True until something has been drawn. */
  isEmpty(): boolean;
  /** The drawing as a standalone SVG document. Pure string building. */
  toSVG(): string;
  /**
   * Rasterise the canvas to a PNG and resolve its temporary file URI. Needs
   * the optional `react-native-view-shot`, and throws by name without it.
   */
  toPNG(options?: { scale?: number }): Promise<string>;
}

export interface SketchProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The swatches along the bottom. The custom-colour button sits before them. */
  colors?: string[];
  /** The ink to start with. Defaults to the theme's foreground. */
  defaultColor?: string;
  /** The tool selected when the surface opens. Default `pen`. */
  defaultTool?: SketchTool;
  /** The shape the shape tool draws until another is picked. Default `rectangle`. */
  defaultShape?: SketchShape;
  /** Which shapes the grid offers, in order. Defaults to all eight. */
  shapes?: SketchShape[];
  /** Stroke width to start with, in points. Default 6. */
  defaultSize?: number;
  /** The thinnest stroke the slider reaches. Default 2. */
  minSize?: number;
  /** The thickest stroke the slider reaches. Default 24. */
  maxSize?: number;
  /** Show the custom-colour button before the swatches. Default true. */
  customColor?: boolean;
  /**
   * Called by the close button in the top leading corner. Leave it out and
   * there is no close button — for a sketch embedded in a screen that has its
   * own way out.
   */
  onClose?: () => void;
  /**
   * Called by the confirm button with the finished drawing. Leave it out and
   * there is no confirm button. The button is disabled until something has
   * been drawn.
   */
  onDone?: (result: SketchResult) => void;
  /** The number of items in the document changed — by drawing, undo or clear. */
  onChange?: (itemCount: number) => void;
}

/**
 * Turns a flat `[x, y, x, y, …]` buffer into a path, curving through the
 * midpoint between each pair of points so the line is smooth without any
 * lookahead. A worklet, because the live stroke is built on the UI thread and
 * the committed one has to be the same string.
 */
function strokePath(points: number[]): string {
  'worklet';
  const count = points.length / 2;
  if (count === 0) return '';
  // A tap is a dot rather than nothing.
  if (count === 1) return `M${points[0]},${points[1]} l0.01,0`;

  let d = `M${points[0]},${points[1]}`;
  for (let i = 1; i < count; i += 1) {
    const px = points[(i - 1) * 2]!;
    const py = points[(i - 1) * 2 + 1]!;
    const x = points[i * 2]!;
    const y = points[i * 2 + 1]!;
    d += ` Q${px},${py} ${(px + x) / 2},${(py + y) / 2}`;
  }
  d += ` L${points[(count - 1) * 2]},${points[(count - 1) * 2 + 1]}`;
  return d;
}

/** Numbers in a path, rounded to a tenth — enough for a screen, and shorter. */
function n(value: number): string {
  'worklet';
  return `${Math.round(value * 10) / 10}`;
}

/**
 * A shape as a path, from where the drag started to where it is now.
 *
 * Everything but the line and the arrow fills the box the two points make,
 * whichever way the drag went. The line and arrow run from the first point to
 * the second, because their direction is the thing being drawn.
 *
 * `shape` is an index into {@link ALL_SHAPES} rather than the name, so the
 * worklet compares numbers.
 */
function shapePath(
  shape: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number
): string {
  'worklet';
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  const cx = left + w / 2;
  const cy = top + h / 2;

  switch (shape) {
    case 0: // line
      return `M${n(x1)},${n(y1)} L${n(x2)},${n(y2)}`;
    case 1: {
      // arrow — the head scales with the stroke so a thick arrow still reads
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const length = Math.hypot(x2 - x1, y2 - y1);
      const head = Math.min(Math.max(14, width * 3), length * 0.5);
      const spread = Math.PI / 6;
      const ax = x2 - head * Math.cos(angle - spread);
      const ay = y2 - head * Math.sin(angle - spread);
      const bx = x2 - head * Math.cos(angle + spread);
      const by = y2 - head * Math.sin(angle + spread);
      return (
        `M${n(x1)},${n(y1)} L${n(x2)},${n(y2)} ` +
        `M${n(ax)},${n(ay)} L${n(x2)},${n(y2)} L${n(bx)},${n(by)}`
      );
    }
    case 2: // rectangle
      return (
        `M${n(left)},${n(top)} H${n(left + w)} V${n(top + h)} ` +
        `H${n(left)} Z`
      );
    case 3: {
      // ellipse, as two arcs
      const rx = Math.max(w / 2, 0.5);
      const ry = Math.max(h / 2, 0.5);
      return (
        `M${n(cx - rx)},${n(cy)} A${n(rx)},${n(ry)} 0 1 0 ${n(cx + rx)},${n(cy)} ` +
        `A${n(rx)},${n(ry)} 0 1 0 ${n(cx - rx)},${n(cy)} Z`
      );
    }
    case 4: // triangle
      return (
        `M${n(cx)},${n(top)} L${n(left + w)},${n(top + h)} ` +
        `L${n(left)},${n(top + h)} Z`
      );
    case 5: // diamond
      return (
        `M${n(cx)},${n(top)} L${n(left + w)},${n(cy)} ` +
        `L${n(cx)},${n(top + h)} L${n(left)},${n(cy)} Z`
      );
    case 6: {
      // star — five points, the inner radius a little under half the outer
      let d = '';
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? 1 : 0.42;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = cx + (w / 2) * r * Math.cos(a);
        const py = cy + (h / 2) * r * Math.sin(a) + h * 0.05;
        d += `${i === 0 ? 'M' : 'L'}${n(px)},${n(py)} `;
      }
      return `${d}Z`;
    }
    default: {
      // heart, drawn in a unit box and scaled into the drag's
      const X = (u: number) => n(left + u * w);
      const Y = (v: number) => n(top + v * h);
      return (
        `M${X(0.5)},${Y(0.92)} ` +
        `C${X(0.18)},${Y(0.7)} ${X(0)},${Y(0.48)} ${X(0)},${Y(0.3)} ` +
        `C${X(0)},${Y(0.12)} ${X(0.14)},${Y(0)} ${X(0.29)},${Y(0)} ` +
        `C${X(0.4)},${Y(0)} ${X(0.47)},${Y(0.07)} ${X(0.5)},${Y(0.16)} ` +
        `C${X(0.53)},${Y(0.07)} ${X(0.6)},${Y(0)} ${X(0.71)},${Y(0)} ` +
        `C${X(0.86)},${Y(0)} ${X(1)},${Y(0.12)} ${X(1)},${Y(0.3)} ` +
        `C${X(1)},${Y(0.48)} ${X(0.82)},${Y(0.7)} ${X(0.5)},${Y(0.92)} Z`
      );
    }
  }
}

/** A mask id React and the SVG string can both use — `useId`'s colons are not. */
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Splits the document into layers at each run of eraser strokes. Each layer
 * is what was drawn before an erase, and the erase that masks it.
 */
function foldLayers<T>(
  items: SketchItem[],
  ink: (item: Exclude<SketchItem, { type: 'erase' }>, index: number) => T,
  wrap: (content: T[], erases: Extract<SketchItem, { type: 'erase' }>[], layer: number) => T
): T[] {
  let content: T[] = [];
  let erases: Extract<SketchItem, { type: 'erase' }>[] = [];
  let layer = 0;

  const flush = () => {
    if (erases.length === 0) return;
    content = [wrap(content, erases, layer)];
    erases = [];
    layer += 1;
  };

  items.forEach((item, index) => {
    if (item.type === 'erase') {
      erases.push(item);
      return;
    }
    flush();
    content.push(ink(item, index));
  });
  flush();
  return content;
}

function svgDocument(items: SketchItem[], width: number, height: number, id: string): string {
  const w = Math.round(width) || 1;
  const h = Math.round(height) || 1;
  const defs: string[] = [];
  const body = foldLayers<string>(
    items,
    (item) =>
      `<path d="${item.d}" fill="none" stroke="${item.color}" stroke-width="${item.width}" ` +
      'stroke-linecap="round" stroke-linejoin="round"/>',
    (content, erases, layer) => {
      const mask = `${id}-m${layer}`;
      defs.push(
        `<mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">` +
          `<rect x="0" y="0" width="${w}" height="${h}" fill="white"/>` +
          erases
            .map(
              (erase) =>
                `<path d="${erase.d}" fill="none" stroke="black" stroke-width="${erase.width}" ` +
                'stroke-linecap="round" stroke-linejoin="round"/>'
            )
            .join('') +
          '</mask>'
      );
      return `<g mask="url(#${mask})">${content.join('')}</g>`;
    }
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    `${body.join('')}</svg>`
  );
}

function Glyph({
  icon,
  color,
  size = 22,
}: {
  icon: IconSvgElement;
  color?: string;
  size?: number;
}) {
  return (
    <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={GLYPH_STROKE} />
  );
}

/** A shape drawn by the same function that draws it on the canvas. */
function ShapeGlyph({
  shape,
  color,
  size = 24,
}: {
  shape: SketchShape;
  color?: string;
  size?: number;
}) {
  const inset = 3;
  const index = ALL_SHAPES.indexOf(shape);
  // The line and arrow run corner to corner, bottom-left to top-right.
  const diagonal = shape === 'line' || shape === 'arrow';
  const d = diagonal
    ? shapePath(index, inset, size - inset, size - inset, inset, 1.2)
    : shapePath(index, inset, inset + 1, size - inset, size - inset - 1, 1.2);
  return (
    <Svg width={size} height={size}>
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={GLYPH_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** The rainbow ring that stands for "any colour", with the current one inside. */
function CustomColorRing({ color, size = 32 }: { color: string; size?: number }) {
  const segments = 24;
  const r = size / 2 - 2;
  const c = size / 2;
  const arcs = Array.from({ length: segments }, (_, i) => {
    const a0 = (i / segments) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1.08) / segments) * Math.PI * 2 - Math.PI / 2;
    const d =
      `M${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} ` +
      `A${r},${r} 0 0 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)}`;
    return <Path key={i} d={d} stroke={`hsl(${(i * 360) / segments}, 90%, 58%)`} strokeWidth={3.5} fill="none" />;
  });
  return (
    <Svg width={size} height={size}>
      {arcs}
      <Circle cx={c} cy={c} r={r - 4} fill={color} />
    </Svg>
  );
}

/** A round control in the surface's chrome. */
function RoundButton({
  label,
  onPress,
  disabled,
  selected,
  className,
  children,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      className={cn(
        'h-12 w-12 items-center justify-center rounded-full bg-muted',
        disabled && 'opacity-[0.4]',
        className
      )}
    >
      {children}
    </AnimatedPressable>
  );
}

function SketchRoot(
  {
    className,
    colors = DEFAULT_COLORS,
    defaultColor,
    defaultTool = 'pen',
    defaultShape = 'rectangle',
    shapes = ALL_SHAPES,
    defaultSize = 6,
    minSize = 2,
    maxSize = 24,
    customColor = true,
    onClose,
    onDone,
    onChange,
    ...props
  }: SketchProps,
  ref: Ref<SketchHandle>
) {
  const foregroundToken = useCSSVariable('--color-foreground');
  const foreground = typeof foregroundToken === 'string' ? foregroundToken : '#f5f5f5';
  const surfaceToken = useCSSVariable('--color-popover');
  const surface = typeof surfaceToken === 'string' ? surfaceToken : '#1d1d1d';
  const primaryFgToken = useCSSVariable('--color-primary-foreground');
  const primaryFg = typeof primaryFgToken === 'string' ? primaryFgToken : undefined;

  const maskId = safeId(useId());

  const [items, setItems] = useState<SketchItem[]>([]);
  const [tool, setTool] = useState<SketchTool>(defaultTool);
  const [shape, setShape] = useState<SketchShape>(defaultShape);
  // Whether a shape has been picked yet. Until one has, the tool shows the
  // generic shapes glyph rather than claiming a rectangle nobody chose.
  const [shapePicked, setShapePicked] = useState(defaultTool === 'shape');
  const [color, setColor] = useState<string | undefined>(defaultColor);
  const [custom, setCustom] = useState<string | null>(null);
  const [size, setSize] = useState(defaultSize);
  const [card, setCard] = useState<'shapes' | 'color' | null>(null);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const ink = color ?? foreground;
  const canvasRef = useRef<View>(null);

  // Mirrors of the state the gesture reads, so it is built once and the live
  // stroke is drawn in the tool and width chosen at the moment it started.
  const toolValue = useSharedValue<number>(0);
  const shapeValue = useSharedValue(ALL_SHAPES.indexOf(defaultShape));
  const sizeValue = useSharedValue(defaultSize);
  useEffect(() => {
    toolValue.value = tool === 'pen' ? 0 : tool === 'shape' ? 1 : 2;
  }, [tool, toolValue]);
  useEffect(() => {
    shapeValue.value = ALL_SHAPES.indexOf(shape);
  }, [shape, shapeValue]);
  useEffect(() => {
    sizeValue.value = size;
  }, [size, sizeValue]);

  // The live gesture: points for the pen and eraser, two corners for a shape.
  const live = useSharedValue<number[]>([]);
  const liveTool = useSharedValue(-1);
  const anchor = useSharedValue({ x: 0, y: 0 });
  const tip = useSharedValue({ x: 0, y: 0 });

  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const reported = useRef(0);
  useEffect(() => {
    if (reported.current === items.length) return;
    reported.current = items.length;
    changeRef.current?.(items.length);
  }, [items.length]);

  // Latest values for the commit, which runs from the gesture on the JS thread.
  const commitState = useRef({ ink, size, shape });
  commitState.current = { ink, size, shape };

  const commitStroke = useCallback((d: string, erase: boolean) => {
    const { ink: currentInk, size: currentSize } = commitState.current;
    setItems((current) => [
      ...current,
      erase
        ? { type: 'erase', d, width: currentSize * ERASER_SCALE }
        : { type: 'stroke', d, color: currentInk, width: currentSize },
    ]);
  }, []);

  const commitShape = useCallback((d: string) => {
    const { ink: currentInk, size: currentSize, shape: currentShape } = commitState.current;
    setItems((current) => [
      ...current,
      { type: 'shape', shape: currentShape, d, color: currentInk, width: currentSize },
    ]);
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // A dot is a stroke too, so the gesture starts on the first touch.
        .minDistance(0)
        .averageTouches(true)
        .onBegin((event) => {
          'worklet';
          liveTool.value = toolValue.value;
          live.value = [event.x, event.y];
          anchor.value = { x: event.x, y: event.y };
          tip.value = { x: event.x, y: event.y };
        })
        .onUpdate((event) => {
          'worklet';
          if (liveTool.value === 1) {
            tip.value = { x: event.x, y: event.y };
            return;
          }
          const points = live.value;
          const last = points.length;
          if (last >= 2) {
            const dx = event.x - points[last - 2]!;
            const dy = event.y - points[last - 1]!;
            if (dx * dx + dy * dy < MIN_DISTANCE * MIN_DISTANCE) return;
          }
          live.value = [...points, event.x, event.y];
        })
        .onFinalize(() => {
          'worklet';
          const mode = liveTool.value;
          liveTool.value = -1;
          if (mode === 1) {
            const a = anchor.value;
            const b = tip.value;
            live.value = [];
            // A tap with the shape tool draws nothing: a shape of no size is
            // not a shape, and a dot would be the pen's job.
            if (Math.abs(b.x - a.x) < 4 && Math.abs(b.y - a.y) < 4) return;
            runOnJS(commitShape)(
              shapePath(shapeValue.value, a.x, a.y, b.x, b.y, sizeValue.value)
            );
            return;
          }
          const points = live.value;
          live.value = [];
          if (points.length === 0) return;
          runOnJS(commitStroke)(strokePath(points), mode === 2);
        }),
    [anchor, commitShape, commitStroke, live, liveTool, shapeValue, sizeValue, tip, toolValue]
  );

  // The ink being drawn: a pen stroke or a shape. Empty while erasing.
  const liveInkProps = useAnimatedProps(() => {
    if (liveTool.value === 1) {
      return {
        d: shapePath(
          shapeValue.value,
          anchor.value.x,
          anchor.value.y,
          tip.value.x,
          tip.value.y,
          sizeValue.value
        ),
      };
    }
    return { d: liveTool.value === 0 ? strokePath(live.value) : '' };
  });

  /*
   * The eraser being drawn, painted in the surface's own colour over the top.
   * It is indistinguishable from the mask it becomes on release, and it keeps
   * the per-frame work to one path rather than rebuilding a mask every frame.
   */
  const liveEraseProps = useAnimatedProps(() => ({
    d: liveTool.value === 2 ? strokePath(live.value) : '',
  }));

  const undo = useCallback(() => {
    setItems((current) => current.slice(0, -1));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const toSVG = useCallback(
    () => svgDocument(items, layout.width, layout.height, maskId),
    [items, layout.height, layout.width, maskId]
  );

  const toPNG = useCallback(
    async ({ scale = 2 }: { scale?: number } = {}) => {
      if (!captureRef) {
        throw new Error(
          'Sketch: PNG export needs the optional `react-native-view-shot` package. ' +
            'Install it, or export SVG with toSVG() instead.'
        );
      }
      return captureRef(canvasRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: Math.round(layout.width * scale),
        height: Math.round(layout.height * scale),
      });
    },
    [layout.height, layout.width]
  );

  useImperativeHandle(
    ref,
    (): SketchHandle => ({
      undo,
      clear,
      isEmpty: () => items.length === 0,
      toSVG,
      toPNG,
    }),
    [clear, items.length, toPNG, toSVG, undo]
  );

  const pickTool = (next: SketchTool) => {
    selectionTick();
    if (next === 'shape') {
      // The shape tool always opens its grid: the glyph shows one shape, and
      // the grid is the only place to see the others.
      setCard((current) => (current === 'shapes' ? null : 'shapes'));
      if (shapePicked) setTool('shape');
      return;
    }
    setCard(null);
    setTool(next);
  };

  const pickShape = (next: SketchShape) => {
    selectionTick();
    setShape(next);
    setShapePicked(true);
    setTool('shape');
    setCard(null);
  };

  const pickColor = (next: string) => {
    selectionTick();
    setColor(next);
    setCustom(null);
    // Picking ink while the eraser is up means you want to draw.
    if (tool === 'eraser') setTool('pen');
    setCard(null);
  };

  const done = () => {
    if (!onDone || items.length === 0) return;
    onDone({
      svg: toSVG(),
      width: Math.round(layout.width),
      height: Math.round(layout.height),
      items,
    });
  };

  const onCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const empty = items.length === 0;
  const muted = useCSSVariable('--color-muted-foreground');
  const mutedColor = typeof muted === 'string' ? muted : undefined;

  const layers = foldLayers<ReactNode>(
    items,
    (item, index) => (
      <Path
        // Items are only appended or dropped from the end, so the index is
        // stable for the life of each one.
        key={`i${index}`}
        d={item.d}
        fill="none"
        stroke={item.color}
        strokeWidth={item.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    (content, erases, layer) => (
      <G key={`l${layer}`} mask={`url(#${maskId}-m${layer})`}>
        {content}
      </G>
    )
  );

  const masks: ReactNode[] = [];
  foldLayers<null>(
    items,
    () => null,
    (_content, erases, layer) => {
      masks.push(
        <Mask
          key={layer}
          id={`${maskId}-m${layer}`}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={layout.width}
          height={layout.height}
        >
          <Rect x={0} y={0} width={layout.width} height={layout.height} fill="white" />
          {erases.map((erase, index) => (
            <Path
              key={index}
              d={erase.d}
              fill="none"
              stroke="black"
              strokeWidth={erase.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Mask>
      );
      return null;
    }
  );

  const visibleShapes = shapes.filter((entry) => ALL_SHAPES.includes(entry));

  return (
    <View className={cn('flex-1 bg-popover', className)} {...props}>
      {/* Close, the tools, undo. */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        {onClose ? (
          <RoundButton label="Close" onPress={onClose}>
            <Glyph icon={Cancel01Icon} color={foreground} />
          </RoundButton>
        ) : (
          <View className="h-12 w-12" />
        )}

        <View
          accessibilityRole="tablist"
          className="flex-row items-center gap-1 rounded-full bg-muted p-1"
        >
          {(['pen', 'shape', 'eraser'] as const).map((entry) => {
            const selected = tool === entry;
            return (
              <AnimatedPressable
                key={entry}
                accessibilityRole="tab"
                accessibilityLabel={
                  entry === 'shape' && shapePicked
                    ? `${TOOL_LABEL.shape}, ${SHAPE_LABEL[shape]}`
                    : TOOL_LABEL[entry]
                }
                accessibilityState={{ selected }}
                onPress={() => pickTool(entry)}
                className={cn(
                  'h-11 w-12 items-center justify-center rounded-full',
                  selected && 'bg-muted'
                )}
              >
                {entry === 'pen' ? (
                  <Glyph icon={LineSquiggleIcon} color={foreground} />
                ) : entry === 'eraser' ? (
                  <Glyph icon={EraserIcon} color={foreground} />
                ) : shapePicked ? (
                  <ShapeGlyph shape={shape} color={foreground} />
                ) : (
                  <Glyph icon={Shapes01Icon} color={foreground} />
                )}
              </AnimatedPressable>
            );
          })}
        </View>

        <RoundButton label="Undo" onPress={undo} disabled={empty}>
          <Glyph icon={Undo03Icon} color={foreground} />
        </RoundButton>
      </View>

      {/* The canvas. */}
      <View className="flex-1">
        <GestureDetector gesture={pan}>
          {/* collapsable={false} keeps the view in the native tree, which the
              gesture handler and the PNG capture both need. */}
          <View
            ref={canvasRef}
            collapsable={false}
            className="flex-1 overflow-hidden"
            onLayout={onCanvasLayout}
            accessible
            accessibilityRole="image"
            accessibilityLabel={
              empty ? 'Drawing canvas, empty' : `Drawing canvas, ${items.length} marks`
            }
            accessibilityHint="Drag to draw with the selected tool."
          >
            <Svg width="100%" height="100%" pointerEvents="none">
              {masks.length ? <Defs>{masks}</Defs> : null}
              {layers}
              <AnimatedPath
                animatedProps={liveInkProps}
                fill="none"
                stroke={ink}
                strokeWidth={size}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <AnimatedPath
                animatedProps={liveEraseProps}
                fill="none"
                stroke={surface}
                strokeWidth={size * ERASER_SCALE}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </GestureDetector>

        <SizeSlider
          value={size}
          min={minSize}
          max={maxSize}
          color={tool === 'eraser' ? mutedColor ?? foreground : ink}
          scale={tool === 'eraser' ? ERASER_SCALE : 1}
          onChange={setSize}
        />

        {/* A tap anywhere outside an open card closes it, and does not draw. */}
        {card ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setCard(null)}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {card === 'shapes' ? (
          <View className="absolute left-4 right-4 top-2 flex-row flex-wrap rounded-3xl bg-muted p-2">
            {visibleShapes.map((entry) => {
              const selected = tool === 'shape' && shape === entry;
              return (
                <AnimatedPressable
                  key={entry}
                  accessibilityRole="button"
                  accessibilityLabel={SHAPE_LABEL[entry]}
                  accessibilityState={{ selected }}
                  onPress={() => pickShape(entry)}
                  className={cn(
                    'h-16 w-1/4 items-center justify-center rounded-2xl',
                    selected && 'bg-muted'
                  )}
                >
                  <ShapeGlyph shape={entry} color={foreground} size={28} />
                </AnimatedPressable>
              );
            })}
          </View>
        ) : null}

        {card === 'color' ? (
          <View className="absolute bottom-2 left-4 right-4 rounded-3xl border border-border bg-popover p-3 shadow-lg">
            <View className="gap-3 rounded-2xl">
              <ColorPicker
                value={custom ?? ink}
                onValueChange={(next) => {
                  setCustom(next);
                  setColor(next);
                  if (tool === 'eraser') setTool('pen');
                }}
                size="sm"
              >
                <ColorPicker.Area height={150} />
                <ColorPicker.Hue />
              </ColorPicker>
            </View>
          </View>
        ) : null}
      </View>

      {/* Colours, and confirm. */}
      <View className="flex-row items-center gap-3 px-4 pb-4 pt-2">
        {customColor ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Custom colour"
            accessibilityState={{ selected: custom !== null, expanded: card === 'color' }}
            onPress={() => {
              selectionTick();
              setCard((current) => (current === 'color' ? null : 'color'));
            }}
            className="h-12 w-12 items-center justify-center"
          >
            <CustomColorRing color={custom ?? ink} size={36} />
          </AnimatedPressable>
        ) : null}

        <View className="flex-1">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-center gap-1 pe-6"
          >
            {colors.map((swatch) => {
              const selected = custom === null && ink.toLowerCase() === swatch.toLowerCase();
              return (
                <AnimatedPressable
                  key={swatch}
                  accessibilityRole="button"
                  accessibilityLabel={`Colour ${swatch}`}
                  accessibilityState={{ selected }}
                  onPress={() => pickColor(swatch)}
                  className={cn(
                    'h-12 w-12 items-center justify-center rounded-full border-2',
                    selected ? 'border-foreground' : 'border-transparent'
                  )}
                >
                  <View
                    className="h-9 w-9 rounded-full border border-border"
                    style={{ backgroundColor: swatch }}
                  />
                </AnimatedPressable>
              );
            })}
          </ScrollView>
          {/* The row runs under a fade rather than stopping at a hard edge, so
              it reads as a row that scrolls rather than one that ran out. */}
          <Svg pointerEvents="none" width={28} height="100%" style={styles.fade}>
            <Defs>
              <LinearGradient id={`${maskId}-fade`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={surface} stopOpacity={0} />
                <Stop offset="1" stopColor={surface} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${maskId}-fade)`} />
          </Svg>
        </View>

        {onDone ? (
          <RoundButton
            label="Done"
            onPress={done}
            disabled={empty}
            className="h-14 w-14 bg-primary"
          >
            <Glyph icon={Tick02Icon} color={primaryFg} size={24} />
          </RoundButton>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The stroke width, as a short vertical track against the leading edge. The
 * top is the thickest. While it is being dragged a dot beside the thumb shows
 * the width in the current ink, so the choice is made against the mark rather
 * than against a number.
 */
function SizeSlider({
  value,
  min,
  max,
  color,
  scale,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  color: string;
  scale: number;
  onChange: (value: number) => void;
}) {
  const range = Math.max(max - min, 1);
  const fraction = useSharedValue((value - min) / range);
  const active = useSharedValue(0);
  const { height: screenHeight } = useWindowDimensions();
  // Short screens (a sheet on a small phone) get a shorter track.
  const track = Math.min(SLIDER_TRACK, screenHeight * 0.18);

  useEffect(() => {
    fraction.value = (value - min) / range;
  }, [fraction, min, range, value]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          'worklet';
          active.value = withTiming(1, { duration: 120 });
          fraction.value = Math.min(Math.max(1 - (event.y - SLIDER_THUMB / 2) / track, 0), 1);
        })
        .onUpdate((event) => {
          'worklet';
          // Only the thumb and the preview move while dragging. The width
          // reaches React once, on release, so the canvas does not re-render
          // every stroke it holds for every frame of the drag.
          fraction.value = Math.min(Math.max(1 - (event.y - SLIDER_THUMB / 2) / track, 0), 1);
        })
        .onFinalize(() => {
          'worklet';
          active.value = withTiming(0, { duration: 200 });
          runOnJS(onChange)(Math.round(min + fraction.value * range));
        }),
    [active, fraction, min, onChange, range, track]
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - fraction.value) * track }],
  }));

  const previewStyle = useAnimatedStyle(() => {
    const diameter = (min + fraction.value * range) * scale;
    return {
      opacity: active.value,
      width: diameter,
      height: diameter,
      borderRadius: diameter / 2,
      transform: [
        { translateY: (1 - fraction.value) * track + SLIDER_THUMB / 2 - diameter / 2 },
      ],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 start-0 top-0 justify-center"
    >
      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Stroke width"
          accessibilityValue={{ min, max, now: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            const step = Math.max(1, Math.round(range / 10));
            if (event.nativeEvent.actionName === 'increment') {
              onChange(Math.min(value + step, max));
            } else if (event.nativeEvent.actionName === 'decrement') {
              onChange(Math.max(value - step, min));
            }
          }}
          style={{ width: SLIDER_HIT + 16, height: track + SLIDER_THUMB }}
          className="items-center"
        >
          <View
            className="absolute w-0.5 rounded-full bg-muted-foreground/40"
            style={{ top: SLIDER_THUMB / 2, height: track }}
          />
          <Animated.View
            className="absolute top-0 rounded-full border border-border bg-muted"
            style={[{ width: SLIDER_THUMB, height: SLIDER_THUMB }, thumbStyle]}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute top-0"
            style={[{ left: SLIDER_HIT + 12, backgroundColor: color }, previewStyle]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: 0, bottom: 0, right: 0 },
});

const SketchForwarded = forwardRef<SketchHandle, SketchProps>(SketchRoot);
SketchForwarded.displayName = 'Sketch';

export interface SketchSheetProps extends SketchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Present the platform's own sheet, painted solid in the theme's popover
   * surface. On by default. Requires the optional `@expo/ui` package; without
   * it the styled sheet is used instead.
   *
   * On iOS the sheet cannot be dragged away, so a downward stroke draws
   * rather than moving the sheet. The close button is the way out.
   */
  native?: boolean;
}

/**
 * The sketch in a bottom sheet that fills the screen.
 *
 * The sheet cannot be dismissed by dragging or by tapping outside it. On a
 * canvas every drag is a stroke, and a sheet that took some of them would
 * throw away the drawing with a wrong-direction scribble. `onClose` and
 * `onDone` both close it.
 */
const SketchSheet = forwardRef<SketchHandle, SketchSheetProps>(function SketchSheet(
  { open, onOpenChange, native = true, onClose, onDone, className, style, ...props },
  ref
) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const close = () => onOpenChange?.(false);

  // The platform sheet hosts the content at its own size, so the sketch is
  // given the full detent's height rather than asked to fill a parent.
  // The sheet adds its own bottom padding under the content, clear of the
  // home indicator, so that comes off the height.
  const detent = bottomSheetDetentHeight(['full'], screenHeight);
  const nativeHeight = detent ? detent - Math.max(insets.bottom, 16) : undefined;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      native={native}
      nativeBackground={native}
      snapPoints={native ? ['full'] : undefined}
    >
      <BottomSheet.Content
        size="full"
        dismissible={false}
        showClose={false}
        showGrabber={false}
        // The sketch draws its own padding, so the sheet's goes.
        className="px-0 pb-0 pt-0"
      >
        <SketchForwarded
          ref={ref}
          {...props}
          className={className}
          style={[native && nativeHeight ? { height: nativeHeight, flex: 0 } : null, style]}
          onClose={() => {
            onClose?.();
            close();
          }}
          onDone={
            onDone
              ? (result) => {
                  onDone(result);
                  close();
                }
              : undefined
          }
        />
      </BottomSheet.Content>
    </BottomSheet>
  );
});
SketchSheet.displayName = 'Sketch.Sheet';

export const Sketch = Object.assign(SketchForwarded, {
  Sheet: SketchSheet,
});
