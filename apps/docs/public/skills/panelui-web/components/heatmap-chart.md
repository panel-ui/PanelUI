# Heatmap Chart

A calendar of bins, shaded by how much happened in each.

```tsx
import { HeatmapChart } from "@/components/panelui/heatmap-chart"
```

From npm the path is `panelui-web/heatmap-chart`. Install with `npx shadcn@latest add @panelui/heatmap-chart`.

## When to use it

Use it to show when something was busy, across many days: commits, spending, requests per hour. Each column is a period, usually a week, and each row a bin inside it, usually a day. The shade carries the count.

It does not suit reading exact values. Use it to find where to look, and the tooltip or a [Bar Chart](/docs/web/charts/bar-chart) to say how much.

## Usage

```tsx
<HeatmapChart data={weeks}>
  <HeatmapChart.XAxis />
  <HeatmapChart.YAxis />
  <HeatmapChart.Cells />
  <HeatmapChart.Tooltip />
  <HeatmapChart.Legend />
</HeatmapChart>
```

## Parts

```tsx
<HeatmapChart data={…}>
  <HeatmapChart.Header />
  <HeatmapChart.XAxis />
  <HeatmapChart.YAxis />
  <HeatmapChart.Separator />
  <HeatmapChart.Cells />
  <HeatmapChart.Tooltip />
  <HeatmapChart.Legend />
</HeatmapChart>
```

- `HeatmapChart.Header` — The strip above the grid: `title`, `value` and `caption`, with the ramp or your own control on the trailing side.
- `HeatmapChart.XAxis` — Month labels above the grid, one where the month changes. `labels` puts your own over each column.
- `HeatmapChart.YAxis` — Weekday labels beside the grid. The grid is sized around its `width`.
- `HeatmapChart.Separator` — Vertical rules that group the columns, behind the cells.
- `HeatmapChart.Cells` — The grid. Without this part no cells are drawn.
- `HeatmapChart.Tooltip` — Makes the grid readable by pointer and keyboard, and shows a line for the cell being read.
- `HeatmapChart.Legend` — The key under the grid: `lessLabel`, the five steps of the ramp, `moreLabel`.

## Props

`HeatmapChart`, `HeatmapChart.Header`, `HeatmapChart.XAxis`, `HeatmapChart.YAxis` and `HeatmapChart.Legend` also take the props of the element they render, and a `className`. `HeatmapChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `HeatmapChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly HeatmapColumn[]` | **required** | One column per period, with its row bins inside. `buildHeatmapCalendar` makes these from dated counts. |
| `layout` | `HeatmapLayout` | `'fluid'` | `fluid` draws cells at `binSize`, and the chart is as wide as that needs. Put it in a horizontal scroller for a full year. `fill` divides the available width between the columns instead. |
| `binSize` | `number` | `12` | Side of one cell in `fluid` layout, in pixels. |
| `gap` | `number` | `3` | Space between cells, in pixels. |
| `cornerRadius` | `number` | `2` | Corner radius of a cell. |
| `weekStartDay` | `number` | `0` | Which weekday is the top row. `0` is Sunday. The labels follow it. |
| `rows` | `number` | `7` | Rows per column. Seven for a calendar, twenty-four for a grid of hours. |
| `levels` | `readonly number[]` | — | The four counts at which the ramp steps up. Derived from the data's quartiles when omitted. |
| `levelColors` | `readonly string[]` | — | Five colours, empty first, that replace the derived ramp. |
| `color` | `string` | — | The colour of the busiest cells, with the quieter levels the same colour at lower opacity. A theme role, a token by name, or any CSS colour. Defaults to `chart-1`. |
| `emptyColor` | `string` | — | The colour of a cell with nothing in it. Takes the same values as `color`. Defaults to the muted surface. |
| `levelOpacity` | `readonly number[]` | — | Opacity of the base colour at each of the five levels, quietest first. Ignored when `levelColors` is given. |
| `animationDuration` | `number` | `900` | Milliseconds for the reveal on mount. `0` draws the chart at once. |
| `inactiveOpacity` | `number` | `1` | Opacity of every cell other than the one being read. |
| `onActiveCellChange` | `(cell: HeatmapCell \| null) => void` | — | The cell being read as it changes, and `null` when there is none. For a readout outside the chart. Reading needs `HeatmapChart.Tooltip`; `formatLabel={() => ''}` hides its line. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `formatCellLabel` | `(cell: HeatmapCell) => string \| null \| undefined` | — | What a screen reader says for one cell, in the list of days and as the keyboard reaches it. Return nothing to leave a cell out of the list. Defaults to its count and date, and days outside the calendar's range are left out. |

#### `HeatmapChartCellsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cornerRadius` | `number` | `2` | Corner radius of a cell. Falls back to the chart's. |

#### `HeatmapChartSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `every` | `'quarter' \| number` | `'quarter'` | `quarter` draws a rule every thirteen columns, and a number one every that many columns. |
| `color` | `string` | — | A theme role, a token by name, or any CSS colour. Defaults to the border colour. |
| `dashArray` | `string` | — | Dash pattern, such as `"2,4"`. Omit it for a solid rule. |

#### `HeatmapChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatLabel` | `(date: Date, column: number) => string` | — | Label a column, given the first dated bin in it. Return an empty string to leave it unlabelled. |
| `labels` | `readonly string[]` | — | Column labels, left to right, for a grid whose columns are not weeks. Overrides the month names. |

#### `HeatmapChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `width` | `number` | `26` | Width reserved for the labels, in pixels. The grid is sized around it. |
| `tickFilter` | `'all' \| 'odd' \| 'even'` | `'odd'` | Which rows get a label. Every other row is the usual choice. |
| `labelFormat` | `'initial' \| 'full'` | `'full'` | `initial` is the single letter, and `full` the abbreviated name. |
| `labels` | `readonly string[]` | — | Row labels, top to bottom, used as they are. For localised weekdays, or rows that are not days. |

#### `HeatmapChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatLabel` | `(cell: HeatmapCell) => string` | — | The line shown for a cell, including a cell with no date. Defaults to the count and the date. |
| `className` | `string` | — | Added to the readout's surface. |

#### `HeatmapChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `lessLabel` | `string` | `'Less'` | Text at the low end of the ramp. |
| `moreLabel` | `string` | `'More'` | Text at the high end. |
| `swatchSize` | `number` | — | Side of a swatch, in pixels. Defaults to the chart's cell size, and at least 10. |

#### `HeatmapChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the grid is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a total, the cell being read. |
| `legend` | `boolean` | `false` | Draw the ramp along the trailing edge. For a grid that scrolls, where a legend under the cells would scroll away. |
| `lessLabel` | `string` | `'Less'` | Text at the low end of the ramp, when `legend` is set. |
| `moreLabel` | `string` | `'More'` | Text at the high end. |

## In a Server Component

`HeatmapChart` is a client component. A Server Component cannot read `HeatmapChart.Header` off the import, so import each part by name: `HeatmapChartHeader`, `HeatmapChartCells`, `HeatmapChartSeparator`, `HeatmapChartXAxis`, `HeatmapChartYAxis`, `HeatmapChartTooltip`, `HeatmapChartLegend`.

## Notes

#### Sizing

A `fluid` chart is as wide as its cells need, and its height always follows from the cell size and `rows`. A `fill` chart fits its container's width, so a long range makes small cells. Cells narrower than about 6 pixels are hard to point at. For those, use `fluid` in a scroller.

#### The ramp

The levels come from the quartiles of the non-zero counts, so small and large numbers both use the whole ramp. Pass `levels` to fix the thresholds, for instance to compare two charts on one scale.

#### Reading

A mouse reads the cell under it. A click or a tap pins the reading, and pressing the same cell again clears it. A swipe does not read a cell, so a scroller around the chart still scrolls. Once the grid has focus, the arrow keys walk it, Home and End go to the ends of a row, and Escape clears the reading. All of this comes from `HeatmapChart.Tooltip`.

#### Accessibility

The chart renders a list of its days for a screen reader, and announces the cell being read. The default label is a count of contributions and a date, so pass `formatCellLabel` when the cells count something else, and `label` to name the chart. A year is a long list, so return nothing from `formatCellLabel` for days that have nothing to say.

With reduced motion set, or `animationDuration={0}`, the grid draws at once with no reveal.

#### Building the weeks

`buildHeatmapCalendar` turns dated counts into `weeks`. It comes from the chart's client entry, so a Server Component cannot call it. Call it in a client file, and pass dates and counts from the server as props.

## Example

```tsx
'use client';

import { HeatmapChart, buildHeatmapCalendar } from '@/components/panelui/heatmap-chart';

const activity = (date: Date) => {
  const day = date.getDate() + date.getMonth() * 31;
  const wave = Math.sin(day / 9) + Math.sin(day / 2.3);
  return date.getDay() % 6 === 0 ? 0 : Math.max(0, Math.round((wave + 1.2) * 4));
};

const START = new Date(2026, 0, 1);
const DAYS = Array.from({ length: 180 }, (_unused, index) => new Date(2026, 0, 1 + index));
const WEEKS = buildHeatmapCalendar(
  DAYS.map((date) => ({ date, count: activity(date) })),
  { start: START, end: DAYS.at(-1) }
);
const TOTAL = DAYS.reduce((sum, date) => sum + activity(date), 0);

export default function HeatmapChartOverview() {
  return (
    <HeatmapChart data={WEEKS} layout="fill" className="w-full max-w-2xl">
      <HeatmapChart.Header title="Contributions" value={TOTAL.toLocaleString('en-US')} caption="January to June" />
      <HeatmapChart.XAxis />
      <HeatmapChart.YAxis />
      <HeatmapChart.Cells />
      <HeatmapChart.Tooltip />
      <HeatmapChart.Legend />
    </HeatmapChart>
  );
}
```
