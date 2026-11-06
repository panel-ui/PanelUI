# Area Chart

Filled bands over time, stacked or overlaid.

```tsx
import { AreaChart } from "@/components/panelui/area-chart"
```

From npm the path is `panelui-web/area-chart`. Install with `npx shadcn@latest add @panelui/area-chart`.

## When to use it

Use it to show what a total over time is made of: sessions by channel, revenue by plan. Each row of `data` is a point, and each `AreaChart.Area` is a band drawn from one of its keys.

With `stacked`, each band sits on the ones below it, so the top edge is the total and each thickness is a share. Without it the bands overlay, for series that are alternatives rather than parts.

The grid, the axes, the legend and the readout are separate parts, so a chart has only the ones you write.

For one series where the shape matters more than what it is made of, use a line chart instead.

## Usage

```tsx
<AreaChart data={traffic} xDataKey="hour" stacked>
  <AreaChart.Grid />
  <AreaChart.Area dataKey="direct" />
  <AreaChart.Area dataKey="search" color="chart-2" />
  <AreaChart.XAxis />
  <AreaChart.Tooltip />
</AreaChart>
```

## Parts

```tsx
<AreaChart data={…}>
  <AreaChart.Header />
  <AreaChart.Grid />
  <AreaChart.Area dataKey="…" />
  <AreaChart.Line dataKey="…" />
  <AreaChart.ReferenceLine y={…} />
  <AreaChart.Marker index={…} />
  <AreaChart.Skeleton />
  <AreaChart.XAxis />
  <AreaChart.YAxis />
  <AreaChart.Legend />
  <AreaChart.Labels />
  <AreaChart.Tooltip />
</AreaChart>
```

- `AreaChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the series key or your own control on the trailing side.
- `AreaChart.Grid` — Lines across the value axis, in the theme's border colour. `rows` is roughly how many: the axis picks round numbers near it.
- `AreaChart.Area` — One filled band with a line along its top edge. Declare one per key. In a stack, the first is the bottom.
- `AreaChart.Line` — A series drawn as a line with no fill, over the bands. It is never part of a stack, counts toward the value axis and has a row in the readout. `curve="step"` holds each value until the next.
- `AreaChart.ReferenceLine` — A rule across the plot at the value `y`: a budget, a limit, a target. `label` writes text above its left end.
- `AreaChart.Marker` — A rule down the plot at the row `index`: a release, the day something ran out. `label` writes text beside its top.
- `AreaChart.Skeleton` — A low band on the baseline with a highlight moving across it, drawn only while `status` is `loading`.
- `AreaChart.XAxis` — The x labels, each on its own point. Labels are dropped when they get too close. `ticks` asks for fewer, evenly spaced with both ends kept.
- `AreaChart.YAxis` — Value labels on the grid lines, in round numbers, with room made for them.
- `AreaChart.Legend` — A swatch and a name per series, over the top corner of the plot, reversed for a stack so it reads in the order the bands appear. On a chart with a header, use the header's `legend` prop instead.
- `AreaChart.Labels` — The value at the end of each series, beside where that series ends. Below 32rem of width they wrap under the plot. `extra` adds a figure that belongs to no one series.
- `AreaChart.Tooltip` — The readout, and what drives it. It adds the crosshair and a dot on every band's top edge, and it covers the plot, so the pointer can be anywhere. `labels` names the series in it.

## Props

`AreaChart`, `AreaChart.Header`, `AreaChart.Legend` and `AreaChart.Labels` also take the props of the element they render, and a `className`. `AreaChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `AreaChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly AreaChartDatum[]` | **required** | The rows. Each one is a point along the x-axis. |
| `xDataKey` | `string` | `'date'` | Key holding the x label. Used by the axis and the readout. |
| `status` | `AreaChartStatus` | `'ready'` | `loading` holds the bands back and grows them in when it turns `ready`. Add an `AreaChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `2` | The plot's width ÷ height. `2` is the wide card shape. |
| `animationDuration` | `number` | `700` | Milliseconds for the bands to grow in. |
| `domainDuration` | `number` | `500` | Milliseconds for the bands and the axis to settle after the data changes. |
| `yDomain` | `[number, number]` | — | Fix the value axis instead of deriving it from the data. |
| `stacked` | `boolean` | `false` | Sit each band on the running total of the ones below it, so the top edge is the whole and each thickness is a share. The first `Area` is the bottom of the stack. Without it the bands overlay and their fills are translucent. |
| `curve` | `AreaChartCurve` | `'monotone'` | `monotone` never overshoots between points. `linear` joins them straight. `step` holds each value until the next. |
| `onActiveIndexChange` | `(index: number, datum: AreaChartDatum \| null) => void` | — | The point being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `onSelect` | `(key: string) => void` | — | An `Area` was chosen, by pressing it on the plot or its entry in `Labels`. Gets its `dataKey`. |
| `compact` | `boolean` | `false` | Drop the axis padding so the bands reach the edges, for a sparkline. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: AreaChartDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its keys and values. |

#### `AreaChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `4` | Roughly how many lines to draw across the value axis. |
| `dashArray` | `string` | `'4 6'` | The stroke's dash pattern. |
| `opacity` | `number` | `1` | Opacity of the lines. |

#### `AreaChartAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. |
| `color` | `AreaChartColor` | `'chart-1'` | A role in the theme, or any CSS colour. |
| `fillOpacity` | `number` | — | Opacity of the fill at the top of the band. Defaults to `0.6` stacked and `0.35` overlaid, so overlaid bands show each other through. |
| `gradientToOpacity` | `number` | `0` | Opacity at the bottom. `0` fades the band out; match `fillOpacity` for a flat fill. |
| `opacity` | `number` | `1` | Opacity of the whole series, fill and edge, for picking one out from the others. |
| `showLine` | `boolean` | `true` | Draw the line along the top edge of the band. |
| `strokeWidth` | `number` | `2` | Thickness of that line. |

#### `AreaChartLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this line's values. |
| `color` | `AreaChartColor` | `'foreground'` | A role in the theme, or any CSS colour. |
| `curve` | `AreaChartCurve` | — | Defaults to the chart's `curve`. `step` suits a value that changes on set dates, such as income. |
| `dashArray` | `string` | — | The stroke's dash pattern. |
| `strokeWidth` | `number` | `2` | Thickness of the line. |

#### `AreaChartReferenceLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `y` | `number` | **required** | The value to draw the rule at. It counts toward the value axis. |
| `color` | `AreaChartColor` | `'foreground'` | A role in the theme, or any CSS colour, for the rule and its label. |
| `dashArray` | `string` | `'3 4'` | The stroke's dash pattern. |
| `label` | `string` | — | Text above the rule's left end. |

#### `AreaChartMarkerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `index` | `number` | **required** | The row to draw the rule at, counted from `0`. |
| `color` | `AreaChartColor` | `'muted-foreground'` | A role in the theme, or any CSS colour, for the rule and its label. |
| `dashArray` | `string` | `'2 3'` | The stroke's dash pattern. |
| `label` | `string` | — | Text beside the rule's top. It moves to the left of a rule near the right edge. |

#### `AreaChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys. |
| `formatValue` | `(value: number, key: string) => string` | — | Format a value for its label. Defaults to a compact number. |
| `extra` | `readonly AreaChartExtraLabel[]` | — | Labels of your own, for a figure that belongs to no one series. |
| `minGap` | `number` | `16` | The least distance between two labels, in pixels. |

#### `AreaChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | `1400` | Milliseconds for one pass of the sweep. |

#### `AreaChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show, evenly spaced with both ends kept. Every row by default, thinned only when they get too close to read. |
| `format` | `(datum: AreaChartDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |

#### `AreaChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | Roughly how many labels to show along the value axis. |
| `format` | `(value: number) => string` | — | Format a value for its label. Defaults to a compact number. |

#### `AreaChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: AreaChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `className` | `string` | — | Added to the readout's surface. |

#### `AreaChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys. |

#### `AreaChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a total. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. Prefer this to `AreaChart.Legend` on a chart that has a header: the legend sits over the plot, in the corner the bands also want. |

## In a Server Component

`AreaChart` is a client component. A Server Component cannot read `AreaChart.Header` off the import, so import each part by name: `AreaChartHeader`, `AreaChartGrid`, `AreaChartArea`, `AreaChartLine`, `AreaChartReferenceLine`, `AreaChartMarker`, `AreaChartLabels`, `AreaChartSkeleton`, `AreaChartXAxis`, `AreaChartYAxis`, `AreaChartTooltip`, `AreaChartLegend`.

## Notes

#### Stacked or overlaid

Stack when the series are parts of one thing and the total means something: channels making up your traffic, plans making up your revenue. Overlay when a total would mean nothing: two plans compared.

The chart does not add up a stack's total for you. The first example works it out from the row that `onActiveIndexChange` passes.

#### The baseline

The derived value axis always includes zero, because an area floating above the bottom of the plot reads as a shape rather than a quantity. `yDomain` fixes the axis to other values.

#### Gaps

A missing value leaves a gap in its own band. In a stack it counts as zero for the bands above it.

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone, so a header does not shrink it. The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### Bundle size

The chart adds about 67 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Colour

`color` names a role in the theme. Every `Area` defaults to `chart-1`, so give the others their own. `Line` and `ReferenceLine` default to `foreground`, and `Marker` to `muted-foreground`. `color` also takes any CSS colour, for a colour that comes from your data. Unlike a role, it does not change with the theme.

#### Reading a point

With a `Tooltip`, hovering the plot reads the nearest point. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the points it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the point changes, not on every frame, so it can drive a readout outside the chart, as the first example does. Inside the chart, `useAreaChart` gives the same point.

#### Keyboard

With a `Tooltip`, the plot takes focus. The arrow keys move between points, Home and End go to the first and last, Enter or Space pins the reading, and Escape clears it.

The arrow keys move between rows, not series, so Enter on the plot does not call `onSelect`. Add `AreaChart.Labels` so a keyboard can reach it: each `Area`'s entry becomes a button.

#### Screen readers

Each row is given as text beside the drawing. `label` names the chart and `labelForDatum` writes a row, for values with a unit. Without them a row is read as its keys and values.

#### Reduced motion

With reduced motion set, the bands and the axis appear at their final values, and the skeleton's highlight is not drawn.

## Example

```tsx
'use client';

import { useState } from 'react';
import { AreaChart, type AreaChartDatum } from '@/components/panelui/area-chart';
import { Frame } from '@/components/panelui/frame';

const SESSIONS = [
  { hour: '00:00', direct: 120, search: 60, social: 30 },
  { hour: '02:00', direct: 100, search: 45, social: 25 },
  { hour: '04:00', direct: 95, search: 40, social: 20 },
  { hour: '06:00', direct: 140, search: 90, social: 50 },
  { hour: '08:00', direct: 210, search: 220, social: 100 },
  { hour: '10:00', direct: 290, search: 400, social: 150 },
  { hour: '12:00', direct: 340, search: 520, social: 190 },
  { hour: '14:00', direct: 360, search: 560, social: 210 },
  { hour: '16:00', direct: 320, search: 480, social: 180 },
  { hour: '18:00', direct: 250, search: 330, social: 120 },
  { hour: '20:00', direct: 180, search: 160, social: 70 },
  { hour: '22:00', direct: 140, search: 90, social: 40 },
];

const LABELS = { direct: 'Direct', search: 'Search', social: 'Social' };
const rowTotal = (row: AreaChartDatum) => Number(row.direct) + Number(row.search) + Number(row.social);
const dayTotal = SESSIONS.reduce((sum, row) => sum + rowTotal(row), 0);

export default function AreaChartOverview() {
  const [active, setActive] = useState<AreaChartDatum | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Sessions by channel</Frame.Title>
        <Frame.Action>Today</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <AreaChart
          data={SESSIONS}
          xDataKey="hour"
          stacked
          label="Sessions by channel, by hour"
          onActiveIndexChange={(_index, datum) => setActive(datum)}
        >
          <AreaChart.Header
            value={(active ? rowTotal(active) : dayTotal).toLocaleString('en-US')}
            caption={active ? String(active.hour) : 'All day'}
            labels={LABELS}
            legend
          />
          <AreaChart.Grid />
          <AreaChart.Area dataKey="direct" color="primary" />
          <AreaChart.Area dataKey="search" color="info" />
          <AreaChart.Area dataKey="social" color="success" />
          <AreaChart.YAxis />
          <AreaChart.XAxis />
          <AreaChart.Tooltip labels={LABELS} formatValue={(value) => value.toLocaleString('en-US')} />
        </AreaChart>
      </Frame.Panel>
    </Frame>
  );
}
```
