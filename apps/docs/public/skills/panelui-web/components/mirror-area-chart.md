# Mirror Area Chart

Two readings of one timeline, one above a baseline and one below it.

```tsx
import { MirrorAreaChart } from "@/components/panelui/mirror-area-chart"
```

From npm the path is `panelui-web/mirror-area-chart`. Install with `npx shadcn@latest add @panelui/mirror-area-chart`.

## When to use it

Use it to show two readings of one timeline, one above a baseline and one below it: jobs and the share that were urgent, requests and their latency. Each half has its own scale, so the two can be in different units and a peak in one still lines up with whatever the other did at that moment.

The heights of the two halves cannot be compared with each other, only their shapes over time. For several series in one unit, use an area chart. For values above and below zero on one scale, use a [bar chart](/docs/web/charts/bar-chart) or a line chart.

## Usage

```tsx
<MirrorAreaChart data={load} xDataKey="time">
  <MirrorAreaChart.Grid />
  <MirrorAreaChart.Area dataKey="jobs" label="Jobs" />
  <MirrorAreaChart.Area dataKey="share" label="% high" side="bottom" color="chart-3" />
  <MirrorAreaChart.Baseline />
  <MirrorAreaChart.XAxis />
  <MirrorAreaChart.Tooltip />
</MirrorAreaChart>
```

## Parts

```tsx
<MirrorAreaChart data={…}>
  <MirrorAreaChart.Header />
  <MirrorAreaChart.Grid />
  <MirrorAreaChart.Area dataKey="…" />
  <MirrorAreaChart.Baseline />
  <MirrorAreaChart.Skeleton />
  <MirrorAreaChart.XAxis />
  <MirrorAreaChart.YAxis />
  <MirrorAreaChart.Legend />
  <MirrorAreaChart.Tooltip />
</MirrorAreaChart>
```

- `MirrorAreaChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the series key or your own control on the trailing side.
- `MirrorAreaChart.Grid` — The texture behind the bands. `dots` is a field of points with one row on the baseline. `lines` is dashed rules across each half, and `spacing` is then how many each half gets.
- `MirrorAreaChart.Area` — One band, on the `side` you give it. Bands on one side overlay in the order they are declared, so declare a whole before a part of it.
- `MirrorAreaChart.Baseline` — The line both halves grow away from, drawn over the bands.
- `MirrorAreaChart.Skeleton` — A low band either side of the baseline, with a highlight moving along it, drawn only while `status` is `loading`.
- `MirrorAreaChart.XAxis` — The x labels, each on its own point. `ticks` is how many, evenly spaced with both ends kept.
- `MirrorAreaChart.YAxis` — Three labels: the top half's maximum, zero on the baseline, and the bottom half's maximum, each with its own format.
- `MirrorAreaChart.Legend` — A swatch and a name per band, top half first, over the top corner of the plot. On a chart with a header, use the header's `legend` prop instead.
- `MirrorAreaChart.Tooltip` — The readout, and what drives it. It adds a dashed crosshair and a dot on the outer edge of the top half, and it covers the plot, so the pointer can be anywhere.

## Props

`MirrorAreaChart`, `MirrorAreaChart.Header` and `MirrorAreaChart.Legend` also take the props of the element they render, and a `className`. `MirrorAreaChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `MirrorAreaChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly MirrorAreaChartDatum[]` | **required** | The rows. Each one is a point along the x-axis. |
| `xDataKey` | `string` | `'date'` | Key holding the x label. Used by the axis and the readout. |
| `split` | `number` | `0.55` | How much of the plot's height sits above the baseline, from `0` to `1`. Give the half you want read first the larger share. |
| `topDomain` | `[number, number]` | — | Fix the top half's scale instead of deriving it from the data. Only the upper end is used: the baseline is always zero. |
| `bottomDomain` | `[number, number]` | — | Fix the bottom half's scale. Only the upper end is used. |
| `curve` | `MirrorAreaChartCurve` | `'monotone'` | `monotone` never overshoots between points; `linear` joins them straight. |
| `status` | `MirrorAreaChartStatus` | `'ready'` | `loading` holds the bands back and grows them out when it turns `ready`. Add a `MirrorAreaChart.Skeleton` to show something meanwhile. |
| `aspectRatio` | `number` | `1.6` | The plot's width ÷ height. |
| `animationDuration` | `number` | `700` | Milliseconds for the bands to grow out. |
| `domainDuration` | `number` | `500` | Milliseconds for the bands to settle after the data changes. |
| `onActiveIndexChange` | `(index: number, datum: MirrorAreaChartDatum \| null) => void` | — | The row being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding so the bands reach the edges, for a sparkline. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: MirrorAreaChartDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its keys and values. |

#### `MirrorAreaChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `'dots' \| 'lines'` | `'dots'` | `dots` is a field of points; `lines` is dashed rules across each half. |
| `spacing` | `number` | — | Distance between dots in pixels, or how many rules each half gets. |
| `opacity` | `number` | `1` | Opacity of the dots or the rules. |
| `color` | `MirrorAreaChartColor` | — | Which of the theme's roles they are drawn in. Defaults to the border colour. |

#### `MirrorAreaChartBaselineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `MirrorAreaChartColor` | `'muted-foreground'` | Which of the theme's roles the line is drawn in. |
| `strokeWidth` | `number` | `1` | The line's width. |
| `opacity` | `number` | `0.5` | The line's opacity. |

#### `MirrorAreaChartAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. A missing value leaves a gap. |
| `side` | `MirrorAreaChartSide` | `'top'` | Which half it is drawn in. |
| `label` | `string` | — | The name shown by the readout and the legend. Defaults to `dataKey`. |
| `color` | `MirrorAreaChartColor` | `'chart-1'` | Which of the theme's roles it is drawn in. |
| `muted` | `boolean` | `false` | Draw it in the muted foreground colour instead, for a total that the coloured areas are parts of. |
| `fillOpacity` | `number` | — | Opacity of the fill at the band's outer edge. |
| `gradientToOpacity` | `number` | — | Opacity of the fill at the baseline. Defaults to `fillOpacity`, a flat fill. |
| `showLine` | `boolean` | `true` | Draw the line along the band's outer edge. |
| `strokeWidth` | `number` | `1.5` | Thickness of that line. |

#### `MirrorAreaChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | `1400` | Milliseconds for one pass of the sweep. |
| `color` | `MirrorAreaChartColor` | — | Which of the theme's roles the band is drawn in, under the highlight. Defaults to the muted colour. |

#### `MirrorAreaChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | How many labels to show, evenly spaced with both ends kept. |
| `format` | `(datum: MirrorAreaChartDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |

#### `MirrorAreaChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatTop` | `(value: number) => string` | — | Format a value in the top half. |
| `formatBottom` | `(value: number) => string` | — | Format a value in the bottom half. |

#### `MirrorAreaChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `MirrorAreaChartColor` | `'foreground'` | The crosshair's and the dot's colour, as one of the theme's roles. |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: MirrorAreaChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `formatSummary` | `(datum: MirrorAreaChartDatum) => string` | — | One line to show instead of a row per series. Use it when the series only make sense read together. |
| `className` | `string` | — | Added to the readout's surface. |

#### `MirrorAreaChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a total. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per area along the trailing edge. |

## In a Server Component

`MirrorAreaChart` is a client component. A Server Component cannot read `MirrorAreaChart.Header` off the import, so import each part by name: `MirrorAreaChartHeader`, `MirrorAreaChartGrid`, `MirrorAreaChartArea`, `MirrorAreaChartBaseline`, `MirrorAreaChartSkeleton`, `MirrorAreaChartXAxis`, `MirrorAreaChartYAxis`, `MirrorAreaChartTooltip`, `MirrorAreaChartLegend`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone, so a header does not shrink it. The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### The two scales

Each half's scale runs from zero at the baseline to its largest value, with some headroom. `topDomain` and `bottomDomain` fix them, and need both ends finite. Only the upper end is used.

A negative value is drawn on the baseline, because each half only grows away from it. A row with no number for a series leaves a gap in that band.

#### Colour

`color` on `MirrorAreaChart.Area` names a role in the theme. Every band defaults to `chart-1`, so give the others their own. `muted` draws a total in the muted foreground, behind the coloured part of it.

#### Reading a point

With a `Tooltip`, hovering the plot reads the nearest row. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the rows it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the row changes, not on every frame, so it can drive a readout outside the chart. Inside the chart, `useMirrorAreaChart` gives the same row.

#### Keyboard

With a `Tooltip`, the plot takes focus. The arrow keys move between rows, Home and End go to the first and last, Enter or Space pins the reading, and Escape clears it.

#### Screen readers

Each row is given as text beside the drawing. `label` names the chart and `labelForDatum` writes a row, for values with a unit. Without them a row is read as its keys and values.

#### Reduced motion

With reduced motion set, the bands appear at their final values, and the skeleton's highlight is not drawn.

## Example

```tsx
'use client';

import { useState } from 'react';
import { MirrorAreaChart } from '@/components/panelui/mirror-area-chart';

const LOAD = [
  { time: '09:00', jobs: 420, high: 96, share: 23 },
  { time: '10:00', jobs: 560, high: 148, share: 26 },
  { time: '11:00', jobs: 780, high: 264, share: 34 },
  { time: '12:00', jobs: 640, high: 186, share: 29 },
  { time: '13:00', jobs: 720, high: 302, share: 42 },
  { time: '14:00', jobs: 910, high: 446, share: 49 },
  { time: '15:00', jobs: 850, high: 357, share: 42 },
  { time: '16:00', jobs: 610, high: 183, share: 30 },
];

export default function MirrorAreaChartOverview() {
  const [active, setActive] = useState<(typeof LOAD)[number] | null>(null);
  const shown = active ?? LOAD[LOAD.length - 1];

  return (
    <MirrorAreaChart
      data={LOAD}
      xDataKey="time"
      className="max-w-xl"
      label="Jobs per hour above the baseline, and the share that were high priority below it"
      onActiveIndexChange={(index) => setActive(LOAD[index] ?? null)}
    >
      <MirrorAreaChart.Header title="Queue" value={`${shown.jobs} jobs`} caption={`${shown.share}% high priority at ${shown.time}`} legend />
      <MirrorAreaChart.Grid />
      <MirrorAreaChart.Area dataKey="jobs" label="Jobs" muted />
      <MirrorAreaChart.Area dataKey="high" label="High priority" />
      <MirrorAreaChart.Area dataKey="share" label="% high" side="bottom" color="chart-3" />
      <MirrorAreaChart.Baseline />
      <MirrorAreaChart.XAxis />
      <MirrorAreaChart.Tooltip formatValue={(value, key) => (key === 'share' ? `${value}%` : String(value))} />
    </MirrorAreaChart>
  );
}
```
