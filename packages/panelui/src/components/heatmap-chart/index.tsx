/**
 * HeatmapChart — a calendar of bins, shaded by how much happened in each.
 *
 * The contribution grid: one column per period (usually a week), one row per
 * bin inside it (usually a weekday), and a colour ramp carrying the count. It
 * answers "when was this busy" at a glance, which no line can — a year of daily
 * numbers plotted as a series is a hairball, and as a grid it is a pattern.
 *
 * Composed rather than configured, so a chart that wants no axis simply does
 * not have one:
 *
 * ```tsx
 * <HeatmapChart data={weeks}>
 *   <HeatmapChart.YAxis />
 *   <HeatmapChart.XAxis />
 *   <HeatmapChart.Cells />
 *   <HeatmapChart.Tooltip />
 *   <HeatmapChart.Legend />
 * </HeatmapChart>
 * ```
 *
 * The parts sort themselves into a real layout rather than stacking over the
 * plot. That is the difference from a line chart, where the axis floats over
 * the drawing: here the labels and the legend sit *beside* and *below* the
 * grid, so they take up room, and the grid is sized with them accounted for.
 * Only the cells and the rules between them are SVG; every label is a React
 * Native view, because SVG text ignores the platform's text scaling and the
 * theme's font.
 *
 * The ramp is one colour at five opacities rather than five colours. A heatmap
 * reads as *more* and *less* of one thing, and five distinct hues read as five
 * different things — which is what the `--color-chart-*` tokens are for, and
 * why they are not used here. The base is `--color-chart-1`, so the ramp
 * follows the theme, and `levelColors` replaces it outright when a brand needs
 * its own.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Line as SvgLine, Rect } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * Rows in a week — the default, and what the calendar helper and the weekday
 * labels assume. The grid itself takes a `rows` prop, so an hourly band or a
 * single-row uptime strip is the same component with a different number.
 */
const DAYS_IN_WEEK = 7;

/** Opacity of the base colour at each activity level. Index 0 is "nothing". */
const LEVEL_OPACITY = [1, 0.28, 0.5, 0.74, 1] as const;

/** Room left for the weekday labels when the y-axis does not ask for its own. */
const DEFAULT_AXIS_WIDTH = 26;

/**
 * Height assumed for the readout when placing it above a cell. It is a single
 * line of `xs` text in a padded box, so it does not vary — and measuring it
 * would put the tooltip a frame behind the finger.
 */
const TOOLTIP_HEIGHT = 26;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a swipe scrolls the chart instead of reading it, short
 * enough that a deliberate press does not feel like it was ignored.
 */
const DEFAULT_HOLD = 180;

/** Weekday names, indexed from Sunday, as the `Date` API numbers them. */
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Where a part belongs in the layout. Read off the component itself, so
 * composition stays a flat list of children instead of four nested slots the
 * caller has to remember the order of.
 */
type Slot = 'cells' | 'x-axis' | 'y-axis' | 'rules' | 'tooltip' | 'legend';

export type HeatmapLayout = 'fluid' | 'fill';

/** One bin inside a column — usually a single day. */
export interface HeatmapBin {
  /** Row index within the column, `0` to `6`. */
  bin: number;
  /** How much happened. The ramp is derived from these across the whole chart. */
  count: number;
  /** The day this bin stands for. Used by the axis labels and the tooltip. */
  date?: Date;
}

/** One column — usually a week. Missing bins are drawn as empty cells. */
export interface HeatmapColumn {
  /** Column index across the chart. */
  bin: number;
  bins: HeatmapBin[];
}

/** A cell resolved to its place in the grid, as the tooltip receives it. */
export interface HeatmapCell {
  column: number;
  row: number;
  count: number;
  level: number;
  date?: Date;
}

interface Grid {
  /** Side of one cell, in pixels. */
  size: number;
  gap: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
}

interface HeatmapContextValue {
  data: HeatmapColumn[];
  grid: Grid;
  /** `[level0, level1, …level4]`, already resolved to colours. */
  ramp: string[];
  /** Opacity to paint each level's colour at. All ones for a supplied ramp. */
  opacities: number[];
  levelOf: (count: number) => number;
  cellAt: (column: number, row: number) => HeatmapCell;
  cornerRadius: number;
  inactiveOpacity: number;
  weekStartDay: number;
  clipId: string;
  activeCell: HeatmapCell | null;
  setActiveCell: (cell: HeatmapCell | null) => void;
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
 * The cell under the finger, for something rendered *inside* the chart. A
 * readout in the card's header is outside this provider — use
 * `onActiveCellChange` for that.
 */
export function useHeatmapChart() {
  const { activeCell } = useHeatmap('useHeatmapChart');
  return { activeCell };
}

/* -------------------------------------------------------------------------- */
/* Data helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Build a year of columns from a flat list of dated counts.
 *
 * Every heatmap starts as "I have some dates and some numbers", and the
 * bucketing into weeks is the same arithmetic every time — including the two
 * parts that are easy to get wrong: the leading blanks before the first day of
 * the first week, and days with no entry at all, which must still be drawn as
 * empty cells or the calendar develops holes.
 */
export function buildHeatmapCalendar(
  entries: { date: Date; count: number }[],
  options: { start?: Date; end?: Date; weekStartDay?: number } = {}
): HeatmapColumn[] {
  const weekStartDay = options.weekStartDay ?? 0;
  if (!entries.length && !options.start) return [];

  const times = entries.map((entry) => entry.date.getTime());
  const start = options.start ?? new Date(Math.min(...times));
  const end = options.end ?? new Date(Math.max(...times));

  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const key = dayKey(entry.date);
    byDay.set(key, (byDay.get(key) ?? 0) + entry.count);
  }

  // Back up to the first day of the week the range starts in, so column 0 is a
  // whole week and every row lines up with a weekday for the rest of the chart.
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  cursor.setDate(cursor.getDate() - ((cursor.getDay() - weekStartDay + 7) % 7));

  const columns: HeatmapColumn[] = [];
  let column: HeatmapBin[] = [];

  while (cursor <= end || column.length) {
    const row = (cursor.getDay() - weekStartDay + 7) % 7;
    const date = new Date(cursor);
    // Before the range starts and after it ends the cell exists but has no
    // reading — `count: 0` and no date, so the tooltip stays quiet on it.
    const inRange = date >= startOfDay(start) && date <= end;
    column.push({
      bin: row,
      count: inRange ? (byDay.get(dayKey(date)) ?? 0) : 0,
      date: inRange ? date : undefined,
    });

    if (row === DAYS_IN_WEEK - 1) {
      columns.push({ bin: columns.length, bins: column });
      column = [];
      if (cursor > end) break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Four thresholds from the data, so a chart of single-digit counts and a chart
 * of thousands both use the whole ramp. Quartiles of the *non-zero* counts:
 * zero is its own level, and counting it would drag every threshold down to
 * nothing on a sparse chart.
 */
function deriveLevels(data: HeatmapColumn[]): number[] {
  const counts: number[] = [];
  for (const column of data) {
    for (const bin of column.bins) {
      if (bin.count > 0) counts.push(bin.count);
    }
  }
  if (!counts.length) return [1, 2, 3, 4];
  counts.sort((a, b) => a - b);
  const at = (fraction: number) =>
    counts[Math.min(counts.length - 1, Math.floor(counts.length * fraction))]!;
  const thresholds = [1, at(0.25), at(0.5), at(0.75)];
  // Ties collapse the ramp — nudge each threshold past the one below it so
  // four distinct levels stay four distinct levels.
  for (let i = 1; i < thresholds.length; i++) {
    if (thresholds[i]! <= thresholds[i - 1]!) thresholds[i] = thresholds[i - 1]! + 1;
  }
  return thresholds;
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export interface HeatmapChartProps extends ViewProps {
  className?: string;
  /** One column per period, with its row bins inside. */
  data: HeatmapColumn[];
  /**
   * `fluid` draws cells at `binSize` and lets the grid be as wide as it needs
   * to be — put it in a horizontal `ScrollView` for a full year. `fill`
   * divides the available width between the columns instead.
   */
  layout?: HeatmapLayout;
  /** Side of one cell in `fluid` layout, in pixels. */
  binSize?: number;
  /** Space between cells, in pixels. */
  gap?: number;
  /** Corner radius of a cell. */
  cornerRadius?: number;
  /** Which weekday is the top row. `0` is Sunday. Labels follow it. */
  weekStartDay?: number;
  /**
   * Rows per column. Seven for a calendar; use another number for a band that
   * is not a week — twenty-four for hours, one for an uptime strip.
   */
  rows?: number;
  /**
   * The four counts at which the ramp steps up. Derived from the data's own
   * quartiles when omitted, so a chart of single digits and a chart of
   * thousands both use the whole ramp.
   */
  levels?: number[];
  /**
   * Five colours — empty, then the four activity levels. Replaces the derived
   * ramp outright. Omit it and the ramp is `--color-chart-1` at five
   * opacities, which follows the theme.
   */
  levelColors?: string[];
  /** Base colour for the derived ramp. Defaults to the `--color-chart-1` token. */
  color?: string;
  /** Milliseconds for the reveal on mount. */
  animationDuration?: number;
  /** Opacity of every cell that is not the one under the finger. */
  inactiveOpacity?: number;
  /**
   * The cell under the finger as it moves, and `null` when it lifts. This is
   * how a readout above the chart gets its value — that readout is outside the
   * chart, so it cannot use `useHeatmapChart`.
   */
  onActiveCellChange?: (cell: HeatmapCell | null) => void;
  children?: ReactNode;
}

const HeatmapChartRoot = forwardRef<View, HeatmapChartProps>(function HeatmapChartRoot(
  {
    className,
    data,
    layout = 'fluid',
    binSize = 12,
    gap = 3,
    cornerRadius = 2,
    weekStartDay = 0,
    rows = DAYS_IN_WEEK,
    levels,
    levelColors,
    color,
    animationDuration = 900,
    inactiveOpacity = 1,
    onActiveCellChange,
    children,
    ...props
  },
  ref
) {
  const [width, setWidth] = useState(0);
  const [activeCell, setActiveCellState] = useState<HeatmapCell | null>(null);
  const clipId = useRef(
    `panelui-heat-${Math.random().toString(36).slice(2, 9)}`
  ).current;

  const reveal = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const baseToken = useCSSVariable('--color-chart-1');
  const emptyToken = useCSSVariable('--color-muted');
  const base = color ?? (typeof baseToken === 'string' ? baseToken : '#262626');
  const empty = typeof emptyToken === 'string' ? emptyToken : 'rgba(128,128,128,0.16)';

  const parts = useMemo(() => splitParts(children), [children]);
  // The y-axis is laid out beside the grid rather than over it, so its width
  // has to come out of the grid's before the cells are sized.
  const axisWidth = parts.y ? (parts.y.props.width ?? DEFAULT_AXIS_WIDTH) : 0;

  const grid = useMemo<Grid>(() => {
    const count = data.length;
    if (!count) return { size: 0, gap, columns: 0, rows, width: 0, height: 0 };

    const available = Math.max(width - axisWidth, 0);
    const size =
      layout === 'fill' && available > 0
        ? Math.max((available - (count - 1) * gap) / count, 1)
        : binSize;

    return {
      size,
      gap,
      columns: count,
      rows,
      width: count * size + (count - 1) * gap,
      height: rows * size + (rows - 1) * gap,
    };
  }, [data.length, width, axisWidth, layout, binSize, gap, rows]);

  const thresholds = useMemo(() => levels ?? deriveLevels(data), [levels, data]);

  /*
   * One colour at five opacities, unless the caller supplied five colours — in
   * which case the opacities are dropped, since dimming a colour someone chose
   * on purpose is not a ramp, it is a bug.
   */
  const { ramp, opacities } = useMemo(
    () =>
      levelColors
        ? { ramp: levelColors, opacities: levelColors.map(() => 1) }
        : { ramp: [empty, base, base, base, base], opacities: [...LEVEL_OPACITY] },
    [levelColors, empty, base]
  );

  const levelOf = useMemo(
    () => (count: number) => {
      if (count <= 0) return 0;
      let level = 1;
      for (let i = 1; i < thresholds.length; i++) {
        if (count >= thresholds[i]!) level = i + 1;
      }
      return Math.min(level, 4);
    },
    [thresholds]
  );

  const cellAt = useMemo(
    () => (columnIndex: number, row: number): HeatmapCell => {
      const bin = data[columnIndex]?.bins.find((candidate) => candidate.bin === row);
      const count = bin?.count ?? 0;
      return { column: columnIndex, row, count, level: levelOf(count), date: bin?.date };
    },
    [data, levelOf]
  );

  const setActiveCell = useMemo(
    () => (cell: HeatmapCell | null) => {
      setActiveCellState(cell);
      onActiveCellChange?.(cell);
    },
    [onActiveCellChange]
  );

  // Plays once, when there is both a grid to reveal and data to reveal in it.
  const revealed = useRef(false);
  useEffect(() => {
    if (revealed.current || grid.width <= 0) return;
    revealed.current = true;
    if (reducedMotion) {
      reveal.value = 1;
      return;
    }
    reveal.value = withTiming(1, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [grid.width, reducedMotion, animationDuration, reveal]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((current) => (Math.abs(current - next) < 1 ? current : next));
    props.onLayout?.(event);
  };

  const context = useMemo<HeatmapContextValue>(
    () => ({
      data,
      grid,
      ramp,
      opacities,
      levelOf,
      cellAt,
      cornerRadius,
      inactiveOpacity,
      weekStartDay,
      clipId,
      activeCell,
      setActiveCell,
    }),
    [
      data,
      grid,
      ramp,
      opacities,
      levelOf,
      cellAt,
      cornerRadius,
      inactiveOpacity,
      weekStartDay,
      clipId,
      activeCell,
      setActiveCell,
    ]
  );

  /*
   * One clip wiping left to right, rather than an animation per column. The
   * effect is the same — columns arriving in order — and it costs one animated
   * value instead of one per week, which for a year is fifty-two.
   */
  const clipProps = useAnimatedProps(() => ({ width: grid.width * reveal.value }));

  return (
    <HeatmapContext.Provider value={context}>
      <View
        {...props}
        ref={ref}
        onLayout={onLayout}
        className={cn('w-full', className)}
      >
        {parts.x ? (
          <View style={{ paddingLeft: axisWidth }}>{parts.x}</View>
        ) : null}

        <View className="flex-row">
          {parts.y}
          <View style={{ width: grid.width, height: grid.height }}>
            {grid.width > 0 ? (
              <>
                <Svg width={grid.width} height={grid.height} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <ClipPath id={clipId}>
                      <AnimatedRect x={0} y={0} height={grid.height} animatedProps={clipProps} />
                    </ClipPath>
                  </Defs>
                  <G clipPath={`url(#${clipId})`}>
                    {parts.rules}
                    {parts.cells}
                  </G>
                </Svg>
                {parts.tooltip}
              </>
            ) : null}
          </View>
        </View>

        {parts.legend}
      </View>
    </HeatmapContext.Provider>
  );
});

interface Parts {
  cells: ReactNode[];
  rules: ReactNode[];
  x: ReactNode | null;
  y: React.ReactElement<{ width?: number }> | null;
  tooltip: ReactNode[];
  legend: ReactNode[];
  columns: number;
}

/** Sorts the children into the places the layout has for them. */
function splitParts(children: ReactNode): Parts {
  const parts: Parts = {
    cells: [],
    rules: [],
    x: null,
    y: null,
    tooltip: [],
    legend: [],
    columns: 0,
  };

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const slot = (child.type as { slot?: Slot }).slot ?? 'cells';
    const keyed = <ChildSlot key={index}>{child}</ChildSlot>;

    if (slot === 'x-axis') parts.x = keyed;
    else if (slot === 'y-axis') parts.y = child as React.ReactElement<{ width?: number }>;
    else if (slot === 'rules') parts.rules.push(keyed);
    else if (slot === 'tooltip') parts.tooltip.push(keyed);
    else if (slot === 'legend') parts.legend.push(keyed);
    else parts.cells.push(keyed);
  });

  return parts;
}

/** Identity wrapper, purely so the partitioned arrays can carry keys. */
function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/* Cells                                                                      */
/* -------------------------------------------------------------------------- */

export interface HeatmapCellsProps {
  /** Corner radius of a cell. Falls back to the chart's. */
  cornerRadius?: number;
}

/**
 * The grid itself. Every row of every column is drawn, including the ones with
 * nothing in them — a calendar with holes in it stops being a calendar.
 */
function HeatmapCells({ cornerRadius }: HeatmapCellsProps) {
  const chart = useHeatmap('HeatmapChart.Cells');
  const { grid, data, ramp, opacities, levelOf, activeCell, inactiveOpacity } = chart;
  const radius = cornerRadius ?? chart.cornerRadius;
  const step = grid.size + grid.gap;

  return (
    <G>
      {data.map((column, columnIndex) =>
        Array.from({ length: grid.rows }, (_unused, row) => {
          const bin = column.bins.find((candidate) => candidate.bin === row);
          const level = levelOf(bin?.count ?? 0);
          const dimmed =
            activeCell !== null &&
            !(activeCell.column === columnIndex && activeCell.row === row);

          return (
            <Rect
              key={`${columnIndex}-${row}`}
              x={columnIndex * step}
              y={row * step}
              width={grid.size}
              height={grid.size}
              rx={radius}
              ry={radius}
              fill={ramp[level]}
              fillOpacity={opacities[level]! * (dimmed ? inactiveOpacity : 1)}
            />
          );
        })
      )}
    </G>
  );
}
HeatmapCells.slot = 'cells' as Slot;

/* -------------------------------------------------------------------------- */
/* Rules                                                                      */
/* -------------------------------------------------------------------------- */

export interface HeatmapSeparatorProps {
  /**
   * `quarter` draws a rule every thirteen columns; a number draws one every
   * that many columns.
   */
  every?: 'quarter' | number;
  color?: string;
  /** Dash pattern, e.g. `"2,4"`. Omit for a solid rule. */
  dashArray?: string;
}

/** Vertical rules grouping the columns — quarters, months, sprints. */
function HeatmapSeparator({ every = 'quarter', color, dashArray }: HeatmapSeparatorProps) {
  const { grid } = useHeatmap('HeatmapChart.Separator');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.3)');
  const interval = every === 'quarter' ? 13 : every;
  const step = grid.size + grid.gap;

  if (interval <= 0) return null;

  const lines: number[] = [];
  for (let column = interval; column < grid.columns; column += interval) {
    lines.push(column);
  }

  return (
    <G>
      {lines.map((column) => {
        const x = column * step - grid.gap / 2;
        return (
          <SvgLine
            key={column}
            x1={x}
            y1={0}
            x2={x}
            y2={grid.height}
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray={dashArray}
          />
        );
      })}
    </G>
  );
}
HeatmapSeparator.slot = 'rules' as Slot;

/* -------------------------------------------------------------------------- */
/* Axes                                                                       */
/* -------------------------------------------------------------------------- */

export interface HeatmapXAxisProps {
  className?: string;
  /**
   * Label a column. Given the first dated bin in it, so a month name can be
   * derived. Return an empty string to leave the column unlabelled.
   */
  formatLabel?: (date: Date, column: number) => string;
}

/**
 * Month labels above the grid.
 *
 * A label is emitted where the month changes rather than at a fixed interval,
 * because months are not the same length — spacing them evenly puts "Mar" over
 * a week in February.
 */
function HeatmapXAxis({ className, formatLabel }: HeatmapXAxisProps) {
  const { data, grid } = useHeatmap('HeatmapChart.XAxis');
  const step = grid.size + grid.gap;

  const labels = useMemo(() => {
    const out: { column: number; label: string }[] = [];
    let lastMonth = -1;

    data.forEach((column, index) => {
      const date = column.bins.find((bin) => bin.date)?.date;
      if (!date) return;
      const month = date.getMonth();
      if (month === lastMonth) return;
      lastMonth = month;
      const label = formatLabel ? formatLabel(date, index) : MONTHS[month]!;
      if (label) out.push({ column: index, label });
    });

    // The first month is usually a stub of a week or two, and a label over it
    // collides with the next one. Drop it when it has no room.
    if (out.length > 1 && out[1]!.column - out[0]!.column < 3) out.shift();
    return out;
  }, [data, formatLabel]);

  return (
    <View className={cn('h-4', className)} style={{ width: grid.width }}>
      {labels.map(({ column, label }) => (
        <Text
          key={`${column}-${label}`}
          size="xs"
          muted
          className="absolute"
          style={{ left: column * step }}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}
HeatmapXAxis.slot = 'x-axis' as Slot;

export interface HeatmapYAxisProps {
  className?: string;
  /** Width reserved for the labels. The grid is sized around it. */
  width?: number;
  /** Which rows get a label. Every other row is the usual choice. */
  tickFilter?: 'all' | 'odd' | 'even';
  /** `initial` is the single letter; `full` is the abbreviated name. */
  labelFormat?: 'initial' | 'full';
  /**
   * Row labels, top to bottom. Overrides the weekday names — for a grid whose
   * rows are not days.
   */
  labels?: string[];
}

/** Weekday labels down the left of the grid. */
function HeatmapYAxis({
  className,
  width = DEFAULT_AXIS_WIDTH,
  tickFilter = 'odd',
  labelFormat = 'full',
  labels,
}: HeatmapYAxisProps) {
  const { grid, weekStartDay } = useHeatmap('HeatmapChart.YAxis');
  const step = grid.size + grid.gap;

  return (
    <View className={className} style={{ width, height: grid.height }}>
      {Array.from({ length: grid.rows }, (_unused, row) => {
        if (tickFilter === 'odd' && row % 2 === 0) return null;
        if (tickFilter === 'even' && row % 2 === 1) return null;

        const name = labels
          ? (labels[row] ?? '')
          : WEEKDAYS[(row + weekStartDay) % DAYS_IN_WEEK]!;
        return (
          <Text
            key={row}
            size="xs"
            muted
            className="absolute"
            // Centred on the cell rather than aligned to its top edge, so a
            // label reads as belonging to the row it sits beside.
            style={{ top: row * step + grid.size / 2 - 7 }}
          >
            {labels
              ? name
              : labelFormat === 'initial'
                ? name.slice(0, 1)
                : name.slice(0, 3)}
          </Text>
        );
      })}
    </View>
  );
}
HeatmapYAxis.slot = 'y-axis' as Slot;

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                    */
/* -------------------------------------------------------------------------- */

export interface HeatmapTooltipProps {
  className?: string;
  /** The line shown for a cell. Defaults to the count and the date. */
  formatLabel?: (cell: HeatmapCell) => string;
  /**
   * How long a press has to be held before the readout takes over, in
   * milliseconds.
   *
   * It is not zero, and cannot be: a full year of columns lives inside a
   * horizontal scroller, and a readout that claims the touch on the first pixel
   * of movement means the chart can never be scrolled. Holding first is what
   * separates "I am moving the chart" from "I am reading it". Set `0` only for
   * a chart that is not inside a scroll view at all.
   */
  activateAfterLongPress?: number;
}

/**
 * A readout following the finger across the grid.
 *
 * It lives in the view layer, over the SVG: a gesture handler cannot be
 * attached to an SVG node, and SVG text ignores the platform's text scaling.
 * The cell under the finger is resolved on the UI thread and only crosses back
 * into JS when it changes, so a drag across a year costs a handful of
 * re-renders rather than one per frame.
 */
function HeatmapTooltip({
  className,
  formatLabel,
  activateAfterLongPress = DEFAULT_HOLD,
}: HeatmapTooltipProps) {
  const { grid, activeCell, setActiveCell, cellAt } = useHeatmap(
    'HeatmapChart.Tooltip'
  );
  const step = grid.size + grid.gap;

  // Mirrored for the worklet, which cannot read the JS closure's latest value.
  const lastKey = useSharedValue(-1);

  const resolve = useMemo(
    () => (column: number, row: number) => setActiveCell(cellAt(column, row)),
    [cellAt, setActiveCell]
  );
  const clear = useMemo(() => () => setActiveCell(null), [setActiveCell]);

  /*
   * The cell is resolved here, on the UI thread, and only crosses into JS when
   * it *changes*. Sending every frame's coordinates over and picking the cell
   * in React would cost a re-render per frame for a value that changes maybe
   * fifty times across a whole drag.
   */
  const pick = (x: number, y: number) => {
    'worklet';
    const column = Math.floor(x / step);
    const row = Math.floor(y / step);
    if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) return;
    const key = column * grid.rows + row;
    if (key === lastKey.value) return;
    lastKey.value = key;
    runOnJS(resolve)(column, row);
  };

  /*
   * The readout takes over only once the press has been held.
   *
   * `onStart` rather than `onBegin` is the other half of it: `onBegin` fires on
   * touch-down whatever happens next, so picking there would light a cell and
   * dim the rest of the grid for the first moment of every scroll swipe — the
   * gesture would yield correctly and still leave a flicker behind it.
   */
  const pan = Gesture.Pan()
    .minDistance(0)
    .activateAfterLongPress(activateAfterLongPress)
    .onStart((event) => {
      'worklet';
      pick(event.x, event.y);
    })
    .onUpdate((event) => {
      'worklet';
      pick(event.x, event.y);
    })
    .onFinalize(() => {
      'worklet';
      // Fires whether or not the gesture ever activated, so a swipe that only
      // scrolled must not report a cell change it never made.
      if (lastKey.value === -1) return;
      lastKey.value = -1;
      runOnJS(clear)();
    });

  const label = activeCell
    ? formatLabel
      ? formatLabel(activeCell)
      : defaultTooltipLabel(activeCell)
    : null;

  // Flipped to the left of the finger past the halfway mark, so the readout
  // never runs off the edge it is closest to — and dropped below the cell in
  // the top two rows, where there is no room above it inside the chart.
  const anchorX = activeCell ? activeCell.column * step + grid.size / 2 : 0;
  const flipped = anchorX > grid.width / 2;
  const below = (activeCell?.row ?? 0) < 2;
  const anchorY = activeCell
    ? below
      ? activeCell.row * step + grid.size + 6
      : activeCell.row * step - TOOLTIP_HEIGHT - 6
    : 0;

  return (
    <>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>

      {activeCell && label ? (
        <View
          pointerEvents="none"
          className={cn(
            'absolute rounded-lg border border-border bg-popover px-2 py-1 shadow-md',
            className
          )}
          style={{
            top: anchorY,
            [flipped ? 'right' : 'left']: flipped ? grid.width - anchorX : anchorX,
          }}
        >
          <Text size="xs" className="text-popover-foreground">
            {label}
          </Text>
        </View>
      ) : null}
    </>
  );
}
HeatmapTooltip.slot = 'tooltip' as Slot;

function defaultTooltipLabel(cell: HeatmapCell) {
  const count = `${cell.count} ${cell.count === 1 ? 'contribution' : 'contributions'}`;
  if (!cell.date) return 'No data';
  const date = `${MONTHS[cell.date.getMonth()]} ${cell.date.getDate()}`;
  return `${count} on ${date}`;
}

/* -------------------------------------------------------------------------- */
/* Legend                                                                     */
/* -------------------------------------------------------------------------- */

export interface HeatmapLegendProps {
  className?: string;
  /** Text at the low end of the ramp. */
  lessLabel?: string;
  /** Text at the high end. */
  moreLabel?: string;
  /** Side of a swatch, in pixels. Defaults to the chart's cell size. */
  swatchSize?: number;
}

/** The `Less ▢▢▢▢▢ More` key, under the grid. */
function HeatmapLegend({
  className,
  lessLabel = 'Less',
  moreLabel = 'More',
  swatchSize,
}: HeatmapLegendProps) {
  const { ramp, opacities, grid, cornerRadius } = useHeatmap('HeatmapChart.Legend');
  const size = swatchSize ?? Math.max(grid.size, 10);

  return (
    <View className={cn('flex-row items-center gap-1.5 pt-2', className)}>
      <View className="flex-1" />
      <Text size="xs" muted>
        {lessLabel}
      </Text>
      {ramp.map((fill, level) => (
        <Svg key={level} width={size} height={size}>
          <Rect
            x={0}
            y={0}
            width={size}
            height={size}
            rx={cornerRadius}
            ry={cornerRadius}
            fill={fill}
            fillOpacity={opacities[level]}
          />
        </Svg>
      ))}
      <Text size="xs" muted>
        {moreLabel}
      </Text>
    </View>
  );
}
HeatmapLegend.slot = 'legend' as Slot;

export const HeatmapChart = Object.assign(HeatmapChartRoot, {
  Cells: HeatmapCells,
  Separator: HeatmapSeparator,
  XAxis: HeatmapXAxis,
  YAxis: HeatmapYAxis,
  Tooltip: HeatmapTooltip,
  Legend: HeatmapLegend,
});
