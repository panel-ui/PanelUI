'use client';

/**
 * TreemapChart — a total, cut into the parts it is made of, sized by area.
 *
 * ```tsx
 * <TreemapChart data={spend}>
 *   <TreemapChart.Header title="Spend" value="$48,200" />
 *   <TreemapChart.Tiles />
 *   <TreemapChart.Labels />
 *   <TreemapChart.Tooltip />
 * </TreemapChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and most of the props are the app library's TreemapChart. What differs
 * is what the web changes: a tile is read by hovering, a click pins the reading,
 * the arrow keys walk the tiles, and `Breakdown` lists them with exact values.
 *
 * ## The layout is ours, the drawing is not
 *
 * The squarified layout comes from the app, in `squarify.ts`, so both platforms
 * cut a total the same way. It works in pixels, so the marks get identity scales.
 *
 * ## One hue down the ranking
 *
 * The area already says which tile is bigger, and a treemap has more parts than
 * the theme has chart colours, so tiles share one colour that fades with rank. A
 * tile can still take its own `color`, drawn at full strength.
 *
 * ## The ink follows the tile
 *
 * A label is white or near-black depending on the tile under it, worked out in
 * CSS with a relative colour, so it holds for any colour and flips with the theme.
 */
import {
  defineChart,
  rect,
  type ChartInteractionController,
  type ChartFocusStrategy,
  type ChartPoint,
  type ChartTooltipContentContext,
  type SceneNode,
} from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { Chart } from '@tanstack/charts/react/core';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip as chartTooltip } from '@tanstack/charts/tooltip';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { fitTileLabel, LABEL_PADDING_X, LABEL_PADDING_Y, squarifyLayout, type TreemapRect } from './squarify';

export { squarifyLayout, type TreemapRect } from './squarify';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type TreemapChartStatus = 'loading' | 'ready';

/** Which of the theme's roles a tile is drawn in. */
export type TreemapChartRole =
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5';

/** A role in the theme, or any CSS colour, such as a colour the user picked for a category. */
export type TreemapChartColor = TreemapChartRole | (string & {});

const ROLES: readonly string[] = [
  'primary',
  'info',
  'success',
  'warning',
  'destructive',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
];

const colorOf = (color: TreemapChartColor) => (ROLES.includes(color) ? `var(--${color})` : color);

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
};

const treemapChartVariants = tv({
  slots: {
    root: 'w-full text-foreground @container',
    layout:
      'relative grid w-full grid-cols-1 @md:has-[[data-slot=treemap-chart-breakdown]]:grid-cols-[minmax(0,1fr)_11rem] @md:has-[[data-slot=treemap-chart-breakdown]]:gap-x-3',
    plot: 'relative col-start-1 row-start-2 w-full cursor-pointer self-start',
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    labels: 'pointer-events-none relative col-start-1 row-start-2 w-full self-start overflow-hidden text-xs',
    label:
      'absolute overflow-hidden transition-opacity duration-150 motion-reduce:[animation:none!important]',
    labelName: 'truncate font-semibold',
    labelValue: 'truncate tabular-nums opacity-85',
    skeleton: 'relative col-start-1 row-start-2 w-full self-start overflow-hidden rounded-md bg-muted',
    sweep: 'absolute inset-y-0 left-0 w-2/5 motion-reduce:hidden',
    legend: 'col-start-1 row-start-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-xs',
    legendItem: 'flex max-w-full items-center gap-1.5 rounded-sm transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring',
    legendName: 'truncate text-muted-foreground',
    legendShare: 'font-medium tabular-nums',
    swatch: 'size-2 shrink-0 rounded-[2px]',
    breakdown: 'col-start-1 row-start-4 mt-3 w-full self-start text-xs @md:col-start-2 @md:row-start-2 @md:mt-0',
    breakdownRow:
      'grid h-7 w-full grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-1.5 border-t border-border text-left transition-opacity outline-none first:border-t-transparent focus-visible:ring-2 focus-visible:ring-ring',
    breakdownName: 'truncate',
    breakdownValue: 'flex gap-1.5 tabular-nums',
    breakdownShare: 'min-w-7 text-right text-muted-foreground',
    header: 'col-span-full row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** How far the hue has faded by the smallest tile. */
const FADE = 0.45;

const ENTERING = '[data-slot=treemap-chart-plot][data-entering] .ts-chart__marks';

const KEYFRAMES = `@keyframes panelui-treemap-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}@keyframes panelui-treemap-label{from{opacity:0}to{opacity:1}}@keyframes panelui-treemap-tile{from{transform:scale(0);opacity:0}}@media (prefers-reduced-motion:no-preference){${ENTERING} rect{transform-box:fill-box;transform-origin:center;animation:panelui-treemap-tile var(--treemap-duration) cubic-bezier(.33,1,.68,1) backwards}}`;

/** Each tile starts a stagger after the one before it. Each sits in a group of its own. */
const tileDelays = (count: number) =>
  Array.from(
    { length: count },
    (_unused, index) => `${ENTERING}>g:nth-child(${index + 1}) rect{animation-delay:calc(var(--treemap-stagger)*${index})}`
  ).join('');

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

const EXACT = new Intl.NumberFormat('en');

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/** One part of the total. */
export interface TreemapDatum {
  /** Name of the part, for the label, the readout and the legend. */
  label: string;
  /** Its size. Negatives are treated as zero, because an area cannot be less than none. */
  value: number;
  /** Keeps a tile's identity when the data changes, and when two parts share a label. Defaults to its row. */
  id?: string;
  /** A theme role or any CSS colour, drawn at full strength instead of the ramp. */
  color?: TreemapChartColor;
}

/** One laid-out tile: its datum, its share of the total, and where it sits. */
export interface TreemapTile extends TreemapRect {
  /** The datum's `id`, or its row in `data`. The gathered tile is `other`. */
  id: string;
  label: string;
  value: number;
  /** Its share of the whole chart, `0` to `1`. */
  share: number;
  /** The CSS colour of its hue, before the ramp. */
  color: string;
  /** How far along the ramp it is drawn, `0` to `1`. `1` where a colour was given. */
  strength: number;
  /** Its row in `data`, or `-1` for the gathered tile, which stands for several rows. */
  sourceIndex: number;
}

/** A tile as the mark sees it: its box, in the pixels the identity scales pass through. */
interface TileRow {
  index: number;
  tile: TreemapTile;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

type TilePoint = ChartPoint<TileRow, number, number>;

/**
 * A tile's colour as it looks over the card, with no alpha left in it. Swatches
 * use this because a dimmed row is an opacity group, and Chromium draws a colour
 * outside sRGB that has alpha inside one as olive.
 */
const tileOpaque = ({ color, strength }: Pick<TreemapTile, 'color' | 'strength'>) =>
  `color-mix(in oklab, ${color} ${Math.round(strength * 100)}%, var(--background))`;

/** The tile's colour as drawn, part-transparent down the ramp. */
const tileFill = ({ color, strength }: Pick<TreemapTile, 'color' | 'strength'>) =>
  strength >= 1 ? color : `color-mix(in oklab, ${color} ${Math.round(strength * 100)}%, transparent)`;

/**
 * White on a dark tile, near-black on a light one, judged against the tile as
 * drawn over the page. The multiplied lightness clamps to one or the other, and
 * 0.6 is about where the two have equal contrast.
 */
const tileInk = (tile: Pick<TreemapTile, 'color' | 'strength'>) => `oklch(from ${tileOpaque(tile)} calc((0.6 - l) * 1000) 0 0)`;

/** The tile under the pointer. The nearest centre would often be the tile next door. */
function tileUnderPointer(gap: number): ChartFocusStrategy<TileRow, number, number> {
  return {
    resolve(points, { x, y }) {
      const reach = gap / 2;
      const point = points.find(
        ({ datum }) => x >= datum.x0 - reach && x <= datum.x1 + reach && y >= datum.y0 - reach && y <= datum.y1 + reach
      );
      return point ? [point] : [];
    },
    group: (_points, { point }) => [point],
    navigation: (points) => [...points].sort((a, b) => a.datum.index - b.datum.index),
  };
}

function pointsOf(nodes: readonly SceneNode[]): TilePoint[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'group') return pointsOf(node.children);
    const point = node.kind === 'rect' ? node.interaction?.point : undefined;
    return point ? [point as TilePoint] : [];
  });
}

/** What the parts have asked for. The readout's formatter is read when it opens, so a new one costs nothing. */
interface Slots {
  tiles?: { dimOpacity: number };
  tooltip?: { className: string | undefined; latest: { current: Pick<TreemapChartTooltipProps, 'formatValue'> } };
}

interface TreemapChartContextValue {
  tiles: readonly TreemapTile[];
  total: number;
  status: TreemapChartStatus;
  aspectRatio: number;
  hue: string;
  animationDuration: number;
  staggerDelay: number;
  chartKey: string;
  activeIndex: number;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  /** Reads a tile for as long as the pointer is on something naming it. `-1` goes back to what is pinned. */
  preview: (index: number) => void;
  /** Pins a tile's reading, or lets go of it if it is already pinned. */
  press: (index: number) => void;
}

const TreemapChartContext = createContext<TreemapChartContextValue | null>(null);

function useChart(component: string): TreemapChartContextValue {
  const context = useContext(TreemapChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <TreemapChart>`);
  }
  return context;
}

/** The tile being read, for something rendered inside the chart. A readout outside it takes `onActiveIndexChange`. */
export function useTreemapChart() {
  const { tiles, total, activeIndex } = useChart('useTreemapChart');
  return {
    /** Index into the tiles **as laid out**, which is the sorted order. */
    activeIndex,
    activeTile: activeIndex >= 0 ? (tiles[activeIndex] ?? null) : null,
    tiles,
    total,
  };
}

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

export interface TreemapChartProps extends Omit<ComponentProps<'div'>, 'ref' | 'onSelect'> {
  /** The parts of the total, in any order. Sorted by the chart unless told not to. */
  data: readonly TreemapDatum[];
  /** Width ÷ height of the box the tiles fill. */
  aspectRatio?: number;
  /** Pixels between one tile and the next. */
  gap?: number;
  /** Corner radius of a tile, in pixels. */
  cornerRadius?: number;
  /**
   * How much wider than square-ish to lay the tiles out. `1` keeps the shapes
   * closest to square, which are the easiest to compare. Raise it on a short
   * chart, where a tile needs width for a name across it.
   */
  tileAspect?: number;
  /**
   * Sort the tiles largest first. The layout assumes a descending run, so the
   * shapes suffer without it. Turn it off where the given order is the message.
   */
  sort?: boolean;
  /** Keep the largest `maxTiles` and gather the rest into one tile. */
  maxTiles?: number;
  /** What the gathered tile is called. */
  otherLabel?: string;
  /** The ramp's hue: a theme role or any CSS colour. */
  color?: TreemapChartColor;
  /** Milliseconds for one tile to arrive. */
  animationDuration?: number;
  /** Milliseconds between one tile starting and the next. `0` for all at once. */
  staggerDelay?: number;
  /** `loading` holds the tiles back. Add a `TreemapChart.Skeleton` to stand in the box meanwhile. */
  status?: TreemapChartStatus;
  /** The tile being read, indexed as laid out. Leave unset to let the chart track it. */
  activeIndex?: number;
  /** Fires with the tile being read, and `-1`/`null` when there is none. Fires on hover as well as on a press. */
  onActiveIndexChange?: (index: number, tile: TreemapTile | null) => void;
  /** Fires when a tile is clicked or tapped, or Enter is pressed on it. For a tile that leads somewhere. */
  onSelect?: (tile: TreemapTile) => void;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one tile. Defaults to its name, value and share. */
  labelForTile?: (tile: TreemapTile) => string;
}

/** Imperative handle: re-run the entrance, for a "replay" control. */
export interface TreemapChartHandle {
  replay: () => void;
}

const TreemapChartRoot = forwardRef<TreemapChartHandle, TreemapChartProps & RenderProp<'div'>>(function TreemapChartRoot(
  {
    data,
    aspectRatio = 1.4,
    gap = 3,
    cornerRadius = 6,
    tileAspect = 1,
    sort = true,
    maxTiles,
    otherLabel = 'Other',
    color = 'chart-1',
    animationDuration = 520,
    staggerDelay = 26,
    status = 'ready',
    activeIndex: activeIndexProp,
    onActiveIndexChange,
    onSelect,
    label,
    labelForTile,
    className,
    children,
    render,
    ...props
  },
  ref
) {
  const slotClasses = treemapChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [slots, setSlots] = useState<Slots>({});
  const [reading, setReading] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [askedParent, setAskedParent] = useState(0);
  const interactionRef = useRef<ChartInteractionController<TileRow, number, number> | null>(null);
  const pointsRef = useRef<readonly TilePoint[]>([]);

  // The chart mounts once its width is known, because a resize ends the entrance.
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const read = () => setWidth(node.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setSlot = useCallback<TreemapChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  // Kept apart from the geometry, so a resize does not re-run the sort and the gathering.
  const parts = useMemo(() => {
    const cleaned = data.map((datum, index) => ({
      id: datum.id ?? String(index),
      label: datum.label,
      value: Math.max(0, datum.value) || 0,
      color: datum.color,
      sourceIndex: index,
    }));
    const ordered = sort ? [...cleaned].sort((a, b) => b.value - a.value) : cleaned;
    const limit = maxTiles && maxTiles > 0 ? Math.floor(maxTiles) : 0;
    if (!limit || ordered.length <= limit) return ordered;
    /*
     * Gathered rather than dropped. Dropping the tail would rescale what is left,
     * and every remaining tile would claim a larger share than it has.
     */
    const kept = ordered.slice(0, Math.max(1, limit - 1));
    const tail = ordered.slice(Math.max(1, limit - 1)).reduce((sum, part) => sum + part.value, 0);
    return tail > 0
      ? [...kept, { id: 'other', label: otherLabel, value: tail, color: undefined, sourceIndex: -1 }]
      : kept;
  }, [data, sort, maxTiles, otherLabel]);

  const total = useMemo(() => parts.reduce((sum, part) => sum + part.value, 0), [parts]);
  const height = width / aspectRatio;

  const tiles = useMemo<TreemapTile[]>(() => {
    const rects = squarifyLayout(parts.map((part) => part.value), width, height, undefined, tileAspect);
    const inset = Math.max(0, gap) / 2;
    const last = Math.max(parts.length - 1, 1);
    return parts.map((part, index) => {
      const box = rects[index] ?? { x: 0, y: 0, width: 0, height: 0 };
      return {
        id: part.id,
        label: part.label,
        value: part.value,
        share: total > 0 ? part.value / total : 0,
        color: colorOf(part.color ?? color),
        // Down the ranking rather than by value, so two tiles of nearly equal size can still be told apart.
        strength: part.color ? 1 : 1 - (index / last) * FADE,
        sourceIndex: part.sourceIndex,
        x: box.x + inset,
        y: box.y + inset,
        width: Math.max(0, box.width - inset * 2),
        height: Math.max(0, box.height - inset * 2),
      };
    });
  }, [parts, width, height, tileAspect, gap, total, color]);

  const hue = colorOf(color);
  const loading = status === 'loading';
  const { tiles: tilesSlot, tooltip } = slots;
  const drawable = !loading && tilesSlot !== undefined && total > 0 && width > 0;

  const definition = useMemo(() => {
    const rows: TileRow[] = tiles.flatMap((tile, index) =>
      tile.width > 0 && tile.height > 0
        ? [{ index, tile, x0: tile.x, x1: tile.x + tile.width, y0: tile.y, y1: tile.y + tile.height }]
        : []
    );

    const readout = tooltip
      ? {
          use: chartTooltip,
          className: tooltip.className,
          anchor: 'point' as const,
          sticky: false,
          content(_points: readonly TilePoint[], context: ChartTooltipContentContext) {
            const tile = (context.primaryPoint?.datum as TileRow | undefined)?.tile;
            if (!tile) return { title: '', rows: [] };
            const format = tooltip.latest.current.formatValue;
            return {
              title: tile.label,
              rows: [
                {
                  label: format ? format(tile.value, tile) : compactNumber(tile.value),
                  value: `${Math.round(tile.share * 100)}%`,
                  color: tileFill(tile),
                },
              ],
            };
          },
        }
      : undefined;

    return defineChart({
      theme: THEME,
      // A mark per tile, because a mark takes one fill.
      marks: rows.map((row) =>
        rect([row], {
          id: `tile-${row.tile.id}`,
          key: () => row.tile.id,
          x1: 'x0',
          x2: 'x1',
          y1: 'y0',
          y2: 'y1',
          inset: 0,
          radius: cornerRadius,
          fill: tileFill(row.tile),
          states: [
            {
              when: { focus: 'unmatched' as const },
              style: { fillOpacity: tilesSlot?.dimOpacity ?? 0.35 },
              transition: { type: 'tween' as const, duration: 180, easing: 'ease-out' as const },
            },
          ],
        })
      ),
      // The layout has already worked in pixels, so both scales hand them straight through.
      scales: {
        x: { scale: scaleLinear([0, width], [0, 1]), nice: false, axis: false as const, grid: false as const },
        y: { scale: scaleLinear([height, 0], [0, 1]), nice: false, axis: false as const, grid: false as const },
      },
      guides: false,
      margin: 0,
      focusRing: false,
      motion: { transition: { type: 'tween' as const, duration: 300, easing: 'ease-out' as const } },
      keyboard: true,
      pointer: true,
      focus: tileUnderPointer(gap),
      maxFocusDistance: Number.POSITIVE_INFINITY,
      ...(readout ? { tooltip: readout } : {}),
    });
  }, [tiles, width, height, gap, cornerRadius, tilesSlot, tooltip]);

  // Marks take their timing from the definition. This one is what the readout moves with.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const latestTiles = useLatest(tiles);
  const latestActive = useLatest(activeIndexProp);
  const latestReport = useLatest(onActiveIndexChange);

  const pointAt = (index: number) => pointsRef.current.find(({ datum }) => datum.index === index) ?? null;

  /*
   * The chart only pins a reading for a tooltip, and the rows of a breakdown have
   * to stay put while the pointer travels to them. So the pin is held here: a
   * hover previews, and leaving comes back to whatever is pinned.
   */
  const pinnedRef = useRef(-1);
  const reportedRef = useRef(-1);
  const reportedTile = useRef<TreemapTile | null>(null);

  const onFocusChange = (point: TilePoint | null) => {
    if (!point && pinnedRef.current >= 0) {
      interactionRef.current?.setControlledFocus(pointAt(pinnedRef.current));
      return;
    }
    const index = point ? point.datum.index : -1;
    setReading(index);
    if (reportedRef.current === index) return;
    reportedRef.current = index;
    reportedTile.current = latestTiles.current[index] ?? null;
    if (index !== latestActive.current) latestReport.current?.(index, latestTiles.current[index] ?? null);
    if (latestActive.current !== undefined) setAskedParent((count) => count + 1);
  };

  const pin = useCallback((index: number) => {
    pinnedRef.current = index;
    interactionRef.current?.setControlledFocus(index >= 0 ? pointAt(index) : null);
  }, []);

  // A readout outside the chart holds the tile it was given, so new data has to reach it even when the index stands still.
  useEffect(() => {
    const tile = tiles[reportedRef.current] ?? null;
    const held = reportedTile.current;
    reportedTile.current = tile;
    if (held && !tile) {
      reportedRef.current = -1;
      setReading(-1);
      pin(-1);
      latestReport.current?.(-1, null);
      return;
    }
    if (!tile || !held || (tile.id === held.id && tile.label === held.label && tile.value === held.value && tile.share === held.share)) return;
    latestReport.current?.(reportedRef.current, tile);
  }, [tiles, latestReport, pin]);

  const preview = useCallback(
    (index: number) => interactionRef.current?.setControlledFocus(pointAt(index >= 0 ? index : pinnedRef.current)),
    []
  );

  const latestSelect = useLatest(onSelect);
  const press = useCallback(
    (index: number) => {
      const tile = latestTiles.current[index];
      if (tile) latestSelect.current?.(tile);
      pin(index === pinnedRef.current ? -1 : index);
    },
    [latestSelect, latestTiles, pin]
  );

  const chartKey = `${revision}:${status}`;

  /*
   * The rect mark has no entrance of its own, so each tile grows out of its centre
   * in CSS. From the centre because a treemap has no baseline to grow from. Only
   * while a new chart arrives: moving a tile's node when data reorders would replay it.
   */
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const entranceLength = animationDuration + tiles.length * staggerDelay;
  useEffect(() => {
    if (!drawable) return;
    const timer = setTimeout(() => setSettledKey(chartKey), entranceLength);
    return () => clearTimeout(timer);
  }, [chartKey, drawable, entranceLength]);
  const drawnKey = useRef<string | null>(null);
  const resetKey = useRef<string | null>(null);

  /** Moves the chart to what the parent asked for. It has no points until it has drawn, so `onRender` calls this too. */
  const applyActive = useCallback(() => {
    const asked = latestActive.current;
    if (asked === undefined || asked === reportedRef.current) return;
    if (asked < 0 || pointAt(asked)) pin(asked);
  }, [latestActive, pin]);

  // Only a change the chart has not already reported is a request to move it.
  useEffect(() => {
    if (drawnKey.current === resetKey.current) applyActive();
  }, [activeIndexProp, askedParent, applyActive]);

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => {
    setReading(-1);
    pinnedRef.current = -1;
    if (reportedRef.current !== -1) {
      reportedRef.current = -1;
      if (latestActive.current === undefined) latestReport.current?.(-1, null);
    }
    resetKey.current = chartKey;
    if (drawnKey.current === chartKey) applyActive();
  }, [chartKey, applyActive, latestActive, latestReport]);

  const activeIndex = activeIndexProp ?? reading;

  const context = useMemo<TreemapChartContextValue>(
    () => ({
      tiles,
      total,
      status,
      aspectRatio,
      hue,
      animationDuration,
      staggerDelay,
      chartKey,
      activeIndex,
      setSlot,
      preview,
      press,
    }),
    [tiles, total, status, aspectRatio, hue, animationDuration, staggerDelay, chartKey, activeIndex, setSlot, preview, press]
  );

  const summary = label ?? `Treemap chart, ${tiles.length} ${tiles.length === 1 ? 'part' : 'parts'}`;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'treemap-chart',
        className: slotClasses.root({ className }),
        // On the root, so it also clears a reading from a row of the breakdown.
        onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Escape') pin(-1);
        },
        children: (
          <div className={slotClasses.layout()}>
            <style>{KEYFRAMES + tileDelays(tiles.length)}</style>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {tiles.map((tile) => (
                  <li key={tile.id}>
                    {labelForTile?.(tile) ?? `${tile.label}, ${tile.value}, ${Math.round(tile.share * 100)} percent`}
                  </li>
                ))}
              </ul>
            )}
            <div
              ref={plotRef}
              data-slot="treemap-chart-plot"
              className={slotClasses.plot()}
              data-entering={settledKey === chartKey ? undefined : ''}
              style={
                {
                  aspectRatio,
                  '--treemap-duration': `${animationDuration}ms`,
                  '--treemap-stagger': `${staggerDelay}ms`,
                } as CSSProperties
              }
              onClick={(event) => {
                const point = interactionRef.current?.resolvePointer(event.clientX, event.clientY)?.point;
                if (point) press((point.datum as TileRow).index);
                else pin(-1);
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && reading >= 0) {
                  event.preventDefault();
                  press(reading);
                }
              }}
            >
              {drawable ? (
                <Chart
                  // An entrance only plays on a chart's first paint, so tiles
                  // arriving after a load, or a replay, are a new chart.
                  key={chartKey}
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  aspectRatio={aspectRatio}
                  initialWidth={width}
                  className={slotClasses.chart()}
                  onFocusChange={onFocusChange}
                  onRender={({ scene, interaction }) => {
                    interactionRef.current = interaction;
                    pointsRef.current = pointsOf(scene.nodes);
                    drawnKey.current = chartKey;
                    // A new definition repaints without the focus marks.
                    if (pinnedRef.current >= 0) interaction.setControlledFocus(pointAt(pinnedRef.current));
                    if (resetKey.current === chartKey) applyActive();
                  }}
                />
              ) : null}
            </div>
            {children}
          </div>
        ),
      },
      props
    ),
  });

  return <TreemapChartContext.Provider value={context}>{element}</TreemapChartContext.Provider>;
});
TreemapChartRoot.displayName = 'TreemapChart';

export interface TreemapChartTilesProps {
  /** Opacity of the tiles that are not being read, once one is. */
  dimOpacity?: number;
}

/**
 * Every tile. One part rather than one per datum, because a tile's box is decided
 * by every tile before it in its row. Draws nothing itself: it asks the root to.
 */
function TreemapChartTiles({ dimOpacity = 0.35 }: TreemapChartTilesProps) {
  const { setSlot } = useChart('TreemapChart.Tiles');
  useEffect(() => {
    setSlot('tiles', { dimOpacity });
    return () => setSlot('tiles', undefined);
  }, [dimOpacity, setSlot]);
  return null;
}
TreemapChartTiles.displayName = 'TreemapChart.Tiles';

export interface TreemapChartSkeletonProps {
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
}

/**
 * The box as one plain rectangle with a highlight travelling across it, shown
 * only while `status` is `loading`. Undivided on purpose: placeholder tiles would
 * be a made-up split, and a reader cannot tell an invented one from a real one.
 */
function TreemapChartSkeleton({ duration = 1400 }: TreemapChartSkeletonProps) {
  const { status, aspectRatio, hue } = useChart('TreemapChart.Skeleton');
  const slots = treemapChartVariants();
  if (status !== 'loading') return null;
  return (
    <div data-slot="treemap-chart-skeleton" aria-hidden className={slots.skeleton()} style={{ aspectRatio }}>
      <div
        className={slots.sweep()}
        style={{
          background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${hue} 25%, transparent), transparent)`,
          animation: `panelui-treemap-sweep ${duration}ms linear infinite`,
        }}
      />
    </div>
  );
}
TreemapChartSkeleton.displayName = 'TreemapChart.Skeleton';

export interface TreemapChartLabelsProps {
  /** Show each tile's value under its name. */
  showValue?: boolean;
  /** Show each tile's share of the total beside its value. */
  showShare?: boolean;
  /** Format the value. Defaults to a compact number. */
  formatValue?: (value: number, tile: TreemapTile) => string;
  className?: string;
}

/**
 * The name and reading on each tile that has room for them: stacked, then on one
 * line, then the name alone, then nothing. Tiles with no room are read through
 * `Tooltip` or `Breakdown`. Real text over the drawing, so it follows the theme's font.
 */
function TreemapChartLabels({ showValue = true, showShare = false, formatValue, className }: TreemapChartLabelsProps) {
  const { tiles, status, aspectRatio, animationDuration, staggerDelay, chartKey, activeIndex } =
    useChart('TreemapChart.Labels');
  const slots = treemapChartVariants();
  if (status === 'loading' || !tiles.length) return null;

  return (
    <div data-slot="treemap-chart-labels" aria-hidden className={slots.labels({ className })} style={{ aspectRatio }}>
      {tiles.map((tile, index) => {
        const percent = `${Math.round(tile.share * 100)}%`;
        const value = showValue ? (formatValue ? formatValue(tile.value, tile) : compactNumber(tile.value)) : null;
        const reading = value !== null && showShare ? `${value} · ${percent}` : (value ?? (showShare ? percent : null));
        const fit = fitTileLabel(tile, tile.label, reading);
        if (fit === 'none') return null;
        const dimmed = activeIndex >= 0 && activeIndex !== index;
        return (
          <div
            key={`${chartKey}:${tile.id}`}
            className={slots.label()}
            style={{
              left: tile.x,
              top: tile.y,
              width: tile.width,
              height: tile.height,
              padding: `${LABEL_PADDING_Y}px ${LABEL_PADDING_X}px`,
              color: tileInk(tile),
              opacity: dimmed ? 0.45 : 1,
              animation: `panelui-treemap-label ${animationDuration}ms ease-out ${index * staggerDelay}ms backwards`,
            }}
          >
            <div className={fit === 'inline' ? 'flex items-baseline justify-between gap-1.5' : undefined}>
              <div className={slots.labelName()}>{tile.label}</div>
              {fit === 'name' ? null : <div className={slots.labelValue()}>{reading}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
TreemapChartLabels.displayName = 'TreemapChart.Labels';

export interface TreemapChartTooltipProps {
  /** Format the value. Defaults to a compact number. */
  formatValue?: (value: number, tile: TreemapTile) => string;
  className?: string;
}

/** The readout for the tile being read. This is how the tiles too small to label are read. */
function TreemapChartTooltip({ formatValue, className }: TreemapChartTooltipProps) {
  const { setSlot } = useChart('TreemapChart.Tooltip');
  const latest = useLatest({ formatValue });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
TreemapChartTooltip.displayName = 'TreemapChart.Tooltip';

/** What a legend or breakdown row does: names its tile to the chart while it is pointed at, and pins it on a press. */
function useRowProps(index: number) {
  const { activeIndex, preview, press } = useChart('TreemapChart row');
  return {
    type: 'button' as const,
    'aria-pressed': activeIndex === index,
    onPointerEnter: () => preview(index),
    onPointerLeave: () => preview(-1),
    onFocus: () => preview(index),
    onBlur: () => preview(-1),
    onClick: () => press(index),
    style: { opacity: activeIndex >= 0 && activeIndex !== index ? 0.4 : 1 },
  };
}

function LegendItem({ tile, index, showShare }: { tile: TreemapTile; index: number; showShare: boolean }) {
  const slots = treemapChartVariants();
  return (
    <button {...useRowProps(index)} className={slots.legendItem()}>
      <span className={slots.swatch()} style={{ background: tileOpaque(tile) }} />
      <span className={slots.legendName()}>{tile.label}</span>
      {showShare ? <span className={slots.legendShare()}>{Math.round(tile.share * 100)}%</span> : null}
    </button>
  );
}

export interface TreemapChartLegendProps extends ComponentProps<'div'> {
  /** How many tiles to name before stopping. */
  limit?: number;
  /** Show each tile's share beside its name. */
  showShare?: boolean;
}

/** A swatch and a name per tile, under the box. Pointing at one reads its tile, and pressing it pins the reading. */
function TreemapChartLegend({
  limit,
  showShare = true,
  className,
  render,
  ...props
}: TreemapChartLegendProps & RenderProp<'div'>) {
  const { tiles } = useChart('TreemapChart.Legend');
  const slots = treemapChartVariants();
  const shown = limit && limit > 0 ? tiles.slice(0, Math.floor(limit)) : tiles;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'treemap-chart-legend',
        className: slots.legend({ className }),
        children: shown.map((tile, index) => (
          <LegendItem key={tile.id} tile={tile} index={index} showShare={showShare} />
        )),
      },
      props
    ),
  });
  return tiles.length ? element : null;
}
TreemapChartLegend.displayName = 'TreemapChart.Legend';

function BreakdownRow({
  tile,
  index,
  value,
  showShare,
}: {
  tile: TreemapTile;
  index: number;
  value: string;
  showShare: boolean;
}) {
  const slots = treemapChartVariants();
  return (
    <button {...useRowProps(index)} className={slots.breakdownRow()}>
      <span className={slots.swatch()} style={{ background: tileOpaque(tile) }} />
      <span className={slots.breakdownName()}>{tile.label}</span>
      <span className={slots.breakdownValue()}>
        {value}
        {showShare ? <span className={slots.breakdownShare()}>{Math.round(tile.share * 100)}%</span> : null}
      </span>
    </button>
  );
}

export interface TreemapChartBreakdownProps extends ComponentProps<'div'> {
  /** How many tiles to list before stopping. */
  limit?: number;
  /** Show each tile's share beside its value. */
  showShare?: boolean;
  /** Format the value. Defaults to the full number. */
  formatValue?: (value: number, tile: TreemapTile) => string;
}

/**
 * A table of every tile, largest first, with its exact value and share. It names
 * the tiles too small to label, and reading a row lights its tile without
 * covering anything. It sits beside the box from 448 pixels wide and under it below that.
 */
function TreemapChartBreakdown({
  limit,
  showShare = true,
  formatValue,
  className,
  render,
  ...props
}: TreemapChartBreakdownProps & RenderProp<'div'>) {
  const { tiles, status } = useChart('TreemapChart.Breakdown');
  const slots = treemapChartVariants();
  const shown = limit && limit > 0 ? tiles.slice(0, Math.floor(limit)) : tiles;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'treemap-chart-breakdown',
        role: 'group',
        'aria-label': 'Breakdown',
        className: slots.breakdown({ className }),
        children: shown.map((tile, index) => (
          <BreakdownRow
            key={tile.id}
            tile={tile}
            index={index}
            value={formatValue ? formatValue(tile.value, tile) : EXACT.format(tile.value)}
            showShare={showShare}
          />
        )),
      },
      props
    ),
  });
  return status === 'loading' || !tiles.length ? null : element;
}
TreemapChartBreakdown.displayName = 'TreemapChart.Breakdown';

export interface TreemapChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the total is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a caveat. */
  caption?: ReactNode;
  /** Trailing slot: a control, a badge, a range picker. */
  children?: ReactNode;
}

/**
 * The strip above the box. The value is not derived even though the chart knows
 * the total, because 48200 is a count, a currency or a rate depending on what was
 * counted. Pass it yourself, from `onActiveIndexChange` if it should follow the chart.
 */
function TreemapChartHeader({
  title,
  value,
  caption,
  className,
  children,
  render,
  ...props
}: TreemapChartHeaderProps & RenderProp<'div'>) {
  const slots = treemapChartVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'treemap-chart-header',
        className: slots.header({ className }),
        children: (
          <>
            <div className={slots.headerText()}>
              {title ? <div className={slots.headerMuted()}>{title}</div> : null}
              {value ? <div className={slots.headerValue()}>{value}</div> : null}
              {caption ? <div className={slots.headerMuted()}>{caption}</div> : null}
            </div>
            {children ? <div className={slots.headerTrailing()}>{children}</div> : null}
          </>
        ),
      },
      props
    ),
  });
}
TreemapChartHeader.displayName = 'TreemapChart.Header';

export const TreemapChart = Object.assign(TreemapChartRoot, {
  Header: TreemapChartHeader,
  Tiles: TreemapChartTiles,
  Skeleton: TreemapChartSkeleton,
  Labels: TreemapChartLabels,
  Tooltip: TreemapChartTooltip,
  Legend: TreemapChartLegend,
  Breakdown: TreemapChartBreakdown,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  TreemapChartHeader,
  TreemapChartTiles,
  TreemapChartSkeleton,
  TreemapChartLabels,
  TreemapChartTooltip,
  TreemapChartLegend,
  TreemapChartBreakdown,
};
