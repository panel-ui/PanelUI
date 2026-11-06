# Scatter Chart

Two measured quantities against each other, to show how they relate.

```tsx
import { ScatterChart } from "@/components/panelui/scatter-chart"
```

From npm the path is `panelui-web/scatter-chart`. Install with `npx shadcn@latest add @panelui/scatter-chart`.

## When to use it

Use it to show how two measured quantities relate: spend and revenue, dose and response. Each row of `data` is a point, placed by the number at `xDataKey` and the number at a `ScatterChart.Points` `dataKey`.

The grid, the axes, the legend and the readout are separate parts, so a chart has only the ones you write.

Neither axis starts at zero, because a cluster between 80 and 90 would be squeezed into a corner. `xDomain` and `yDomain` fix an axis when you need one. For categories compared by length, use a bar chart instead.

## Usage

```tsx
<ScatterChart data={sessions} xDataKey="spend">
  <ScatterChart.Grid />
  <ScatterChart.Points dataKey="revenue" />
  <ScatterChart.XAxis />
  <ScatterChart.YAxis />
  <ScatterChart.Tooltip />
</ScatterChart>
```

## Parts

```tsx
<ScatterChart data={…}>
  <ScatterChart.Header />
  <ScatterChart.Grid />
  <ScatterChart.Points dataKey="…" />
  <ScatterChart.Skeleton />
  <ScatterChart.XAxis />
  <ScatterChart.YAxis />
  <ScatterChart.Legend />
  <ScatterChart.Tooltip />
</ScatterChart>
```

- `ScatterChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the series key or your own control on the trailing side.
- `ScatterChart.Grid` — Lines both ways, in the theme's border colour. `rows` and `columns` are roughly how many: the axes pick round numbers near them.
- `ScatterChart.Points` — One series, as a field of dots. Declare one per key. `sizeKey` maps a third quantity to each dot's area.
- `ScatterChart.Skeleton` — A still field of muted dots, drawn only while `status` is `loading`.
- `ScatterChart.XAxis` — Value labels under the plot, in round numbers.
- `ScatterChart.YAxis` — Value labels down the side, in round numbers, with room made for them.
- `ScatterChart.Legend` — A swatch and a name per series, over the top corner of the plot. On a chart with a header, use the header's `legend` prop instead.
- `ScatterChart.Tooltip` — Makes the field readable by pointer and keyboard, and floats a readout beside what is being read. `showLabel={false}` keeps the reading without the readout. `hitRadius` is how far from a point the pointer still reads it. `labels` names the x key and the series in it.

## Props

`ScatterChart`, `ScatterChart.Header` and `ScatterChart.Legend` also take the props of the element they render, and a `className`. `ScatterChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `ScatterChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly ScatterChartDatum[]` | **required** | The rows. Each one is a point, placed by two of its values. |
| `xDataKey` | `string` | `'x'` | Key holding the x value. Unlike a category label, this must be a number. |
| `status` | `ScatterChartStatus` | `'ready'` | `loading` holds the points back and grows them in when it turns `ready`. Add a `ScatterChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `1` | The plot's width ÷ height. `1` suits a scatter plot: neither axis is the important one. |
| `animationDuration` | `number` | `650` | Milliseconds for the points to arrive. |
| `domainDuration` | `number` | `500` | Milliseconds for the points and the axes to settle after the data changes. |
| `xDomain` | `[number, number]` | — | Fix the x-axis instead of deriving it from the data. |
| `yDomain` | `[number, number]` | — | Fix the y-axis instead of deriving it from the data. |
| `onActivePointChange` | `(point: ScatterChartPoint \| null) => void` | — | The point being read, and `null` when there is none. Fires when it changes, not per frame. Reading needs `ScatterChart.Tooltip`; `showLabel={false}` keeps it without the label. |
| `compact` | `boolean` | `false` | Drop the axis padding so the field reaches the edges, for a thumbnail. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: ScatterChartDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its x, series and size keys and values. |

#### `ScatterChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `4` | Roughly how many lines to draw across the plot. With a y-axis, the lines follow its `ticks` instead. |
| `columns` | `number` | `4` | Roughly how many lines to draw down it. x is a quantity here, so it earns a grid of its own. With an x-axis, the lines follow its `ticks` instead. |
| `dashArray` | `string` | `'4 6'` | The stroke's dash pattern. |
| `opacity` | `number` | `1` | Opacity of the lines. |

#### `ScatterChartPointsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Key holding this series' y values. |
| `color` | `ScatterChartColor` | `'chart-1'` | Which of the theme's roles the series is drawn in. |
| `size` | `number` | `4.5` | Radius of a point, in pixels. With `sizeKey`, the radius of a row with no finite value there. |
| `sizeKey` | `string` | — | Key holding a third quantity, spaced by each point's area rather than its radius. The lowest value takes the smallest radius in `sizeRange` and the highest the largest, so sizes compare rows without giving their exact ratio. |
| `sizeRange` | `[number, number]` | `[3, 14]` | Smallest and largest radius `sizeKey` maps onto. |
| `opacity` | `number` | `0.75` | Fill opacity. Below 1 by default, so overlapping points read as denser. |

#### `ScatterChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `count` | `number` | `24` | How many placeholder dots to scatter. |
| `color` | `ScatterChartColor` | — | Which of the theme's roles to draw them in. Defaults to the muted surface. |

#### `ScatterChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | Roughly how many labels to show. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |

#### `ScatterChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | Roughly how many labels to show. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |

#### `ScatterChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showLabel` | `boolean` | `true` | Float a small readout beside the point. Without it the point still swells and reports. |
| `formatX` | `(value: number) => string` | — | Format the x value for the readout. Defaults to a compact number. |
| `formatY` | `(value: number, key: string) => string` | — | Format the y value for the readout. Defaults to a compact number. |
| `formatTitle` | `(datum: ScatterChartDatum) => string` | — | A heading for the readout, from the row: a name, a label, a category. |
| `labels` | `Record<string, string>` | — | Prettier names for the x key and the series keys, as the legend takes. |
| `hitRadius` | `number` | `32` | How far from a point the pointer still reads it, in pixels. |
| `className` | `string` | — | Added to the readout's surface. |

#### `ScatterChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys. |

#### `ScatterChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a total. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. Prefer this to `ScatterChart.Legend` on a chart that has a header: the legend sits over the plot, in a corner the points also want. |

## In a Server Component

`ScatterChart` is a client component. A Server Component cannot read `ScatterChart.Header` off the import, so import each part by name: `ScatterChartHeader`, `ScatterChartGrid`, `ScatterChartPoints`, `ScatterChartSkeleton`, `ScatterChartXAxis`, `ScatterChartYAxis`, `ScatterChartTooltip`, `ScatterChartLegend`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone, so a header does not shrink it. The default of `1` suits a scatter plot, and a wide frame flattens a cloud into a band. The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### Bundle size

The chart adds about 60 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Colour

`color` on `ScatterChart.Points` names a role in the theme. Every series defaults to `chart-1`, so give the others their own.

#### Missing values

A row with no number at `xDataKey` or at a series' `dataKey` draws no point for that series, and that series adds nothing to the axes for that row.

#### Reading a point

With a `Tooltip`, the point nearest the pointer is read, as long as it is within `hitRadius`. It swells and turns solid. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the points it passes, and a vertical drag scrolls the page.

`onActivePointChange` fires when the point changes, not on every frame, so it can drive a readout outside the chart, as the first example does. Inside the chart, `useScatterChart` gives the same point. `showLabel={false}` keeps all of this and hides the popover.

#### Keyboard

With a `Tooltip`, the plot takes focus. The arrow keys move through the points from left to right, Home and End go to the first and last, Enter or Space pins the reading, and Escape clears it.

#### Screen readers

Each row is given as text beside the drawing. `label` names the chart and `labelForDatum` writes a row, for values with a unit. Without them a row is read as its x, series and size keys and values, so any other field, such as a name, needs `labelForDatum`.

#### Reduced motion

With reduced motion set, the points and the axes appear at their final values, without the entrance.

## Example

```tsx
'use client';

import { useState } from 'react';
import { ScatterChart, type ScatterChartPoint } from '@/components/panelui/scatter-chart';
import { Frame } from '@/components/panelui/frame';

const CAMPAIGNS = [
  { name: 'Spring launch', spend: 4_200, revenue: 11_800 },
  { name: 'Podcast run', spend: 6_100, revenue: 14_900 },
  { name: 'Search, brand', spend: 2_300, revenue: 9_400 },
  { name: 'Search, generic', spend: 8_800, revenue: 17_200 },
  { name: 'Newsletter swap', spend: 1_200, revenue: 4_900 },
  { name: 'Retargeting', spend: 3_400, revenue: 13_100 },
  { name: 'Video pre-roll', spend: 12_400, revenue: 19_800 },
  { name: 'Partner bundle', spend: 5_300, revenue: 18_200 },
  { name: 'Conference booth', spend: 15_600, revenue: 26_400 },
  { name: 'Webinar series', spend: 2_900, revenue: 7_600 },
  { name: 'Referral bonus', spend: 3_900, revenue: 16_300 },
  { name: 'Display, broad', spend: 9_700, revenue: 12_200 },
  { name: 'Social, video', spend: 7_400, revenue: 20_100 },
  { name: 'Social, static', spend: 4_800, revenue: 9_900 },
  { name: 'Community grants', spend: 1_800, revenue: 6_200 },
  { name: 'Print, trade', spend: 11_200, revenue: 15_400 },
  { name: 'Affiliate', spend: 6_700, revenue: 22_300 },
  { name: 'Influencer, small', spend: 2_600, revenue: 5_500 },
  { name: 'Influencer, large', spend: 14_100, revenue: 31_200 },
  { name: 'Email winback', spend: 900, revenue: 5_800 },
  { name: 'Marketplace ads', spend: 10_300, revenue: 24_700 },
  { name: 'Sponsorship', spend: 13_000, revenue: 21_500 },
  { name: 'Landing page tests', spend: 1_500, revenue: 8_300 },
  { name: 'Holiday push', spend: 8_100, revenue: 25_600 },
];

const thousands = (value: number) => `$${Math.round(value / 1000)}k`;
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

const spent = CAMPAIGNS.reduce((sum, row) => sum + row.spend, 0);
const earned = CAMPAIGNS.reduce((sum, row) => sum + row.revenue, 0);

export default function ScatterChartOverview() {
  const [active, setActive] = useState<ScatterChartPoint | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Spend against revenue</Frame.Title>
        <Frame.Action>{CAMPAIGNS.length} campaigns</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <ScatterChart
          data={CAMPAIGNS}
          xDataKey="spend"
          aspectRatio={1.3}
          label="Campaign spend against revenue"
          labelForDatum={(datum) => `${datum.name}: ${dollars(Number(datum.spend))} spent, ${dollars(Number(datum.revenue))} back`}
          onActivePointChange={setActive}
        >
          <ScatterChart.Header
            title={active ? String(active.datum.name) : 'Return on spend'}
            value={`${((active ? active.y / active.x : earned / spent)).toFixed(1)}x`}
            caption={active ? `${dollars(active.x)} spent, ${dollars(active.y)} back` : `${dollars(spent)} spent in total`}
          />
          <ScatterChart.Grid />
          <ScatterChart.Points dataKey="revenue" />
          <ScatterChart.XAxis format={thousands} />
          <ScatterChart.YAxis format={thousands} />
          <ScatterChart.Tooltip
            formatTitle={(datum) => String(datum.name)}
            formatX={dollars}
            formatY={dollars}
            labels={{ spend: 'Spend', revenue: 'Revenue' }}
          />
        </ScatterChart>
      </Frame.Panel>
    </Frame>
  );
}
```
