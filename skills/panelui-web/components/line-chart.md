# Line Chart

A series over time, drawn in from the left.

```tsx
import { LineChart } from "@/components/panelui/line-chart"
```

From npm the path is `panelui-web/line-chart`. Install with `npx shadcn@latest add @panelui/line-chart`.

## When to use it

Use it to show how a value moved over time: visits per week, response time per hour. Each row of `data` is a point, and each `LineChart.Line` is a series drawn from one of its keys.

The grid, the fill, the axes, the legend and the readout are separate parts, so a chart has only the ones you write.

The value axis fits the data and does not have to reach zero, so a small change stays visible. To compare sizes, use a [bar chart](/docs/web/charts/bar-chart).

## Usage

```tsx
<LineChart data={visits} xDataKey="date">
  <LineChart.Grid />
  <LineChart.Area dataKey="visits" />
  <LineChart.Line dataKey="visits" />
  <LineChart.XAxis />
  <LineChart.Tooltip />
</LineChart>
```

## Parts

```tsx
<LineChart data={…}>
  <LineChart.Header />
  <LineChart.Grid />
  <LineChart.Area dataKey="…" />
  <LineChart.Line dataKey="…" />
  <LineChart.ReferenceLine y={…} />
  <LineChart.Marker index={…} />
  <LineChart.Skeleton />
  <LineChart.XAxis />
  <LineChart.YAxis />
  <LineChart.Legend />
  <LineChart.Tooltip />
</LineChart>
```

- `LineChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the series key or your own control on the trailing side.
- `LineChart.Grid` — Lines across the value axis, in the theme's border colour. `rows` is roughly how many: the axis picks round numbers near it.
- `LineChart.Area` — The fill under a series, fading to nothing at the bottom of the plot. It always draws under the lines.
- `LineChart.Line` — One series. Declare one per key. A later `Line` draws over an earlier one.
- `LineChart.ReferenceLine` — A rule across the plot at the value `y`: a budget, an average, a target. It counts toward the value axis, and `label` writes text above its left end.
- `LineChart.Marker` — A rule down the plot at the row `index`: a release, the day something ran out. `label` writes text beside its top.
- `LineChart.Skeleton` — A flat rule where the series will be, with a highlight moving along it, drawn only while `status` is `loading`.
- `LineChart.XAxis` — The x labels, each on its own point. `ticks` is how many, evenly spaced with both ends kept.
- `LineChart.YAxis` — Value labels on the grid lines, in round numbers, with room made for them.
- `LineChart.Legend` — A swatch and a name per line, over the top corner of the plot. On a chart with a header, use the header's `legend` prop instead.
- `LineChart.Tooltip` — The readout, and what drives it. It adds the crosshair and a dot on every line, and it covers the plot, so the pointer can be anywhere. `showLabel={false}` drops the popover.

## Props

`LineChart`, `LineChart.Header` and `LineChart.Legend` also take the props of the element they render, and a `className`. `LineChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `LineChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly LineChartDatum[]` | **required** | The rows. Each one is a point along the x-axis. |
| `xDataKey` | `string` | `'date'` | Key holding the x label. Used by the axis and the readout. |
| `status` | `LineChartStatus` | `'ready'` | `loading` holds the series back and draws them in when it turns `ready`. Add a `LineChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `2` | The plot's width ÷ height. `2` is the wide card shape; `1.6` suits a narrow column. |
| `animationDuration` | `number` | `700` | Milliseconds for the reveal. |
| `domainDuration` | `number` | `500` | Milliseconds for the points and the axis to settle after the data changes. |
| `yDomain` | `[number, number]` | — | Fix the value axis instead of deriving it from the data. |
| `curve` | `LineChartCurve` | `'monotone'` | `monotone` never overshoots between points; `linear` joins them straight; `step` holds each value until the next, for a balance that moves on the day money does. |
| `onActiveIndexChange` | `(index: number, datum: LineChartDatum \| null) => void` | — | The point being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding so the line reaches the edges, for a sparkline. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: LineChartDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its keys and values. |

#### `LineChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `4` | Roughly how many lines to draw across the value axis. |
| `dashArray` | `string` | `'4 6'` | The stroke's dash pattern. Omit for the default dash, `"none"` for a solid rule. |
| `opacity` | `number` | `1` | Opacity of the lines. |
| `color` | `LineChartColor` | — | A role in the theme, or any CSS colour, for the lines. Defaults to the border colour. |

#### `LineChartLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. A missing value leaves a gap. |
| `color` | `LineChartColor` | `'chart-1'` | A role in the theme, or any CSS colour, for the series. |
| `strokeWidth` | `number` | `2.5` | The stroke's width. |
| `dashArray` | `string` | — | The stroke's dash pattern, such as `"6 4"`, for a projection or a secondary series. |
| `showMarkers` | `boolean` | `false` | A dot at every point. Best kept for short series. |
| `curve` | `LineChartCurve` | — | Defaults to the chart's `curve`. `step` beside a smooth series draws a balance against its plan. |

#### `LineChartAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. |
| `color` | `LineChartColor` | `'chart-1'` | A role in the theme, or any CSS colour, for the fill. |
| `opacity` | `number` | `0.18` | Opacity at the line. It fades to nothing at the bottom of the plot. |

#### `LineChartReferenceLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `y` | `number` | **required** | The value to draw the rule at. It counts toward the value axis. |
| `color` | `LineChartColor` | `'foreground'` | A role in the theme, or any CSS colour, for the rule and its label. |
| `dashArray` | `string` | `'3 4'` | The stroke's dash pattern. |
| `label` | `string` | — | Text above the rule's left end. |

#### `LineChartMarkerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `index` | `number` | **required** | The row to draw the rule at, counted from `0`. |
| `color` | `LineChartColor` | `'muted-foreground'` | A role in the theme, or any CSS colour, for the rule and its label. |
| `dashArray` | `string` | `'2 3'` | The stroke's dash pattern. |
| `label` | `string` | — | Text beside the rule's top. It moves to the left of a rule near the right edge. |

#### `LineChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | `1400` | Milliseconds for one pass of the sweep. |
| `color` | `LineChartColor` | — | A role in the theme, or any CSS colour, for the rule under the highlight. Defaults to the muted colour. |

#### `LineChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | How many labels to show, evenly spaced with both ends kept. |
| `format` | `(datum: LineChartDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |

#### `LineChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | Roughly how many labels to show. Give it the same number as `Grid`'s `rows`. |
| `format` | `(value: number) => string` | — | Format a value for its label. Defaults to a compact number. |

#### `LineChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `LineChartColor` | `'foreground'` | The crosshair's colour: a role in the theme, or any CSS colour. |
| `showLabel` | `boolean` | `true` | Draw the popover. Without it the crosshair and dots still follow the reading, for a readout in the header. |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: LineChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `className` | `string` | — | Added to the readout's surface. |

#### `LineChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys. |

#### `LineChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a total. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. Prefer this to `LineChart.Legend` on a chart that has a header: the legend sits over the plot, in a corner the lines also want. |

## In a Server Component

`LineChart` is a client component. A Server Component cannot read `LineChart.Header` off the import, so import each part by name: `LineChartHeader`, `LineChartGrid`, `LineChartArea`, `LineChartLine`, `LineChartReferenceLine`, `LineChartMarker`, `LineChartSkeleton`, `LineChartXAxis`, `LineChartYAxis`, `LineChartTooltip`, `LineChartLegend`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone, so a header does not shrink it. The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### The value axis

The derived axis spans every `Line` and `Area`, with some headroom, rounded to numbers worth labelling. `yDomain` fixes it, which is the way to hold it steady across charts or to bring zero in.

#### Bundle size

The chart adds about 65 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Colour

`color` on any part takes a role in the theme or any CSS colour. A role follows light and dark on its own, and a CSS colour stays as you give it. Every series defaults to `chart-1`, so give the others their own.

#### Reading a point

With a `Tooltip`, hovering the plot reads the nearest point. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the points it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the point changes, not on every frame, so it can drive a readout outside the chart, as the first example does. Inside the chart, `useLineChart` gives the same point.

#### Keyboard

With a `Tooltip`, the plot takes focus. The arrow keys move between points, Home and End go to the first and last, Enter or Space pins the reading, and Escape clears it.

#### Screen readers

Each row is given as text beside the drawing. `label` names the chart and `labelForDatum` writes a row, for values with a unit. Without them a row is read as its keys and values.

#### Reduced motion

With reduced motion set, the series and the axis appear at their final values, and the skeleton's highlight is not drawn.

## Example

```tsx
'use client';

import { useState } from 'react';
import { Frame } from '@/components/panelui/frame';
import { LineChart, type LineChartDatum } from '@/components/panelui/line-chart';

const VISITS = [
  { date: 'Mar 1', visits: 1_240 },
  { date: 'Mar 8', visits: 1_480 },
  { date: 'Mar 15', visits: 1_390 },
  { date: 'Mar 22', visits: 1_720 },
  { date: 'Mar 29', visits: 1_660 },
  { date: 'Apr 5', visits: 2_040 },
  { date: 'Apr 12', visits: 1_910 },
  { date: 'Apr 19', visits: 2_380 },
  { date: 'Apr 26', visits: 2_610 },
];

const latest = VISITS[VISITS.length - 1];
const count = (value: number) => value.toLocaleString('en-US');

export default function LineChartOverview() {
  const [active, setActive] = useState<LineChartDatum | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Weekly visits</Frame.Title>
        <Frame.Action>Drag to inspect</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <LineChart data={VISITS} onActiveIndexChange={(_index, datum) => setActive(datum)}>
          <LineChart.Header
            value={count(Number((active ?? latest).visits))}
            caption={active ? `Week of ${active.date}` : 'Latest week'}
          />
          <LineChart.Grid />
          <LineChart.Area dataKey="visits" />
          <LineChart.Line dataKey="visits" />
          <LineChart.YAxis />
          <LineChart.XAxis />
          <LineChart.Tooltip showLabel={false} />
        </LineChart>
      </Frame.Panel>
    </Frame>
  );
}
```
