'use client';

/**
 * HeatmapChart — a calendar of bins, shaded by how much happened in each.
 *
 * ```tsx
 * <HeatmapChart data={weeks}>
 *   <HeatmapChart.Header title="Contributions" value="1,204" legend />
 *   <HeatmapChart.YAxis />
 *   <HeatmapChart.XAxis />
 *   <HeatmapChart.Cells />
 *   <HeatmapChart.Tooltip />
 *   <HeatmapChart.Legend />
 * </HeatmapChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's HeatmapChart, so a chart written for
 * one reads the same in the other. What differs is what the web changes: a mouse reads
 * the cell under it, a click or a tap pins the reading, the arrow keys walk the grid,
 * and every day carries its own label for a screen reader.
 *
 * ## A real layout
 *
 * The parts sort themselves into a grid rather than stacking over the plot. The labels
 * and the legend sit beside and below the cells and take up room, and the cells are sized
 * with them accounted for.
 *
 * ## One colour
 *
 * The ramp is one colour at five opacities. A heatmap reads as more and less of one
 * thing, and five hues would read as five different things.
 */
import { defineChart, rect, ruleX } from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { Chart } from '@tanstack/charts/react/core';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import {
  cellAtPoint,
  defaultCellLabel,
  deriveLevels,
  heatmapCells,
  heatmapGrid,
  monthLabels,
  moveCell,
  normalizeWeekStart,
  weekdayLabel,
  type HeatmapCell,
  type HeatmapColumn,
  type HeatmapGrid,
} from './heatmap-calendar';

export { buildHeatmapCalendar, type HeatmapBin, type HeatmapCell, type HeatmapColumn } from './heatmap-calendar';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type HeatmapLayout = 'fluid' | 'fill';

const heatmapChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-[auto_minmax(0,1fr)] text-foreground',
    plot: 'relative col-start-2 row-start-3 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    chart: 'absolute! inset-0',
    xAxis: 'relative col-start-2 row-start-2 h-5 text-xs text-muted-foreground',
    yAxis: 'relative col-start-1 row-start-3 text-xs text-muted-foreground',
    axisLabel: 'absolute whitespace-nowrap',
    ring: 'pointer-events-none absolute col-start-2 row-start-3 self-start justify-self-start rounded-[3px] outline-2 outline-foreground',
    tooltip:
      'pointer-events-none absolute col-start-2 row-start-3 self-start justify-self-start rounded-lg border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md',
    legend: 'col-span-2 col-start-1 row-start-4 flex items-center justify-end gap-1.5 pt-2 text-xs text-muted-foreground',
    swatch: 'shrink-0',
    header: 'col-span-2 col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex shrink items-center gap-1.5 pt-1 text-xs text-muted-foreground',
  },
});

/** Opacity of the base colour at each level. Index 0 is "nothing", in its own colour. */
const LEVEL_OPACITY = [1, 0.28, 0.5, 0.74, 1];

/** Room left for the weekday labels when the y-axis does not ask for its own. */
const DEFAULT_AXIS_WIDTH = 26;

/** Clearance between the readout and the cell it is reading. */
const TOOLTIP_GAP = 6;

/** The grid's rows above this one are too near the top for a readout to sit over the cell. */
const FLIP_BELOW_ROW = 2;

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)'],
};

const ROLES = new Set(['primary', 'info', 'success', 'warning', 'destructive', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']);

/** A theme role, a token by name, or anything else as the CSS colour it already is. */
const colorOf = (color: string) => (ROLES.has(color) ? `var(--${color})` : color.startsWith('--') ? `var(${color})` : color);

interface CellBox {
  cell: HeatmapCell;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/** What the parts have asked for. */
interface Slots {
  cells?: { cornerRadius: number };
  separator?: { every: 'quarter' | number; color: string; dashArray: string | undefined };
  axisWidth?: number;
  tooltip?: true;
}

interface HeatmapContextValue {
  data: readonly HeatmapColumn[];
  grid: HeatmapGrid;
  ramp: readonly string[];
  opacities: readonly number[];
  cornerRadius: number;
  weekStartDay: number;
  activeCell: HeatmapCell | null;
  formatCellLabel: HeatmapChartProps['formatCellLabel'];
  /** Set while the keyboard is moving the reading, so the cell can scroll into view. */
  fromKeyboard: RefObject<boolean>;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
}

const HeatmapContext = createContext<HeatmapContextValue | null>(null);

function useHeatmap(component: string): HeatmapContextValue {
  const context = useContext(HeatmapContext);
  if (!context) {
    throw new Error(`${component} must be used within a <HeatmapChart>`);
  }
  return context;
}

/**
 * The cell being read, for something rendered inside the chart. A readout outside it
 * uses `onActiveCellChange`.
 */
export function useHeatmapChart() {
  const { activeCell } = useHeatmap('useHeatmapChart');
  return { activeCell };
}

export interface HeatmapChartProps extends Omit<ComponentProps<'div'>, 'color'> {
  /** One column per period, with its row bins inside. `buildHeatmapCalendar` makes these from dated counts. */
  data: readonly HeatmapColumn[];
  /**
   * `fluid` draws cells at `binSize`, and the chart is as wide as that needs. Put it in
   * a horizontal scroller for a full year. `fill` divides the available width between
   * the columns instead.
   */
  layout?: HeatmapLayout;
  /** Side of one cell in `fluid` layout, in pixels. */
  binSize?: number;
  /** Space between cells, in pixels. */
  gap?: number;
  /** Corner radius of a cell. */
  cornerRadius?: number;
  /** Which weekday is the top row. `0` is Sunday. The labels follow it. */
  weekStartDay?: number;
  /** Rows per column. Seven for a calendar, twenty-four for a grid of hours. */
  rows?: number;
  /** The four counts at which the ramp steps up. Derived from the data's quartiles when omitted. */
  levels?: readonly number[];
  /** Five colours, empty first, that replace the derived ramp. */
  levelColors?: readonly string[];
  /**
   * The colour of the busiest cells, with the quieter levels the same colour at lower
   * opacity. A theme role, a token by name, or any CSS colour. Defaults to `chart-1`.
   */
  color?: string;
  /** The colour of a cell with nothing in it. Takes the same values as `color`. Defaults to the muted surface. */
  emptyColor?: string;
  /** Opacity of the base colour at each of the five levels, quietest first. Ignored when `levelColors` is given. */
  levelOpacity?: readonly number[];
  /** Milliseconds for the reveal on mount. `0` draws the chart at once. */
  animationDuration?: number;
  /** Opacity of every cell other than the one being read. */
  inactiveOpacity?: number;
  /**
   * The cell being read as it changes, and `null` when there is none. For a readout outside
   * the chart. Reading needs `HeatmapChart.Tooltip`; `formatLabel={() => ''}` hides its line.
   */
  onActiveCellChange?: (cell: HeatmapCell | null) => void;
  /** What a screen reader calls the chart. */
  label?: string;
  /**
   * What a screen reader says for one cell, in the list of days and as the keyboard
   * reaches it. Return nothing to leave a cell out of the list. Defaults to its count and
   * date, and days outside the calendar's range are left out.
   */
  formatCellLabel?: (cell: HeatmapCell) => string | null | undefined;
}

const HeatmapChartRoot = forwardRef<HTMLDivElement, HeatmapChartProps & RenderProp<'div'>>(function HeatmapChartRoot(
  {
    data,
    layout = 'fluid',
    binSize = 12,
    gap = 3,
    cornerRadius = 2,
    weekStartDay: weekStartDayProp = 0,
    rows = 7,
    levels,
    levelColors,
    color,
    emptyColor,
    levelOpacity,
    animationDuration = 900,
    inactiveOpacity = 1,
    onActiveCellChange,
    label,
    formatCellLabel,
    className,
    style,
    children,
    render,
    ...props
  },
  ref
) {
  const slotClasses = heatmapChartVariants();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [rootWidth, setRootWidth] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slots>({});
  const [activeAt, setActiveAt] = useState<{ column: number; row: number } | null>(null);
  const pinned = useRef(false);
  const fromKeyboard = useRef(false);
  const revealed = useRef(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    // The content box, so padding on the root does not widen a `fill` grid past it.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRootWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setSlot = useCallback<HeatmapContextValue['setSlot']>(
    (slot, value) => setSlots((current) => (current[slot] === value ? current : { ...current, [slot]: value })),
    []
  );

  const weekStartDay = normalizeWeekStart(weekStartDayProp);
  const axisWidth = slots.axisWidth ?? 0;
  const measured = layout === 'fluid' || rootWidth !== null;
  const grid = useMemo(
    () => heatmapGrid(data.length, rows, rootWidth === null ? null : rootWidth - axisWidth, { layout, binSize, gap }),
    [data.length, rows, rootWidth, axisWidth, layout, binSize, gap]
  );

  const thresholds = useMemo(() => levels ?? deriveLevels(data), [levels, data]);
  const cells = useMemo(() => heatmapCells(data, rows, thresholds), [data, rows, thresholds]);

  const base = color ? colorOf(color) : 'var(--chart-1)';
  const empty = emptyColor ? colorOf(emptyColor) : 'var(--muted)';
  const ramp = useMemo(() => (levelColors ? [...levelColors] : [empty, base, base, base, base]), [levelColors, empty, base]);
  // A colour somebody chose on purpose is not dimmed, so a supplied ramp is all ones.
  const opacities = useMemo(
    () => (levelColors ? levelColors.map(() => 1) : [...(levelOpacity ?? LEVEL_OPACITY)]),
    [levelColors, levelOpacity]
  );

  const activeCell = useMemo(() => {
    // Out of the grid's rows, the flat lookup below would land on some other cell.
    if (!activeAt || activeAt.row >= rows) return null;
    return cells[activeAt.column * rows + activeAt.row] ?? null;
  }, [activeAt, cells, rows]);

  const activeRef = useRef(activeCell);
  const onChangeRef = useRef(onActiveCellChange);
  // After commit, so a render React throws away leaves no reading the handlers would act on.
  useLayoutEffect(() => {
    activeRef.current = activeCell;
    onChangeRef.current = onActiveCellChange;
  });

  const setActive = useCallback((at: { column: number; row: number } | null) => {
    const current = activeRef.current;
    if (current?.column === at?.column && current?.row === at?.row) return;
    setActiveAt(at);
  }, []);

  // Reported by value, because data rebuilt on every render makes a new cell each time
  // and a caller that keeps the cell would loop. New data under the same cell is news,
  // and so is the cell no longer existing.
  const activeId = activeCell
    ? `${activeCell.column}:${activeCell.row}:${activeCell.count}:${activeCell.level}:${activeCell.date?.getTime()}`
    : '';
  const reportedId = useRef('');
  useEffect(() => {
    if (!activeCell) {
      pinned.current = false;
      setActiveAt(null);
    }
    if (reportedId.current === activeId) return;
    reportedId.current = activeId;
    onChangeRef.current?.(activeCell);
  }, [activeId]);

  const { cells: cellsSlot, separator, tooltip } = slots;
  const reads = tooltip === true && cells.length > 0;

  // The dimming is the only thing in the drawing that follows the reading. Leaving it
  // out of the definition otherwise keeps a hover from rebuilding every cell.
  const dimFrom = inactiveOpacity < 1 ? activeCell : null;

  const definition = useMemo(() => {
    const step = grid.size + grid.gap;
    const boxes = cells.map<CellBox>((cell) => ({
      cell,
      x1: cell.column * step,
      x2: cell.column * step + grid.size,
      y1: cell.row * step,
      y2: cell.row * step + grid.size,
    }));
    const radius = cellsSlot?.cornerRadius ?? cornerRadius;
    const isDimmed = (box: CellBox) => dimFrom !== null && (box.cell.column !== dimFrom.column || box.cell.row !== dimFrom.row);
    const marks = (dimmed: boolean) =>
      ramp.flatMap((fill, level) => {
        const members = boxes.filter((box) => box.cell.level === level && isDimmed(box) === dimmed);
        if (!members.length) return [];
        return [
          rect(members, {
            id: `level-${level}-${dimmed ? 'dim' : 'full'}`,
            key: (box: CellBox) => `${box.cell.column}:${box.cell.row}`,
            x1: 'x1',
            x2: 'x2',
            y1: 'y1',
            y2: 'y2',
            fill,
            fillOpacity: (opacities[level] ?? 1) * (dimmed ? inactiveOpacity : 1),
            radius,
          }),
        ];
      });

    const interval = separator ? (separator.every === 'quarter' ? 13 : separator.every) : 0;
    const ruled: number[] = [];
    if (interval > 0) {
      for (let column = interval; column < grid.columns; column += interval) {
        ruled.push(column * step - grid.gap / 2);
      }
    }

    return defineChart({
      theme: THEME,
      marks: [
        ...(ruled.length
          ? [ruleX(ruled, { x: (value: number) => value, stroke: separator?.color, strokeWidth: 1, strokeDasharray: separator?.dashArray })]
          : []),
        ...(cellsSlot ? [...marks(false), ...marks(true)] : []),
      ],
      scales: {
        x: { scale: scaleLinear([0, grid.width], [0, 1]), axis: false as const, grid: false as const },
        y: { scale: scaleLinear([grid.height, 0], [0, 1]), axis: false as const, grid: false as const },
      },
      guides: false as const,
      margin: 0,
      focusRing: false,
      keyboard: false,
      pointer: false,
      motion: false as const,
    });
  }, [cells, grid, ramp, opacities, cornerRadius, inactiveOpacity, cellsSlot, separator, dimFrom]);

  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 0 } }), []);

  // One clip wiping left to right, rather than an animation per cell: columns arrive in
  // order, and a year costs one animation instead of three hundred and sixty-five.
  useLayoutEffect(() => {
    const node = plotRef.current;
    if (!node || revealed.current || !measured || grid.width <= 0 || !cellsSlot) return;
    revealed.current = true;
    if (animationDuration <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    node.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
      duration: animationDuration,
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
    });
  }, [measured, grid.width, cellsSlot, animationDuration]);

  const atPointer = (event: ReactMouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return cellAtPoint(event.clientX - bounds.left, event.clientY - bounds.top, grid);
  };

  const summary = label ?? `Heatmap chart, ${data.length} columns`;
  const spokenCells = cells.flatMap((cell) => {
    const custom = formatCellLabel?.(cell);
    if (formatCellLabel && !custom) return [];
    // A cell outside the calendar's range is a place in the grid, with nothing to read.
    if (!custom && !cell.date && cell.count <= 0) return [];
    return [{ key: `${cell.column}:${cell.row}`, text: custom ?? defaultCellLabel(cell) }];
  });

  const context = useMemo<HeatmapContextValue>(
    () => ({ data, grid, ramp, opacities, cornerRadius, weekStartDay, activeCell, formatCellLabel, fromKeyboard, setSlot }),
    [data, grid, ramp, opacities, cornerRadius, weekStartDay, activeCell, formatCellLabel, setSlot]
  );

  const assignRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  const element = useRender({
    defaultTagName: 'div',
    render,
    ref: assignRoot,
    props: mergeProps(
      {
        'data-slot': 'heatmap-chart',
        className: slotClasses.root({ className }),
        // A `fluid` grid wider than the space it was given overflows as one block, so
        // a horizontal scroller around the chart scrolls all of it, the legend included.
        style: { ...style, minWidth: layout === 'fluid' ? axisWidth + grid.width : undefined },
        children: (
          <>
            <ul aria-label={summary} className="sr-only">
              {spokenCells.map(({ key, text }) => (
                <li key={key}>{text}</li>
              ))}
            </ul>
            <div
              ref={plotRef}
              data-slot="heatmap-chart-plot"
              role="group"
              aria-label={summary}
              tabIndex={reads ? 0 : undefined}
              className={slotClasses.plot()}
              style={
                measured
                  ? { width: grid.width, height: grid.height }
                  : { width: '100%', aspectRatio: `${Math.max(data.length, 1)} / ${rows}` }
              }
              onPointerMove={(event) => {
                if (!reads || event.pointerType !== 'mouse') return;
                if (pinned.current && activeRef.current) return;
                setActive(atPointer(event));
              }}
              onPointerLeave={() => {
                if (!pinned.current || !activeRef.current) setActive(null);
              }}
              // A click rather than a pointer down, so that the start of a swipe across
              // a scrolling year does not read the cell it started on.
              onClick={(event) => {
                if (!reads) return;
                const at = atPointer(event);
                const current = activeRef.current;
                const same = current?.column === at?.column && current?.row === at?.row;
                const clearing = !at || (same && pinned.current);
                pinned.current = !clearing;
                setActive(clearing ? null : at);
              }}
              onKeyDown={(event) => {
                if (!reads) return;
                if (event.key === 'Escape') {
                  pinned.current = false;
                  setActive(null);
                  return;
                }
                const current = activeRef.current;
                // The first key lands on the first day, rather than moving away from it.
                const first = cells.find((cell) => cell.date) ?? { column: 0, row: 0 };
                const moved = moveCell(current ?? first, event.key, grid);
                const next = moved && !current ? first : moved;
                if (!next) return;
                event.preventDefault();
                pinned.current = true;
                fromKeyboard.current = true;
                setActive({ column: next.column, row: next.row });
              }}
            >
              {measured && grid.width > 0 ? (
                <Chart
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  aspectRatio={grid.width / grid.height}
                  initialWidth={grid.width}
                  className={slotClasses.chart()}
                />
              ) : null}
            </div>
            {children}
          </>
        ),
      },
      props
    ),
  });

  return <HeatmapContext.Provider value={context}>{element}</HeatmapContext.Provider>;
});
HeatmapChartRoot.displayName = 'HeatmapChart';

export interface HeatmapChartCellsProps {
  /** Corner radius of a cell. Falls back to the chart's. */
  cornerRadius?: number;
}

/**
 * The grid itself. Every row of every column is drawn, including the empty ones, because
 * a calendar with holes in it stops being a calendar.
 */
function HeatmapChartCells({ cornerRadius }: HeatmapChartCellsProps) {
  const { setSlot, cornerRadius: fallback } = useHeatmap('HeatmapChart.Cells');
  const radius = cornerRadius ?? fallback;
  const value = useMemo(() => ({ cornerRadius: radius }), [radius]);
  useEffect(() => {
    setSlot('cells', value);
    return () => setSlot('cells', undefined);
  }, [value, setSlot]);
  return null;
}
HeatmapChartCells.displayName = 'HeatmapChart.Cells';

export interface HeatmapChartSeparatorProps {
  /** `quarter` draws a rule every thirteen columns, and a number one every that many columns. */
  every?: 'quarter' | number;
  /** A theme role, a token by name, or any CSS colour. Defaults to the border colour. */
  color?: string;
  /** Dash pattern, such as `"2,4"`. Omit it for a solid rule. */
  dashArray?: string;
}

/** Vertical rules grouping the columns: quarters, months, sprints. */
function HeatmapChartSeparator({
  every = 'quarter',
  color,
  dashArray,
}: HeatmapChartSeparatorProps) {
  const { setSlot } = useHeatmap('HeatmapChart.Separator');
  const stroke = color ? colorOf(color) : 'var(--border)';
  const value = useMemo(() => ({ every, color: stroke, dashArray }), [every, stroke, dashArray]);
  useEffect(() => {
    setSlot('separator', value);
    return () => setSlot('separator', undefined);
  }, [value, setSlot]);
  return null;
}
HeatmapChartSeparator.displayName = 'HeatmapChart.Separator';

export interface HeatmapChartXAxisProps extends ComponentProps<'div'> {
  /** Label a column, given the first dated bin in it. Return an empty string to leave it unlabelled. */
  formatLabel?: (date: Date, column: number) => string;
  /** Column labels, left to right, for a grid whose columns are not weeks. Overrides the month names. */
  labels?: readonly string[];
}

/** Month labels above the grid, one where the month changes. A grid that passes `labels` gets one over each column. */
function HeatmapChartXAxis({
  formatLabel,
  labels: given,
  className,
  render,
  ...props
}: HeatmapChartXAxisProps & RenderProp<'div'>) {
  const { data, grid } = useHeatmap('HeatmapChart.XAxis');
  const slots = heatmapChartVariants();
  const step = grid.size + grid.gap;
  const labels = given
    ? given.slice(0, data.length).flatMap((label, column) => (label ? [{ column, label }] : []))
    : monthLabels(data, formatLabel);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'heatmap-chart-x-axis',
        'aria-hidden': true,
        className: slots.xAxis({ className }),
        children: labels.map(({ column, label }) => (
          <span key={`${column}-${label}`} className={slots.axisLabel()} style={{ left: column * step }}>
            {label}
          </span>
        )),
      },
      props
    ),
  });
}
HeatmapChartXAxis.displayName = 'HeatmapChart.XAxis';

export interface HeatmapChartYAxisProps extends ComponentProps<'div'> {
  /** Width reserved for the labels, in pixels. The grid is sized around it. */
  width?: number;
  /** Which rows get a label. Every other row is the usual choice. */
  tickFilter?: 'all' | 'odd' | 'even';
  /** `initial` is the single letter, and `full` the abbreviated name. */
  labelFormat?: 'initial' | 'full';
  /** Row labels, top to bottom, used as they are. For localised weekdays, or rows that are not days. */
  labels?: readonly string[];
}

/** Weekday labels down the left of the grid. */
function HeatmapChartYAxis({
  width = DEFAULT_AXIS_WIDTH,
  tickFilter = 'odd',
  labelFormat = 'full',
  labels,
  className,
  style,
  render,
  ...props
}: HeatmapChartYAxisProps & RenderProp<'div'>) {
  const { grid, weekStartDay, setSlot } = useHeatmap('HeatmapChart.YAxis');
  const slots = heatmapChartVariants();
  const step = grid.size + grid.gap;
  // Before the first paint, so the cells are never sized for a chart without this axis.
  useLayoutEffect(() => {
    setSlot('axisWidth', width);
    return () => setSlot('axisWidth', undefined);
  }, [width, setSlot]);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'heatmap-chart-y-axis',
        'aria-hidden': true,
        className: slots.yAxis({ className }),
        style: { ...style, width, height: grid.height },
        children: Array.from({ length: grid.rows }, (_unused, row) => {
          if (tickFilter === 'odd' && row % 2 === 0) return null;
          if (tickFilter === 'even' && row % 2 === 1) return null;
          return (
            <span
              key={row}
              className={slots.axisLabel()}
              // Centred on the cell, so a label reads as belonging to the row beside it.
              style={{ top: row * step + grid.size / 2, transform: 'translateY(-50%)' }}
            >
              {labels ? (labels[row] ?? '') : weekdayLabel(row, weekStartDay, labelFormat)}
            </span>
          );
        }),
      },
      props
    ),
  });
}
HeatmapChartYAxis.displayName = 'HeatmapChart.YAxis';

export interface HeatmapChartTooltipProps {
  /** The line shown for a cell, including a cell with no date. Defaults to the count and the date. */
  formatLabel?: (cell: HeatmapCell) => string;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * What makes the grid readable. A mouse reads the cell under it, a click or a tap pins
 * the reading, the same cell again clears it, and the arrow keys walk the grid.
 */
function HeatmapChartTooltip({
  formatLabel,
  className,
}: HeatmapChartTooltipProps) {
  const { grid, activeCell, formatCellLabel, fromKeyboard, setSlot } = useHeatmap('HeatmapChart.Tooltip');
  const slots = heatmapChartVariants();
  const node = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setSlot('tooltip', true);
    return () => setSlot('tooltip', undefined);
  }, [setSlot]);

  const text = activeCell ? (formatLabel ? formatLabel(activeCell) : defaultCellLabel(activeCell)) : '';
  // A hidden line is still read out: an empty `formatLabel` only silences the drawing.
  // A `formatCellLabel` that returns nothing has said this cell is not worth reading.
  const spoken = !activeCell
    ? ''
    : formatCellLabel
      ? formatCellLabel(activeCell) || text
      : text || defaultCellLabel(activeCell);

  // Sized by its contents and placed once it knows its size, because a day and an
  // amount in another language can be twice as wide as the default.
  useLayoutEffect(() => {
    if (!node.current) return;
    const { offsetWidth, offsetHeight } = node.current;
    setSize((current) =>
      current?.width === offsetWidth && current?.height === offsetHeight ? current : { width: offsetWidth, height: offsetHeight }
    );
  }, [text]);

  // Only for the keyboard: a mouse is already where it is looking.
  useEffect(() => {
    if (!fromKeyboard.current) return;
    fromKeyboard.current = false;
    ringRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeCell, fromKeyboard]);

  const step = grid.size + grid.gap;
  const left = activeCell ? activeCell.column * step : 0;
  const top = activeCell ? activeCell.row * step : 0;
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  return (
    <>
      <div role="status" className="sr-only">
        {spoken}
      </div>
      {activeCell ? (
        <div
          ref={ringRef}
          aria-hidden
          data-slot="heatmap-chart-active-cell"
          className={slots.ring()}
          style={{ left, top, width: grid.size, height: grid.size }}
        />
      ) : null}
      {activeCell && text ? (
        <div
          ref={node}
          aria-hidden
          data-slot="heatmap-chart-tooltip"
          className={slots.tooltip({ className })}
          style={{
            left: Math.max(0, Math.min(grid.width - width, left + grid.size / 2 - width / 2)),
            top: activeCell.row < FLIP_BELOW_ROW ? top + grid.size + TOOLTIP_GAP : top - height - TOOLTIP_GAP,
            visibility: size ? 'visible' : 'hidden',
          }}
        >
          {text}
        </div>
      ) : null}
    </>
  );
}
HeatmapChartTooltip.displayName = 'HeatmapChart.Tooltip';

/** The ramp as a row of swatches, between its two labels. */
function Ramp({ lessLabel, moreLabel, size }: { lessLabel: string; moreLabel: string; size: number }) {
  const { ramp, opacities, cornerRadius } = useHeatmap('HeatmapChart.Legend');
  const slots = heatmapChartVariants();
  return (
    <>
      <span>{lessLabel}</span>
      {ramp.map((fill, level) => (
        <span
          key={level}
          aria-hidden
          className={slots.swatch()}
          style={{ width: size, height: size, borderRadius: cornerRadius, background: fill, opacity: opacities[level] ?? 1 }}
        />
      ))}
      <span>{moreLabel}</span>
    </>
  );
}

export interface HeatmapChartLegendProps extends ComponentProps<'div'> {
  /** Text at the low end of the ramp. */
  lessLabel?: string;
  /** Text at the high end. */
  moreLabel?: string;
  /** Side of a swatch, in pixels. Defaults to the chart's cell size, and at least 10. */
  swatchSize?: number;
}

/** The key under the grid: `Less`, the five steps of the ramp, `More`. */
function HeatmapChartLegend({
  lessLabel = 'Less',
  moreLabel = 'More',
  swatchSize,
  className,
  render,
  ...props
}: HeatmapChartLegendProps & RenderProp<'div'>) {
  const { grid } = useHeatmap('HeatmapChart.Legend');
  const slots = heatmapChartVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'heatmap-chart-legend',
        className: slots.legend({ className }),
        children: <Ramp lessLabel={lessLabel} moreLabel={moreLabel} size={swatchSize ?? Math.max(grid.size, 10)} />,
      },
      props
    ),
  });
}
HeatmapChartLegend.displayName = 'HeatmapChart.Legend';

export interface HeatmapChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the grid is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a total, the cell being read. */
  caption?: ReactNode;
  /** Draw the ramp along the trailing edge. For a grid that scrolls, where a legend under the cells would scroll away. */
  legend?: boolean;
  /** Text at the low end of the ramp, when `legend` is set. */
  lessLabel?: string;
  /** Text at the high end. */
  moreLabel?: string;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the grid. The value is not derived here: take it from
 * `onActiveCellChange` and pass the formatted string down, so one header can show a total
 * when nothing is being read and a day's own count when something is.
 */
function HeatmapChartHeader({
  title,
  value,
  caption,
  legend = false,
  lessLabel = 'Less',
  moreLabel = 'More',
  className,
  children,
  render,
  ...props
}: HeatmapChartHeaderProps & RenderProp<'div'>) {
  const { grid } = useHeatmap('HeatmapChart.Header');
  const slots = heatmapChartVariants();
  const trailing =
    children ?? (legend ? <Ramp lessLabel={lessLabel} moreLabel={moreLabel} size={Math.max(Math.min(grid.size, 12), 8)} /> : null);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'heatmap-chart-header',
        className: slots.header({ className }),
        children: (
          <>
            <div className={slots.headerText()}>
              {title ? <div className={slots.headerMuted()}>{title}</div> : null}
              {value !== undefined && value !== null ? <div className={slots.headerValue()}>{value}</div> : null}
              {caption ? <div className={slots.headerMuted()}>{caption}</div> : null}
            </div>
            {trailing ? <div className={slots.headerTrailing()}>{trailing}</div> : null}
          </>
        ),
      },
      props
    ),
  });
}
HeatmapChartHeader.displayName = 'HeatmapChart.Header';

export const HeatmapChart = Object.assign(HeatmapChartRoot, {
  Header: HeatmapChartHeader,
  Cells: HeatmapChartCells,
  Separator: HeatmapChartSeparator,
  XAxis: HeatmapChartXAxis,
  YAxis: HeatmapChartYAxis,
  Tooltip: HeatmapChartTooltip,
  Legend: HeatmapChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  HeatmapChartHeader,
  HeatmapChartCells,
  HeatmapChartSeparator,
  HeatmapChartXAxis,
  HeatmapChartYAxis,
  HeatmapChartTooltip,
  HeatmapChartLegend,
};
