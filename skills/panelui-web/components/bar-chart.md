# Bar Chart

Categories compared by length, grouped or stacked.

```tsx
import { BarChart } from "@/components/panelui/bar-chart"
```

From npm the path is `panelui-web/bar-chart`. Install with `npx shadcn@latest add @panelui/bar-chart`.

## When to use it

Use it to compare categories by length: revenue per month, messages per channel. Each row of `data` is a band, and each `BarChart.Bar` is a series drawn from one of its keys.

The grid, the axes, the legend and the readout are separate parts, so a chart has only the ones you write.

The value axis always includes zero, because a bar cropped at the bottom misstates its value. For a series where the change matters more than the size, use a line chart instead.

## Usage

```tsx
<BarChart data={revenue} xDataKey="month">
  <BarChart.Grid />
  <BarChart.Bar dataKey="revenue" />
  <BarChart.XAxis />
  <BarChart.Tooltip />
</BarChart>
```

## Parts

```tsx
<BarChart data={…}>
  <BarChart.Header />
  <BarChart.Grid />
  <BarChart.Bar dataKey="…" />
  <BarChart.Skeleton />
  <BarChart.XAxis />
  <BarChart.YAxis />
  <BarChart.Legend />
  <BarChart.Tooltip />
</BarChart>
```

- `BarChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the series key or your own control on the trailing side.
- `BarChart.Grid` — Lines across the value axis, in the theme's border colour. `rows` is roughly how many: the axis picks round numbers near it.
- `BarChart.Bar` — One series. Declare one per key. Their order is the order they stand in a band, and from the baseline up in a stack.
- `BarChart.Skeleton` — A row of short, equal stubs on the baseline with a highlight moving across them, drawn only while `status` is `loading`.
- `BarChart.XAxis` — Category labels under the bands. Labels are dropped when the bands are too narrow to fit them. Draws nothing on a horizontal chart.
- `BarChart.YAxis` — Value labels on the grid lines, in round numbers, with room made for them. On a horizontal chart it draws the category names instead.
- `BarChart.Legend` — A swatch and a name per series, over the top corner of the plot. On a chart with a header, use the header's `legend` prop instead.
- `BarChart.Tooltip` — The readout, and what drives it. It covers the plot, so the pointer does not have to land on a bar. `labels` names the series in it.

## Props

`BarChart`, `BarChart.Header` and `BarChart.Legend` also take the props of the element they render, and a `className`. `BarChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `BarChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly BarChartDatum[]` | **required** | The rows. Each one is a band along the category axis. |
| `xDataKey` | `string` | `'name'` | Key holding the category label. Used by the axis and the readout. |
| `status` | `BarChartStatus` | `'ready'` | `loading` holds the bars back and grows them in when it turns `ready`. Add a `BarChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `2` | The plot's width ÷ height. `2` is the wide card shape. |
| `animationDuration` | `number` | `700` | Milliseconds for the bars to grow in. |
| `domainDuration` | `number` | `500` | Milliseconds for the bars and the axis to settle after the data changes. |
| `yDomain` | `[number, number]` | — | Fix the value axis instead of deriving it. The derived domain always includes zero, and bar lengths cannot be compared on a domain that does not. |
| `orientation` | `BarChartOrientation` | `'vertical'` | `vertical` grows the bars upward; `horizontal` grows them rightward. |
| `stacked` | `boolean` | `false` | Stack the series on each other instead of standing them side by side. |
| `barGap` | `number` | `0.2` | Fraction of each band left empty, `0` to `1`. |
| `barWidth` | `number` | — | Largest bar thickness in pixels. Derived from the band when omitted. |
| `stackGap` | `number` | `0` | Pixels between the segments of a stack. |
| `cornerRadius` | `number` | `4` | Corner radius on the growing end of a bar. |
| `minBarLength` | `number` | `0` | Smallest length a non-zero bar is drawn at, in pixels. |
| `fadedOpacity` | `number` | `0.3` | Opacity of the bars that are not being read. |
| `onActiveIndexChange` | `(index: number, datum: BarChartDatum \| null) => void` | — | The band being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding, for a bar sparkline with no axis or readout. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: BarChartDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its keys and values. |

#### `BarChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | — | Roughly how many lines to draw across the value axis. |
| `dashArray` | `string` | — | The stroke's dash pattern. |
| `opacity` | `number` | — | Opacity of the lines. |

#### `BarChartBarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. |
| `color` | `BarChartColor` | — | Which of the theme's roles the series is drawn in. |
| `cornerRadius` | `number` | `4` | Corner radius, overriding the chart's. |

#### `BarChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `bars` | `number` | — | How many placeholder bars to draw. Defaults to one per row, and to seven when the data has not arrived. |
| `duration` | `number` | — | Milliseconds for one pass of the sweep. |

#### `BarChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show. Every category by default, thinned only when the bands get too narrow to read. Pass a number to force it lower. |
| `format` | `(datum: BarChartDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |

#### `BarChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | Roughly how many labels to show along the value axis. |
| `format` | `(value: number) => string` | — | Format a value for its label. Defaults to a compact number. |

#### `BarChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: BarChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `className` | `string` | — | Added to the readout's surface. |

#### `BarChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys. |

#### `BarChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a total. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. Prefer this to `BarChart.Legend` on a chart that has a header: the legend sits over the plot, in the corner the bars also want. |

## In a Server Component

`BarChart` is a client component. A Server Component cannot read `BarChart.Header` off the import, so import each part by name: `BarChartHeader`, `BarChartGrid`, `BarChartBar`, `BarChartSkeleton`, `BarChartXAxis`, `BarChartYAxis`, `BarChartTooltip`, `BarChartLegend`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone, so a header does not shrink it. The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### Bundle size

The chart adds about 60 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Colour

`color` on `BarChart.Bar` names a role in the theme. Every series defaults to `chart-1`, so give the others their own.

#### Reading a band

With a `Tooltip`, hovering a band reads it. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the bands it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the band changes, not on every frame, so it can drive a readout outside the chart, as the first example does. Inside the chart, `useBarChart` gives the same band.

#### Keyboard

With a `Tooltip`, the plot takes focus. The arrow keys move between bands, Home and End go to the first and last, Enter or Space pins the reading, and Escape clears it.

#### Screen readers

Each row is given as text beside the drawing. `label` names the chart and `labelForDatum` writes a row, for values with a unit. Without them a row is read as its keys and values.

#### Reduced motion

With reduced motion set, the bars and the axis appear at their final values, and the skeleton's highlight is not drawn.

## Example

```tsx
'use client';

import { useState } from 'react';
import { BarChart, type BarChartDatum } from '@/components/panelui/bar-chart';
import { Frame } from '@/components/panelui/frame';

const REVENUE = [
  { month: 'Jan', revenue: 18_400 },
  { month: 'Feb', revenue: 21_200 },
  { month: 'Mar', revenue: 19_800 },
  { month: 'Apr', revenue: 24_600 },
  { month: 'May', revenue: 27_100 },
  { month: 'Jun', revenue: 25_300 },
  { month: 'Jul', revenue: 29_900 },
  { month: 'Aug', revenue: 32_400 },
];

const total = REVENUE.reduce((sum, row) => sum + row.revenue, 0);
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function BarChartOverview() {
  const [active, setActive] = useState<BarChartDatum | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Revenue</Frame.Title>
        <Frame.Action>2026</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <BarChart data={REVENUE} xDataKey="month" onActiveIndexChange={(_index, datum) => setActive(datum)}>
          <BarChart.Header
            title={active ? String(active.month) : 'January to August'}
            value={dollars(active ? Number(active.revenue) : total)}
          />
          <BarChart.Grid />
          <BarChart.Bar dataKey="revenue" />
          <BarChart.YAxis />
          <BarChart.XAxis />
          <BarChart.Tooltip labels={{ revenue: 'Revenue' }} formatValue={dollars} />
        </BarChart>
      </Frame.Panel>
    </Frame>
  );
}
```
