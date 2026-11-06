'use client';

/**
 * SankeyChart — where a quantity came from and where it ended up.
 *
 * ```tsx
 * <SankeyChart nodes={stages} links={flows}>
 *   <SankeyChart.Links />
 *   <SankeyChart.Nodes />
 *   <SankeyChart.Labels />
 *   <SankeyChart.Breakdown />
 * </SankeyChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's SankeyChart, so a chart
 * written for one reads the same in the other. What differs is what the web
 * changes: a colour is named by the theme's role, a stage or a ribbon is read by
 * hovering, tapping or the arrow keys, and a click pins the reading.
 *
 * ## Grey until it is read
 *
 * A ribbon's thickness is its value, and at rest that is all it says: the
 * ribbons are one quiet colour, so the bars carry the colour and the shape of
 * the flow reads first. Reading a stage colours its whole route, every stage
 * before and after it, because a route is the question this chart exists for.
 *
 * ## The route is the focus group
 *
 * A focus group is normally the points that share an x. Here the focus strategy
 * returns the route instead, so the coloured ribbons and the faded bars are the
 * chart's own focus states and reading a stage rebuilds nothing.
 *
 * ## The layout is ours, the drawing is the chart's
 *
 * Bad rows are dropped and counted rather than thrown, because flow data is
 * usually joined from somewhere nobody in the room owns. `collapse`, a pinned
 * node `value` and a vertical flow all happen in the layout, so it runs before
 * the chart and the marks draw its pixels, through scales that change nothing.
 *
 * ## A ribbon is a filled shape
 *
 * A stroke has one thickness from end to end. `targetRows` needs a ribbon to
 * narrow into its row, so each one is drawn as its two edges and the space
 * between them.
 */
import {
  createMark,
  defineChart,
  rect,
  text,
  whenFocused,
  type ChartFocusStrategy,
  type ChartInteractionController,
  type ChartMotionContext,
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
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { sankeyLayout, transposeLayout, type SankeyAlign, type SankeyCollapse, type SankeyLayout } from './sankey-layout';

export type { SankeyAlign, SankeyCollapse } from './sankey-layout';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type SankeyChartStatus = 'loading' | 'ready';
export type SankeyOrientation = 'horizontal' | 'vertical';

/** Which of the theme's roles a node or a ribbon is drawn in. */
export type SankeyChartColor =
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

export interface SankeyNode {
  /** Stable key the links name. Must be unique; a repeat is ignored. */
  id: string;
  /** Name drawn beside the bar. Defaults to the id. */
  label?: string;
  /** The bar's colour: a theme role or any CSS colour. Defaults to its place in the palette. */
  color?: SankeyChartColor | (string & {});
  /** Set to `false` to draw no bar. The node keeps its place and can still be read. */
  bar?: boolean;
  /**
   * Pins what passes through the node, for a stage that loses some of what it
   * received to somewhere the links do not describe. Left unset the node is
   * worth the larger of what arrives and what leaves.
   */
  value?: number;
}

export interface SankeyLink {
  /** `id` of the node it leaves. */
  source: string;
  /** `id` of the node it reaches. */
  target: string;
  /** How much travels. Zero, negative and non-finite rows are dropped. */
  value: number;
  /** Its colour, a theme role or any CSS colour, instead of the source node's. */
  color?: SankeyChartColor | (string & {});
  /** With `SankeyChart.Links gradient`, the opacity it fades between, from its source to its target. */
  opacity?: readonly [number, number];
}

/** Rows beside the chart for the last column's ribbons to end on, in pixels. */
export interface SankeyRowGrid {
  /** Where the first row starts, under a table's header. */
  top: number;
  /** How tall each row is. */
  height: number;
  /** How much of its thickness a ribbon keeps at the row. Defaults to `0.4`. */
  taper?: number;
  /** The thinnest a ribbon gets at the row. Defaults to `3`. */
  minThickness?: number;
}

/** Where a node of the last column sits across the flow, in pixels. */
export interface SankeyTargetLayout {
  id: string;
  y: number;
  y0: number;
  y1: number;
}

const COLOR_VAR: Record<SankeyChartColor, string> = {
  primary: 'var(--primary)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  'chart-1': 'var(--chart-1)',
  'chart-2': 'var(--chart-2)',
  'chart-3': 'var(--chart-3)',
  'chart-4': 'var(--chart-4)',
  'chart-5': 'var(--chart-5)',
};

const resolveColor = (color: string): string =>
  Object.hasOwn(COLOR_VAR, color) ? COLOR_VAR[color as SankeyChartColor] : color;

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: PALETTE,
};

// The labels are placed in pixels already mirrored, so the svg's own direction must not flip their anchors.
const sankeyChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: "relative col-start-1 row-start-2 w-full [&_.sankey-ribbon]:transition-opacity data-dimmed:[&_.sankey-ribbon]:opacity-25",
    chart:
      'absolute! inset-0 rounded-lg text-xs [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:[direction:ltr] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
    breakdown: 'col-start-1 row-start-3 mt-3 border-t pt-3 text-[0.8125rem] leading-5 outline-none',
    breakdownSides: 'grid grid-cols-2 gap-x-4 sm:gap-x-6',
    breakdownSide: 'flex min-w-0 flex-col gap-0.5',
    breakdownTitle: 'pb-0.5 text-xs text-muted-foreground',
    breakdownRow:
      'flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md py-0.5 text-start outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
    breakdownPlaceholder: 'text-muted-foreground',
    swatch: 'size-2 shrink-0 rounded-full',
    rowLabel: 'min-w-0 flex-1 truncate text-muted-foreground',
    rowValue: 'tabular-nums',
    rowShare: 'hidden w-9 text-end sm:block tabular-nums text-muted-foreground',
    legend: 'col-start-1 row-start-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-xs',
    legendItem:
      'flex max-w-full cursor-pointer items-center gap-1.5 rounded-md outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring data-dimmed:opacity-40',
    legendLabel: 'truncate text-muted-foreground',
    legendShare: 'font-medium tabular-nums',
  },
});

const DEFAULT_HEIGHT = 240;

/** How much depth one stage of a vertical flow is given when nothing says. */
const VERTICAL_STAGE = 104;

const DEFAULT_NODE_WIDTH = 10;
const DEFAULT_NODE_PADDING = 14;
const DEFAULT_ITERATIONS = 6;

/** Exactly half puts both control points on the centre line, so a ribbon's two halves mirror. */
const DEFAULT_CURVE = 0.5;

const DEFAULT_DURATION = 620;
const DEFAULT_STAGGER = 110;

const LABEL_GAP = 7;

/** One line of a name, as a box, so two names on thin neighbouring bars cannot run together. */
const LABEL_LINE = 18;

/** An estimate, because measuring every name means a render to find out where to render them. */
const nameWidth = (name: string) => name.length * 7 + 8;

/** Columns the placeholder suggests while there is no data to count. */
const SKELETON_COLUMNS = 3;

const NODES_MARK = 'sankey-nodes';
const LINKS_MARK = 'sankey-links';
const DEFAULT_TAPER = 0.4;
const DEFAULT_MIN_THICKNESS = 3;
const RIBBON_SAMPLES = 12;
const gradientId = (row: LinkRow) => row.key.replace(':', '-');

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactNumber = (value: number) => COMPACT.format(value);

/** A bar, in the chart's pixels. */
interface NodeRow {
  kind: 'node';
  key: string;
  id: string;
  name: string;
  value: number;
  layer: number;
  color: string;
  /** `false` keeps the node readable with nothing painted. */
  bar: boolean;
  /** It ends on a row beside the chart, which carries its name. */
  onRow: boolean;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

type Span = readonly [number, number];

/** A ribbon, in the chart's pixels: its two edges, along the flow and across it. */
interface LinkRow {
  kind: 'link';
  key: string;
  input: number;
  source: string;
  target: string;
  value: number;
  layer: number;
  color: string;
  /** Where the ribbon's gradient ends: the target's colour, or its own when it was given one. */
  endColor: string;
  fade?: readonly [number, number];
  from: number;
  to: number;
  start: Span;
  end: Span;
}

/** A name, or the figure under it, placed beside its bar. */
interface LabelRow {
  key: string;
  node: NodeRow;
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'end';
  muted: boolean;
}

type Row = NodeRow | LinkRow | LabelRow;
type RowPoint = ChartPoint<Row, number, number>;

const barFill = (row: NodeRow) => (row.bar ? row.color : 'transparent');
const isNode = (row: Row): row is NodeRow => 'kind' in row && row.kind === 'node';
const isLink = (row: Row): row is LinkRow => 'kind' in row && row.kind === 'link';

/** What is being read, by the keys its rows carry. */
type Reading = { kind: 'node'; id: string } | { kind: 'link'; key: string } | null;

/** One end of a stream meeting the node being read. */
export interface SankeyChartFlow {
  /** The node at the other end. */
  id: string;
  /** Its name, already resolved. */
  label: string;
  /** What travels between the two. */
  value: number;
  /** That value as a fraction of the node's total, `0` to `1`. */
  share: number;
  /** The other node's colour, for a swatch beside its name. */
  color: string;
}

/** A ribbon's two ends and the value between them, for a reading of one ribbon. */
export interface SankeyChartActiveLink {
  source: SankeyChartFlow;
  target: SankeyChartFlow;
  value: number;
}

const cubic = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/** A ribbon's outline. Both edges bend alike, so its control points reach along the flow only. */
function ribbonPath({ from, to, start, end }: LinkRow, vertical: boolean, reach: number): string {
  const run = (to - from) * reach;
  const at = (along: number, across: number) => (vertical ? `${across},${along}` : `${along},${across}`);
  return (
    `M${at(from, start[0])}C${at(from + run, start[0])} ${at(to - run, end[0])} ${at(to, end[0])}` +
    `L${at(to, end[1])}C${at(to - run, end[1])} ${at(from + run, start[1])} ${at(from, start[1])}Z`
  );
}

function ribbonOutline({ from, to, start, end }: LinkRow, vertical: boolean, reach: number): (readonly [number, number])[] {
  const run = (to - from) * reach;
  const steps = Array.from({ length: RIBBON_SAMPLES + 1 }, (_unused, step) => step / RIBBON_SAMPLES);
  const edge = (side: 0 | 1) =>
    steps.map((t): readonly [number, number] => {
      const along = cubic(from, from + run, to - run, to, t);
      const across = cubic(start[side], start[side], end[side], end[side], t);
      return vertical ? [across, along] : [along, across];
    });
  return [...edge(0), ...edge(1).reverse()];
}

/** How far a point is inside a ribbon, negative within it, or `Infinity` past its ends. */
function ribbonGap(row: LinkRow, x: number, y: number, vertical: boolean, reach: number): number {
  const { from, to, start, end } = row;
  const [along, across] = vertical ? [y, x] : [x, y];
  if (along < Math.min(from, to) || along > Math.max(from, to)) return Infinity;
  const run = (to - from) * reach;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 16; step += 1) {
    const t = (low + high) / 2;
    const reached = cubic(from, from + run, to - run, to, t);
    if (to > from ? reached < along : reached > along) low = t;
    else high = t;
  }
  const t = (low + high) / 2;
  const first = cubic(start[0], start[0], end[0], end[0], t);
  const second = cubic(start[1], start[1], end[1], end[1], t);
  return Math.abs(across - (first + second) / 2) - Math.abs(second - first) / 2;
}

/** The ribbons, drawn from pixels the layout already worked out. */
function ribbonMark(
  rows: readonly LinkRow[],
  options: {
    id: string;
    vertical: boolean;
    reach: number;
    fill: (row: LinkRow) => string;
    fillOpacity?: (row: LinkRow) => number;
    className?: string;
    still?: boolean;
  }
) {
  const { id, vertical, reach, fill, fillOpacity, className, still } = options;
  return createMark<LinkRow, number, number>(
    () => ({
      id,
      channels: {},
      render: () => {
        const points = rows.map((row, datumIndex) => {
          const key = `${id}:${row.key}`;
          const [along, across] = [(row.from + row.to) / 2, (row.start[0] + row.start[1] + row.end[0] + row.end[1]) / 4];
          return {
            key,
            markId: id,
            group: null,
            groupLabel: id,
            datum: row,
            datumIndex,
            xValue: row.to,
            yValue: row.value,
            x: vertical ? across : along,
            y: vertical ? along : across,
            color: row.color,
          };
        });
        return {
          nodes: [
            {
              kind: 'group' as const,
              key: id,
              className: 'ts-chart__link',
              ariaHidden: true,
              children: rows.map((row, index) => ({
                kind: 'area' as const,
                key: `${id}:${row.key}`,
                ...(className ? { className } : {}),
                path: ribbonPath(row, vertical, reach),
                points: ribbonOutline(row, vertical, reach),
                interaction: { point: points[index]!, affinity: 'geometry' as const },
                style: { fill: fill(row), fillOpacity: fillOpacity?.(row) },
              })),
            },
          ],
          points,
        };
      },
    }),
    still ? false : undefined
  );
}

/** The nodes and ribbons before and after one reading, by key. */
function routeOf(reading: Reading, links: readonly LinkRow[]): Set<string> {
  const route = new Set<string>();
  // A node reached by many paths is walked once, or the cost grows with the paths.
  const seen = { forward: new Set<string>(), backward: new Set<string>() };
  const walk = (id: string, forward: boolean) => {
    const visited = forward ? seen.forward : seen.backward;
    if (visited.has(id)) return;
    visited.add(id);
    route.add(`node:${id}`);
    for (const row of links) {
      if ((forward ? row.source : row.target) !== id) continue;
      route.add(row.key);
      walk(forward ? row.target : row.source, forward);
    }
  };
  if (reading?.kind === 'node') {
    walk(reading.id, true);
    walk(reading.id, false);
  } else if (reading?.kind === 'link') {
    const row = links.find(({ key }) => key === reading.key);
    if (row) {
      route.add(row.key);
      walk(row.source, false);
      walk(row.target, true);
    }
  }
  return route;
}

const readingOf = (row: Row | undefined): Reading => {
  if (!row) return null;
  if (isNode(row)) return { kind: 'node', id: row.id };
  if (isLink(row)) return { kind: 'link', key: row.key };
  return null;
};

const rowKey = (row: Row) => (isNode(row) || isLink(row) ? row.key : `node:${row.node.id}`);

/**
 * Bars first, then ribbons, by what is actually under the pointer. The nearest
 * point would be a ribbon's midpoint, which a pointer on the same ribbon's end
 * is further from than it is from the bar next door.
 */
function routeFocus(links: readonly LinkRow[], vertical: boolean, reach: number, barsReadable: boolean): ChartFocusStrategy<Row, number, number> {
  let cachedFor = '';
  let cached = new Set<string>();
  const routeFor = (row: Row) => {
    const key = rowKey(row);
    if (key !== cachedFor) {
      cachedFor = key;
      cached = routeOf(readingOf(row), links);
    }
    return cached;
  };

  const group = (points: readonly RowPoint[], point: RowPoint) => {
    const route = routeFor(point.datum);
    // The primary point goes first, because the chart reads it from the group's head.
    return [point, ...points.filter((other) => other !== point && route.has(rowKey(other.datum)))];
  };

  return {
    resolve(points, { x, y }) {
      const bar = !barsReadable ? undefined : points.find(({ datum }) => isNode(datum) && x >= datum.x0 - 3 && x <= datum.x1 + 3 && y >= datum.y0 - 3 && y <= datum.y1 + 3);
      if (bar) return group(points, bar);
      let nearest: RowPoint | undefined;
      let nearestGap = Infinity;
      for (const point of points) {
        if (!isLink(point.datum)) continue;
        const gap = ribbonGap(point.datum, x, y, vertical, reach);
        if (gap <= 0 && gap < nearestGap) {
          nearest = point;
          nearestGap = gap;
        }
      }
      return nearest ? group(points, nearest) : [];
    },
    group: (points, { point }) => group(points, point),
    // The bars are enough to walk: from each one the breakdown names its ribbons.
    navigation: (points) => {
      if (!barsReadable) return points.filter(({ datum }) => isLink(datum));
      const bars = points.filter(({ datum }) => isNode(datum));
      return bars.sort((a, b) => {
        const [left, right] = [a.datum as NodeRow, b.datum as NodeRow];
        return left.layer - right.layer || left.y0 - right.y0 || left.x0 - right.x0;
      });
    },
  };
}

/** Which names fit: the larger stage keeps its name where two would collide. */
function placeLabels(
  nodes: readonly NodeRow[],
  { width, height, vertical, rtl, showValue, minHeight, format }: {
    width: number;
    height: number;
    vertical: boolean;
    rtl: boolean;
    showValue: boolean;
    minHeight: number;
    format: (value: number, node: NodeRow) => string;
  }
): LabelRow[] {
  const placed: { left: number; right: number; top: number; bottom: number }[] = [];
  const rows: LabelRow[] = [];
  const lines = showValue ? 2 : 1;
  for (const node of [...nodes].sort((a, b) => b.value - a.value)) {
    const size = vertical ? node.x1 - node.x0 : node.y1 - node.y0;
    if (size < minHeight) continue;
    const boxWidth = nameWidth(node.name);
    const boxHeight = LABEL_LINE * lines;
    const inward = rtl ? node.x0 > 0 : node.x1 >= width - 1;
    const x = vertical ? node.x0 : inward ? node.x0 - LABEL_GAP : node.x1 + LABEL_GAP;
    const anchor = !vertical && inward ? 'end' : 'start';
    // A vertical flow's last stage has nothing under it, so its name goes above the bar.
    const below = node.y1 + boxHeight + 3 <= height;
    const top = vertical ? (below ? node.y1 + 3 : node.y0 - boxHeight - 3) : (node.y0 + node.y1) / 2 - boxHeight / 2;
    const left = anchor === 'end' ? x - boxWidth : x;
    const box = { left, right: left + boxWidth, top, bottom: top + boxHeight };
    if (placed.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) {
      continue;
    }
    placed.push(box);
    rows.push({ key: `${node.id}:name`, node, text: node.name, x, y: top + LABEL_LINE / 2, anchor, muted: false });
    if (showValue) {
      rows.push({ key: `${node.id}:value`, node, text: format(node.value, node), x, y: top + LABEL_LINE * 1.5, anchor, muted: true });
    }
  }
  return rows;
}

function pointsOf(nodes: readonly SceneNode[], found: RowPoint[] = []): RowPoint[] {
  for (const node of nodes) {
    if (node.kind === 'group') {
      pointsOf(node.children, found);
      continue;
    }
    const point = 'interaction' in node ? (node.interaction?.point as RowPoint | undefined) : undefined;
    if (point && (isNode(point.datum) || isLink(point.datum))) found.push(point);
  }
  return found;
}

/** What the parts have asked for. Formatters are read through `latest`, so a new one costs nothing. */
interface Slots {
  links?: { gradient: boolean; opacity: number; activeOpacity: number };
  nodes?: { radius: number; dimOpacity: number; interactive: boolean };
  labels?: { showValue: boolean; minHeight: number; latest: { current: Pick<SankeyChartLabelsProps, 'formatValue'> } };
  tooltip?: { className: string | undefined; latest: { current: Pick<SankeyChartTooltipProps, 'formatValue'> } };
  skeleton?: true;
}

interface SankeyChartContextValue {
  rows: { nodes: readonly NodeRow[]; links: readonly LinkRow[] };
  reading: Reading;
  status: SankeyChartStatus;
  select: (id: string | null) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
}

const SankeyChartContext = createContext<SankeyChartContextValue | null>(null);

function useChart(component: string): SankeyChartContextValue {
  const context = useContext(SankeyChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <SankeyChart>`);
  }
  return context;
}

/** What is being read and what runs through it, for something rendered inside the chart. */
export function useSankeyChart() {
  const { rows, reading } = useChart('useSankeyChart');

  return useMemo(() => {
    const nodeById = new Map(rows.nodes.map((node) => [node.id, node]));
    const flow = (id: string, value: number, total: number): SankeyChartFlow => {
      const other = nodeById.get(id);
      return {
        id,
        label: other?.name ?? id,
        value,
        // Against what passes through the node rather than against the side's own
        // total, so in and out are read on one scale.
        share: total > 0 ? value / total : 0,
        color: other?.color ?? PALETTE[0]!,
      };
    };
    const placed = reading?.kind === 'node' ? nodeById.get(reading.id) : undefined;
    const ribbon = reading?.kind === 'link' ? rows.links.find(({ key }) => key === reading.key) : undefined;
    const largestFirst = (a: SankeyChartFlow, b: SankeyChartFlow) => b.value - a.value;
    const outer = (stages: readonly NodeRow[]) => {
      const total = stages.reduce((sum, { value }) => sum + value, 0);
      return stages.map(({ id, value }) => flow(id, value, total)).sort(largestFirst);
    };

    return {
      /** The node being read, or `null` while nothing is, or a ribbon is. */
      activeId: placed?.id ?? null,
      /** Its name. */
      activeLabel: placed?.name ?? null,
      /** What passes through it: what the bar's height is drawn from. */
      activeValue: placed?.value ?? 0,
      /** The ribbon being read, or `null`. */
      activeLink: ribbon
        ? ({
            source: flow(ribbon.source, ribbon.value, nodeById.get(ribbon.source)?.value ?? 0),
            target: flow(ribbon.target, ribbon.value, nodeById.get(ribbon.target)?.value ?? 0),
            value: ribbon.value,
          } satisfies SankeyChartActiveLink)
        : null,
      /** Where it came from, largest first. */
      sources: placed
        ? rows.links.filter(({ target }) => target === placed.id).map((row) => flow(row.source, row.value, placed.value)).sort(largestFirst)
        : ([] as SankeyChartFlow[]),
      /** Where it went, largest first. */
      targets: placed
        ? rows.links.filter(({ source }) => source === placed.id).map((row) => flow(row.target, row.value, placed.value)).sort(largestFirst)
        : ([] as SankeyChartFlow[]),
      /** The stages nothing arrives at, largest first, each as a share of them all. */
      starts: outer(rows.nodes.filter(({ id }) => !rows.links.some(({ target }) => target === id))),
      /** The stages nothing leaves, largest first, each as a share of them all. */
      ends: outer(rows.nodes.filter(({ id }) => !rows.links.some(({ source }) => source === id))),
    };
  }, [rows, reading]);
}

export interface SankeyChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The stages. Order does not decide position; the links do. */
  nodes: readonly SankeyNode[];
  /** What travels between them. */
  links: readonly SankeyLink[];
  /**
   * How tall the diagram is drawn, in pixels. Under `orientation="vertical"` it
   * is the length of the flow, and left unset it is worked out from how many
   * stages the flow needs.
   */
  height?: number;
  /** How thick a node's bar is, in pixels. */
  nodeWidth?: number;
  /** The most space between two nodes in a column, in pixels. A crowded column gives it up first. */
  nodePadding?: number;
  /** `horizontal` runs the flow across, `vertical` from the top down, which suits a narrow screen. */
  orientation?: SankeyOrientation;
  /**
   * Folds each column's smallest nodes into one bucket. `maxPerColumn` caps how
   * many a column keeps, the bucket included; `minShare` folds anything under
   * that fraction of its column; `label` names the bucket, `Other` by default.
   */
  collapse?: SankeyCollapse;
  /** Which column a node goes in where the flow leaves a choice. */
  align?: SankeyAlign;
  /** Relaxation rounds spent untangling the ribbons. */
  iterations?: number;
  /** How far a ribbon bends, `0` for a straight diagonal and `0.5` for an S. */
  curve?: number;
  /** Milliseconds for one column to draw itself. */
  animationDuration?: number;
  /** Milliseconds between one column starting and the next. */
  staggerDelay?: number;
  /** `loading` holds the data back. Add `SankeyChart.Skeleton` for a shape to stand in meanwhile. */
  status?: SankeyChartStatus;
  /** Selected node. Leave unset to let the chart track it. */
  activeId?: string | null;
  /** Fires with the id of the node being read, and `null` when none is. */
  onActiveIdChange?: (id: string | null) => void;
  /**
   * Ends the last column's ribbons on rows beside the chart, such as a table's,
   * in the order those nodes were given, with no bars or names of their own.
   * Set `height` to fit the rows, and keep each row to one line, because a taller
   * row moves those below it off their ribbons. A horizontal flow only.
   */
  targetRows?: SankeyRowGrid;
  /** Fires with where the last column landed, and again when that moves. */
  onLayout?: (targets: readonly SankeyTargetLayout[]) => void;
  /**
   * Fires with how many link rows could not be drawn: ones naming a node that is
   * not there, carrying nothing, or closing a loop. `0` after a clean render.
   */
  onDropLinks?: (count: number) => void;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one ribbon. Defaults to "source to target, value". */
  labelForLink?: (link: SankeyLink, index: number) => string;
}

/** Imperative handle: re-run the entrance, for a "replay" control. */
export interface SankeyChartHandle {
  replay: () => void;
}

const SankeyChartRoot = forwardRef<SankeyChartHandle, SankeyChartProps & RenderProp<'div'>>(function SankeyChartRoot(
  {
    nodes,
    links,
    height: heightProp,
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodePadding = DEFAULT_NODE_PADDING,
    orientation = 'horizontal',
    collapse,
    align = 'justify',
    iterations = DEFAULT_ITERATIONS,
    curve = DEFAULT_CURVE,
    animationDuration = DEFAULT_DURATION,
    staggerDelay = DEFAULT_STAGGER,
    status = 'ready',
    activeId,
    targetRows,
    onLayout,
    onActiveIdChange,
    onDropLinks,
    label,
    labelForLink,
    className,
    children,
    render,
    ...props
  },
  ref
) {
  const slotClasses = sankeyChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, rtl: false });
  const [slots, setSlots] = useState<Slots>({});
  const [reading, setReading] = useState<Reading>(null);
  const [revision, setRevision] = useState(0);
  const interactionRef = useRef<ChartInteractionController<Row, number, number> | null>(null);
  const pointsRef = useRef<RowPoint[]>([]);

  const width = size.width;
  const vertical = orientation === 'vertical';
  const loading = status === 'loading';

  // The chart mounts once its width is known: a resize ends the entrance before it is seen.
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const read = () => {
      const next = { width: node.clientWidth, rtl: getComputedStyle(node).direction === 'rtl' };
      setSize((current) => (current.width === next.width && current.rtl === next.rtl ? current : next));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setSlot = useCallback<SankeyChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const options = { nodeWidth, nodePadding, align, iterations, collapse };

  // The column count falls out of the links alone, so no rounds are spent on it.
  const stages = useMemo(() => {
    if (!vertical || heightProp !== undefined) return 0;
    return sankeyLayout(nodes as SankeyNode[], links as SankeyLink[], { ...options, width: 1000, height: 1000, iterations: 0 }).columns;
  }, [vertical, heightProp, nodes, links, nodeWidth, nodePadding, align, collapse]);

  const height = heightProp ?? (vertical ? Math.max(DEFAULT_HEIGHT, stages * VERTICAL_STAGE) : DEFAULT_HEIGHT);

  const layout = useMemo<SankeyLayout>(() => {
    const solved = sankeyLayout(nodes as SankeyNode[], links as SankeyLink[], {
      ...options,
      width: vertical ? height : width,
      height: vertical ? width : height,
    });
    return vertical ? transposeLayout(solved) : solved;
  }, [nodes, links, width, height, nodeWidth, nodePadding, align, iterations, collapse, vertical]);

  const dropped = layout.dropped;
  // Nothing is laid out until the width is known, so that first zero says nothing.
  const measured = width > 0;
  useEffect(() => {
    if (measured) onDropLinks?.(dropped);
  }, [dropped, onDropLinks, measured]);

  const rows = useMemo(() => {
    // A flow reads from where it starts, which is the right-hand edge in a
    // right-to-left page. A vertical flow starts at the top in every script.
    const mirror = size.rtl && !vertical;
    const onRows = targetRows && !vertical ? targetRows : undefined;
    const rowOf = new Map<number, number>();
    if (onRows) {
      layout.nodes.forEach((node, index) => {
        if (node.layer === layout.columns - 1) rowOf.set(index, rowOf.size);
      });
    }
    const rowCentre = (row: number) => (onRows ? onRows.top + onRows.height * (row + 0.5) : 0);

    // A source's ribbons leave it in the order of the rows they reach, or they would cross.
    const leaving = new Map<number, Span>();
    const ending = new Map<number, Span>();
    if (onRows) {
      const reachOf = (target: number) => {
        const row = rowOf.get(target);
        const node = layout.nodes[target];
        return row === undefined ? ((node?.y0 ?? 0) + (node?.y1 ?? 0)) / 2 : rowCentre(row);
      };
      for (const [index, node] of layout.nodes.entries()) {
        let cursor = node.y0;
        const out = layout.links.filter(({ source }) => source === index).sort((a, b) => reachOf(a.target) - reachOf(b.target) || a.y0 - b.y0);
        for (const link of out) {
          leaving.set(link.index, [cursor, cursor + link.width]);
          cursor += link.width;
        }
      }
      for (const [target, row] of rowOf) {
        const into = layout.links.filter((link) => link.target === target).sort((a, b) => (leaving.get(a.index)?.[0] ?? 0) - (leaving.get(b.index)?.[0] ?? 0));
        const thickness = into.map((link) => Math.max(link.width * (onRows.taper ?? DEFAULT_TAPER), onRows.minThickness ?? DEFAULT_MIN_THICKNESS));
        let cursor = rowCentre(row) - thickness.reduce((sum, value) => sum + value, 0) / 2;
        into.forEach((link, position) => {
          const end = cursor + (thickness[position] ?? 0);
          ending.set(link.index, [cursor, end]);
          cursor = end;
        });
      }
    }

    const nodeRows = layout.nodes.map((node, index): NodeRow => {
      const input = nodes[node.index];
      const row = rowOf.get(index);
      const spans = row === undefined ? [] : layout.links.flatMap((link) => (link.target === index ? (ending.get(link.index) ?? []) : []));
      return {
        kind: 'node',
        key: `node:${node.id}`,
        id: node.id,
        // A bucket's id can carry a suffix to keep it unique, so its name is the one asked for.
        name: node.collapsed ? (collapse?.label ?? 'Other') : (input?.label ?? node.id),
        value: node.value,
        layer: node.layer,
        // The node's place in the data rather than its column: a colour per
        // column would say the column means something, and it does not.
        color: input?.color ? resolveColor(input.color) : PALETTE[index % PALETTE.length]!,
        bar: input?.bar !== false && row === undefined,
        onRow: row !== undefined,
        x0: mirror ? width - node.x1 : node.x0,
        x1: mirror ? width - node.x0 : node.x1,
        y0: spans.length ? Math.min(...spans) : node.y0,
        y1: spans.length ? Math.max(...spans) : node.y1,
      };
    });
    const linkRows = layout.links.flatMap((link): LinkRow[] => {
      const source = nodeRows[link.source];
      const target = nodeRows[link.target];
      if (!source || !target) return [];
      const input = links[link.input];
      const color = input?.color ? resolveColor(input.color) : source.color;
      const half = link.width / 2;
      const [from, to] = vertical
        ? [source.y1, target.y0]
        : mirror
          ? [source.x0, target.onRow ? target.x0 : target.x1]
          : [source.x1, target.onRow ? target.x1 : target.x0];
      return [
        {
          kind: 'link',
          key: `link:${link.index}`,
          input: link.input,
          source: source.id,
          target: target.id,
          value: link.value,
          layer: source.layer,
          color,
          endColor: input?.color ? color : target.color,
          ...(input?.opacity ? { fade: input.opacity } : {}),
          from,
          to,
          start: leaving.get(link.index) ?? [link.y0 - half, link.y0 + half],
          end: ending.get(link.index) ?? [link.y1 - half, link.y1 + half],
        },
      ];
    });
    const targets = nodeRows
      .filter(({ layer }) => layer === layout.columns - 1)
      .map((node): SankeyTargetLayout => {
        const [y0, y1] = vertical ? [node.x0, node.x1] : [node.y0, node.y1];
        return { id: node.id, y: (y0 + y1) / 2, y0, y1 };
      });
    return { nodes: nodeRows, links: linkRows, targets };
  }, [layout, nodes, links, collapse?.label, width, vertical, size.rtl, targetRows?.top, targetRows?.height, targetRows?.taper, targetRows?.minThickness]);

  // By what the positions say, because a parent's inline data makes new rows every render.
  const reportedLayout = useRef('');
  const latestOnLayout = useLatest(onLayout);
  useEffect(() => {
    const signature = JSON.stringify(rows.targets);
    if (signature === reportedLayout.current || width === 0) return;
    reportedLayout.current = signature;
    latestOnLayout.current?.(rows.targets);
  }, [rows.targets, width, latestOnLayout]);

  const { links: linksSlot, nodes: nodesSlot, labels: labelsSlot, tooltip, skeleton } = slots;

  // Only what is added to a drawn chart fades in, so a new chart draws its marks empty first.
  const chartKey = `${revision}:${status}`;
  const [enteredKey, setEnteredKey] = useState<string | null>(null);
  const entering = !loading && enteredKey !== chartKey;

  const definition = useMemo(() => {
    const ribbon = { vertical, reach: curve };
    const shown = entering ? { nodes: [], links: [] } : rows;

    const fade = { type: 'tween' as const, duration: 120, easing: 'ease-out' as const };

    const marks = loading
      ? skeleton
        ? skeletonMarks(width, height, vertical, nodeWidth, curve)
        : []
      : [
          ...(linksSlot
            ? [
                ribbonMark(shown.links, {
                  ...ribbon,
                  id: LINKS_MARK,
                  className: 'sankey-ribbon',
                  fill: linksSlot.gradient ? (row) => `url(#${gradientId(row)})` : () => 'var(--foreground)',
                  fillOpacity: (row) => (linksSlot.gradient && row.fade ? 1 : linksSlot.opacity),
                }),
                whenFocused(
                  ribbonMark(rows.links, {
                    ...ribbon,
                    id: `${LINKS_MARK}-route`,
                    fill: linksSlot.gradient ? (row) => `url(#${gradientId(row)})` : (row) => row.color,
                    fillOpacity: () => linksSlot.activeOpacity,
                  }),
                  { match: 'group' }
                ),
              ]
            : []),
          ...(nodesSlot
            ? [
                // A rect takes one fill, so the bars are one mark per colour.
                ...[...new Set(rows.nodes.map(barFill))].map((fill, index) =>
                  rect(shown.nodes.filter((row) => barFill(row) === fill), {
                    id: `${NODES_MARK}-${index}`,
                    x1: (row: NodeRow) => row.x0,
                    x2: (row: NodeRow) => row.x1,
                    y1: (row: NodeRow) => row.y0,
                    y2: (row: NodeRow) => row.y1,
                    key: (row: NodeRow) => row.key,
                    fill,
                    radius: nodesSlot.radius,
                    states: [{ when: { focus: 'unmatched' as const }, style: { opacity: nodesSlot.dimOpacity }, transition: fade }],
                  })
                ),
              ]
            : []),
          ...(labelsSlot
            ? [
                text(
                  placeLabels(shown.nodes.filter(({ onRow }) => !onRow), {
                    width,
                    height,
                    vertical,
                    rtl: size.rtl && !vertical,
                    showValue: labelsSlot.showValue,
                    minHeight: labelsSlot.minHeight,
                    format: (value, node) => labelsSlot.latest.current.formatValue?.(value, node.id) ?? compactNumber(value),
                  }),
                  {
                    id: 'sankey-labels',
                    x: (row: LabelRow) => row.x,
                    y: (row: LabelRow) => row.y,
                    text: (row: LabelRow) => row.text,
                    key: (row: LabelRow) => row.key,
                    anchor: (row: LabelRow) => row.anchor,
                    fill: (row: LabelRow) => (row.muted ? 'var(--muted-foreground)' : 'var(--foreground)'),
                    fontWeight: 500,
                    states: [{ when: { focus: 'unmatched' as const }, style: { opacity: 0.3 }, transition: fade }],
                  }
                ),
              ]
            : []),
        ];

    const interactive = !loading && (linksSlot !== undefined || (nodesSlot !== undefined && nodesSlot.interactive));
    const readout = tooltip
      ? {
          use: chartTooltip,
          className: tooltip.className,
          anchor: 'point' as const,
          sticky: false,
          content(_points: readonly RowPoint[], context: ChartTooltipContentContext) {
            const format = tooltip.latest.current.formatValue ?? compactNumber;
            const row = context.primaryPoint?.datum as Row | undefined;
            const nameOf = (id: string) => rows.nodes.find((node) => node.id === id)?.name ?? id;
            if (row && isLink(row)) {
              return {
                title: `${nameOf(row.source)} to ${nameOf(row.target)}`,
                rows: [{ label: 'Value', value: format(row.value), color: row.color }],
              };
            }
            if (!row || !isNode(row)) return { title: '', rows: [] };
            const side = (rowsOf: LinkRow[], other: (link: LinkRow) => string) =>
              rowsOf.map((link) => ({
                label: nameOf(other(link)),
                value: format(link.value),
                color: rows.nodes.find((node) => node.id === other(link))?.color ?? row.color,
              }));
            return {
              title: `${row.name}, ${format(row.value)}`,
              rows: [
                ...side(rows.links.filter(({ target }) => target === row.id), (link) => link.source),
                ...side(rows.links.filter(({ source }) => source === row.id), (link) => link.target),
              ],
            };
          },
        }
      : undefined;

    return defineChart({
      theme: THEME,
      marks,
      gradients: linksSlot?.gradient
        ? rows.links.map((row) => ({
            id: gradientId(row),
            // From where the flow starts, which is the right-hand edge in a right-to-left page.
            ...(vertical
              ? { x1: 0, y1: 0, x2: 0, y2: 1 }
              : row.from > row.to
                ? { x1: 1, y1: 0, x2: 0, y2: 0 }
                : { x1: 0, y1: 0, x2: 1, y2: 0 }),
            stops: [
              { offset: 0, color: row.color, ...(row.fade ? { opacity: row.fade[0] } : {}) },
              { offset: 1, color: row.endColor, ...(row.fade ? { opacity: row.fade[1] } : {}) },
            ],
          }))
        : [],
      // The layout has already worked in pixels, so both scales hand them straight through.
      scales: {
        x: { scale: scaleLinear([0, width], [0, 1]), nice: false, axis: false as const, grid: false as const },
        y: { scale: scaleLinear([height, 0], [0, 1]), nice: false, axis: false as const, grid: false as const },
      },
      guides: false,
      margin: 0,
      focusRing: false,
      motion: (context: ChartMotionContext<Row>) => {
        if (context.phase !== 'enter') {
          return { transition: { type: 'tween' as const, duration: 300, easing: 'ease-out' as const } };
        }
        const datum = context.datum;
        const layer = datum === undefined ? 0 : isNode(datum) || isLink(datum) ? datum.layer : datum.node.layer;
        return {
          delay: layer * staggerDelay,
          transition: { type: 'tween' as const, duration: animationDuration, easing: 'ease-out' as const },
        };
      },
      keyboard: interactive,
      pointer: interactive,
      focus: interactive ? routeFocus(rows.links, vertical, curve, nodesSlot?.interactive ?? false) : false,
      maxFocusDistance: Number.POSITIVE_INFINITY,
      ...(interactive && readout ? { tooltip: readout } : {}),
    });
  }, [rows, width, height, vertical, curve, loading, entering, nodeWidth, animationDuration, staggerDelay, size.rtl, linksSlot, nodesSlot, labelsSlot, tooltip, skeleton]);

  // Marks take their timing from the definition. This one is what the readout moves with.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const reportedId = useRef<string | null>(null);
  const latestActiveId = useLatest(activeId);
  const [askedParent, setAskedParent] = useState(0);

  /*
   * The chart only pins a reading for a tooltip, and the rows of a breakdown have
   * to stay put while the pointer travels to them. So the pin is held here: a
   * hover previews, and leaving comes back to whatever is pinned.
   */
  const pinnedRef = useRef<RowPoint | null>(null);
  const focusedRef = useRef<RowPoint | null>(null);

  const onFocusChange = (point: RowPoint | null) => {
    if (!point && pinnedRef.current) {
      interactionRef.current?.setControlledFocus(pinnedRef.current);
      return;
    }
    focusedRef.current = point;
    const next = readingOf(point?.datum);
    setReading((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    const id = next?.kind === 'node' ? next.id : null;
    if (reportedId.current !== id) {
      reportedId.current = id;
      if (id !== latestActiveId.current) onActiveIdChange?.(id);
      if (latestActiveId.current !== undefined) setAskedParent((count) => count + 1);
    }
  };

  const pin = useCallback((point: RowPoint | null) => {
    pinnedRef.current = point;
    interactionRef.current?.setControlledFocus(point);
  }, []);

  const select = useCallback(
    (id: string | null) => pin(id === null ? null : (pointsRef.current.find(({ datum }) => isNode(datum) && datum.id === id) ?? null)),
    [pin]
  );

  // A new definition, from a resize or new data, repaints without the focus marks.
  useEffect(() => {
    if (pinnedRef.current) interactionRef.current?.setControlledFocus(pinnedRef.current);
  }, [definition]);

  // The chart has no points until it has drawn, so a request can have to wait for them.
  const pendingId = useRef<string | null>(null);
  const request = useCallback(
    (id: string | null) => {
      const known = pointsRef.current.some(({ datum }) => isNode(datum) && datum.id === id);
      pendingId.current = id !== null && !known ? id : null;
      select(id);
    },
    [select]
  );

  // Only a change the chart has not already reported is a request to move it.
  useEffect(() => {
    if (activeId === undefined || activeId === reportedId.current) return;
    request(activeId);
  }, [activeId, request]);

  // A parent that kept its `activeId` has turned the change down, so the chart goes back to it.
  useEffect(() => {
    const id = latestActiveId.current;
    if (id !== undefined && id !== (reading?.kind === 'node' ? reading.id : null)) request(id);
    // Only once a change has been offered: `reading` moving by itself is that change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askedParent]);

  const drawnKey = useRef<string | null>(null);
  const resetKey = useRef<string | null>(null);

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => {
    setReading(null);
    reportedId.current = null;
    pinnedRef.current = null;
    focusedRef.current = null;
    // A new chart can draw before this runs or after it, and clearing the
    // reading has to come first, so whichever is second applies the request.
    resetKey.current = chartKey;
    const id = latestActiveId.current ?? null;
    if (drawnKey.current === chartKey) request(id);
    else pendingId.current = id;
  }, [chartKey, latestActiveId, request]);

  const context = useMemo<SankeyChartContextValue>(
    () => ({ rows, reading, status, select, setSlot }),
    [rows, reading, status, select, setSlot]
  );

  const summary = label ?? `Sankey chart, ${rows.nodes.length} ${rows.nodes.length === 1 ? 'stage' : 'stages'}`;
  const nameOf = (id: string) => rows.nodes.find((node) => node.id === id)?.name ?? id;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'sankey-chart',
        className: slotClasses.root({ className }),
        // On the root, so it also clears a reading from a row of the breakdown.
        onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Escape') pin(null);
        },
        children: (
          <>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {rows.links.map((row) => {
                  const input = links[row.input];
                  return (
                    <li key={row.key}>
                      {(input && labelForLink?.(input, row.input)) ??
                        `${nameOf(row.source)} to ${nameOf(row.target)}, ${row.value}`}
                    </li>
                  );
                })}
              </ul>
            )}
            <div
              ref={plotRef}
              data-slot="sankey-chart-plot"
              data-dimmed={linksSlot?.gradient && reading ? '' : undefined}
              className={slotClasses.plot()}
              style={{ height }}
              onClick={(event) => {
                const point = interactionRef.current?.resolvePointer(event.clientX, event.clientY)?.point ?? null;
                pin(point && point.key === pinnedRef.current?.key ? null : point);
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && focusedRef.current) {
                  event.preventDefault();
                  pin(focusedRef.current.key === pinnedRef.current?.key ? null : focusedRef.current);
                }
              }}
            >
              {width > 0 ? (
                <Chart
                  // An entrance only plays on a chart's first paint, so the flow
                  // arriving after a load, or a replay, is a new chart.
                  key={chartKey}
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  height={height}
                  initialWidth={width}
                  className={slotClasses.chart()}
                  onFocusChange={onFocusChange}
                  onRender={({ scene, interaction }) => {
                    interactionRef.current = interaction;
                    pointsRef.current = pointsOf(scene.nodes);
                    drawnKey.current = chartKey;
                    setEnteredKey(chartKey);
                    const pending = pendingId.current;
                    // Only once it can land: asking for a node that is not there clears the pin.
                    if (pending !== null && resetKey.current === chartKey && pointsRef.current.some(({ datum }) => isNode(datum) && datum.id === pending)) request(pending);
                  }}
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

  return <SankeyChartContext.Provider value={context}>{element}</SankeyChartContext.Provider>;
});
SankeyChartRoot.displayName = 'SankeyChart';

/**
 * The waiting shape: plain equal bars and ribbons. Varied thicknesses would be
 * an invented routing, and nobody can tell one from a real one until it changes.
 */
function skeletonMarks(width: number, height: number, vertical: boolean, bar: number, reach: number) {
  const along = vertical ? height : width;
  const cross = vertical ? width : height;
  const step = (along - bar) / Math.max(SKELETON_COLUMNS - 1, 1);
  const flip = <T,>(a: T, b: T): [T, T] => (vertical ? [b, a] : [a, b]);
  const blank = { value: 0, layer: 0, color: 'var(--muted)', endColor: 'var(--muted)', bar: true, onRow: false };
  const bars = Array.from({ length: SKELETON_COLUMNS }, (_unused, column): NodeRow => {
    const [x0, y0] = flip(column * step, cross / 6);
    const [x1, y1] = flip(column * step + bar, (cross * 5) / 6);
    return { ...blank, kind: 'node', key: `bar-${column}`, id: `bar-${column}`, name: '', x0, y0, x1, y1 };
  });
  const lane = cross / 6;
  const ribbons = Array.from({ length: SKELETON_COLUMNS - 1 }, (_unused, column) =>
    [cross / 3, (cross * 2) / 3].map((at, index): LinkRow => {
      const edges: Span = [at - lane / 2, at + lane / 2];
      return {
        ...blank,
        kind: 'link',
        key: `ribbon-${column}-${index}`,
        input: -1,
        source: '',
        target: '',
        from: column * step + bar,
        to: (column + 1) * step,
        start: edges,
        end: edges,
      };
    })
  ).flat();
  return [
    ribbonMark(ribbons, { id: 'sankey-skeleton-links', vertical, reach, fill: () => 'var(--muted)', still: true }),
    rect(bars, {
      id: 'sankey-skeleton-nodes',
      x1: (row: NodeRow) => row.x0,
      x2: (row: NodeRow) => row.x1,
      y1: (row: NodeRow) => row.y0,
      y2: (row: NodeRow) => row.y1,
      key: (row: NodeRow) => row.key,
      fill: 'var(--muted)',
      radius: 3,
      motion: false,
    }),
  ];
}

function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface SankeyChartLinksProps {
  /** Blend each ribbon from its source's colour to its target's, at rest as well as on a route. */
  gradient?: boolean;
  /** A ribbon's opacity at rest. Defaults to `0.09`, or `0.45` with `gradient`. */
  opacity?: number;
  /** A ribbon's opacity on the route being read. Defaults to `0.42`, or `0.8` with `gradient`. */
  activeOpacity?: number;
}

/**
 * The ribbons. Grey at rest, and in their source's colour on the route being
 * read. With `gradient` they keep their colours at rest, and a reading dims the rest.
 */
function SankeyChartLinks({ gradient = false, opacity = gradient ? 0.45 : 0.09, activeOpacity = gradient ? 0.8 : 0.42 }: SankeyChartLinksProps) {
  const { setSlot } = useChart('SankeyChart.Links');
  useEffect(() => {
    setSlot('links', { gradient, opacity, activeOpacity });
    return () => setSlot('links', undefined);
  }, [gradient, opacity, activeOpacity, setSlot]);
  return null;
}
SankeyChartLinks.displayName = 'SankeyChart.Links';

export interface SankeyChartNodesProps {
  /** Corner radius on a node's bar, in pixels. */
  radius?: number;
  /** A bar's opacity when it is off the route being read. */
  dimOpacity?: number;
  /** Whether hovering or pressing a bar reads its node. */
  interactive?: boolean;
}

/** The bars the ribbons run between, drawn over them so a node keeps a clean edge. */
function SankeyChartNodes({ radius = 3, dimOpacity = 0.25, interactive = true }: SankeyChartNodesProps) {
  const { setSlot } = useChart('SankeyChart.Nodes');
  useEffect(() => {
    setSlot('nodes', { radius, dimOpacity, interactive });
    return () => setSlot('nodes', undefined);
  }, [radius, dimOpacity, interactive, setSlot]);
  return null;
}
SankeyChartNodes.displayName = 'SankeyChart.Nodes';

export interface SankeyChartLabelsProps {
  /** Format the figure under a name. Defaults to a compact number. */
  formatValue?: (value: number, id: string) => string;
  /** Show the figure under the name. */
  showValue?: boolean;
  /** Hide the name on a bar shorter than this, in pixels. */
  minHeight?: number;
}

/**
 * The names, beside the bars. The last column's read inwards, so the names stay
 * inside the box at both ends. A name is shown whole or not at all: where two
 * would collide the larger stage keeps its name.
 */
function SankeyChartLabels({ formatValue, showValue = false, minHeight = 6 }: SankeyChartLabelsProps) {
  const { setSlot } = useChart('SankeyChart.Labels');
  const latest = useLatest({ formatValue });
  useEffect(() => {
    setSlot('labels', { showValue, minHeight, latest });
    return () => setSlot('labels', undefined);
  }, [showValue, minHeight, latest, setSlot]);
  return null;
}
SankeyChartLabels.displayName = 'SankeyChart.Labels';

export interface SankeyChartTooltipProps {
  /** Format the figures. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  /** Added to the readout's surface. */
  className?: string;
}

/** The figures in a popover beside what is being read. It covers some of the diagram; `Breakdown` does not. */
function SankeyChartTooltip({ formatValue, className }: SankeyChartTooltipProps) {
  const { setSlot } = useChart('SankeyChart.Tooltip');
  const latest = useLatest({ formatValue });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
SankeyChartTooltip.displayName = 'SankeyChart.Tooltip';

/** The waiting shape, drawn while `status` is `loading`. */
function SankeyChartSkeleton() {
  const { setSlot } = useChart('SankeyChart.Skeleton');
  useEffect(() => {
    setSlot('skeleton', true);
    return () => setSlot('skeleton', undefined);
  }, [setSlot]);
  return null;
}
SankeyChartSkeleton.displayName = 'SankeyChart.Skeleton';

export interface SankeyChartBreakdownProps extends ComponentProps<'div'> {
  /** Format the figures. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  /** How many rows each side shows before stopping. */
  maxRows?: number;
  /** Fires with the node at the other end of a row, as the chart follows it there. */
  onSelectNode?: (id: string) => void;
  /** The heading over the stages nothing arrives at, while nothing is being read. */
  startsTitle?: ReactNode;
  /** The heading over the stages nothing leaves, while nothing is being read. */
  endsTitle?: ReactNode;
  /** The heading over what arrives at the stage being read. */
  sourcesTitle?: ReactNode;
  /** The heading over what leaves the stage being read. */
  targetsTitle?: ReactNode;
}

/**
 * Optional: leave it out for the diagram alone. What is being read, written out
 * under the diagram: where each stream came from and where it went, or where the
 * whole flow starts and ends while nothing is. A row selects the node it names,
 * so a flow can be walked one stage at a time.
 */
function SankeyChartBreakdown({
  formatValue,
  maxRows,
  onSelectNode,
  startsTitle = 'Sources',
  endsTitle = 'Outcomes',
  sourcesTitle = 'From',
  targetsTitle = 'To',
  className,
  render,
  style,
  ...props
}: SankeyChartBreakdownProps & RenderProp<'div'>) {
  const { rows, status, select } = useChart('SankeyChart.Breakdown');
  const { activeId, activeLink, sources, targets, starts, ends } = useSankeyChart();
  const slots = sankeyChartVariants();
  const format = formatValue ?? compactNumber;
  const limit = maxRows && maxRows > 0 ? Math.floor(maxRows) : undefined;

  // Held at the tallest stage's height, so reading one does not move the page under the pointer.
  const tallest = useMemo(() => {
    let most = 1;
    for (const node of rows.nodes) {
      most = Math.max(
        most,
        rows.links.filter(({ source }) => source === node.id).length,
        rows.links.filter(({ target }) => target === node.id).length
      );
    }
    most = Math.max(most, starts.length, ends.length);
    // Past the limit, "and N more" takes a row of its own.
    return limit && most > limit ? limit + 1 : most;
  }, [rows, starts, ends, limit]);

  const flowRow = (flow: SankeyChartFlow, showShare: boolean) => (
    <button
      key={flow.id}
      type="button"
      className={slots.breakdownRow()}
      onClick={(event) => {
        // This row is about to be replaced, and focus would fall out of the chart with it.
        event.currentTarget.closest<HTMLElement>('[data-slot="sankey-chart-breakdown"]')?.focus();
        select(flow.id);
        onSelectNode?.(flow.id);
      }}
    >
      <span className={slots.swatch()} style={{ background: flow.color }} />
      <span className={slots.rowLabel()}>{flow.label}</span>
      <span className={slots.rowValue()}>{format(flow.value)}</span>
      {showShare ? <span className={slots.rowShare()}>{Math.round(flow.share * 100)}%</span> : null}
    </button>
  );

  const side = (title: ReactNode, flows: SankeyChartFlow[]) => {
    const shown = limit ? flows.slice(0, limit) : flows;
    const rest = flows.length - shown.length;
    return (
      <div className={slots.breakdownSide()}>
        <div className={slots.breakdownTitle()}>{title}</div>
        {shown.map((flow) => flowRow(flow, true))}
        {rest > 0 ? <div className={slots.breakdownPlaceholder()}>{`and ${rest} more`}</div> : null}
      </div>
    );
  };

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'sankey-chart-breakdown',
        'aria-live': 'polite' as const,
        tabIndex: -1,
        className: slots.breakdown({ className }),
        // A row is 1.625rem with its gap, the heading over a side about as much, and 0.75rem pads the top.
        style: { minHeight: `${(tallest + 1) * 1.625 + 0.8125}rem`, ...style },
        children: activeLink ? (
          <div className={slots.breakdownSides()}>
            <div className={slots.breakdownSide()}>
              <div className={slots.breakdownTitle()}>{sourcesTitle}</div>
              {flowRow(activeLink.source, true)}
            </div>
            <div className={slots.breakdownSide()}>
              <div className={slots.breakdownTitle()}>{targetsTitle}</div>
              {flowRow(activeLink.target, true)}
            </div>
          </div>
        ) : activeId ? (
          <div className={slots.breakdownSides()}>
            {side(sourcesTitle, sources)}
            {side(targetsTitle, targets)}
          </div>
        ) : (
          <div className={slots.breakdownSides()}>
            {side(startsTitle, starts)}
            {side(endsTitle, ends)}
          </div>
        ),
      },
      props
    ),
  });

  return status === 'loading' || !rows.nodes.length ? null : element;
}
SankeyChartBreakdown.displayName = 'SankeyChart.Breakdown';

export interface SankeyChartLegendProps extends ComponentProps<'div'> {
  /** How many names to show before stopping. */
  limit?: number;
  /** Show each node's share of the largest column's total beside its name. */
  showShare?: boolean;
}

/**
 * Optional: every stage named under the diagram, and a way to reach a bar too
 * small to carry a name. Pressing one selects the node its bar would.
 */
function SankeyChartLegend({ limit, showShare = true, className, render, ...props }: SankeyChartLegendProps & RenderProp<'div'>) {
  const { rows, status, reading, select } = useChart('SankeyChart.Legend');
  const slots = sankeyChartVariants();
  const activeId = reading?.kind === 'node' ? reading.id : null;

  // Against the largest column rather than every node, which counts what passes through twice.
  const byLayer = new Map<number, number>();
  for (const node of rows.nodes) byLayer.set(node.layer, (byLayer.get(node.layer) ?? 0) + node.value);
  const total = Math.max(0, ...byLayer.values());
  const shown = limit && limit > 0 ? rows.nodes.slice(0, Math.floor(limit)) : rows.nodes;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'sankey-chart-legend',
        className: slots.legend({ className }),
        children: shown.map((node) => (
          <button
            key={node.id}
            type="button"
            aria-pressed={activeId === node.id}
            data-dimmed={activeId !== null && activeId !== node.id ? '' : undefined}
            className={slots.legendItem()}
            onClick={() => select(activeId === node.id ? null : node.id)}
          >
            <span className={slots.swatch()} style={{ background: node.color }} />
            <span className={slots.legendLabel()}>{node.name}</span>
            {showShare ? <span className={slots.legendShare()}>{total > 0 ? Math.round((node.value / total) * 100) : 0}%</span> : null}
          </button>
        )),
      },
      props
    ),
  });

  return status === 'loading' || !rows.nodes.length ? null : element;
}
SankeyChartLegend.displayName = 'SankeyChart.Legend';

export interface SankeyChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the flow is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a caveat. */
  caption?: ReactNode;
  /** Trailing slot: a control, a badge, a range picker. */
  children?: ReactNode;
}

/**
 * The strip above the diagram. The value is not derived, because 128400 is a
 * count, a currency or a rate depending on what was routed. A readout that
 * follows the pointer takes it from `useSankeyChart` and passes the string down.
 */
function SankeyChartHeader({ title, value, caption, className, children, render, ...props }: SankeyChartHeaderProps & RenderProp<'div'>) {
  const slots = sankeyChartVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'sankey-chart-header',
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
SankeyChartHeader.displayName = 'SankeyChart.Header';

export const SankeyChart = Object.assign(SankeyChartRoot, {
  Header: SankeyChartHeader,
  Links: SankeyChartLinks,
  Nodes: SankeyChartNodes,
  Labels: SankeyChartLabels,
  Tooltip: SankeyChartTooltip,
  Breakdown: SankeyChartBreakdown,
  Legend: SankeyChartLegend,
  Skeleton: SankeyChartSkeleton,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  SankeyChartHeader,
  SankeyChartLinks,
  SankeyChartNodes,
  SankeyChartLabels,
  SankeyChartTooltip,
  SankeyChartBreakdown,
  SankeyChartLegend,
  SankeyChartSkeleton,
};
