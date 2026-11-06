# Waterfall Chart

How a run of changes carried one total to another, with each step floating on the running balance.

```tsx
import { WaterfallChart } from "@/components/panelui/waterfall-chart"
```

From npm the path is `panelui-web/waterfall-chart`. Install with `npx shadcn@latest add @panelui/waterfall-chart`.

## When to use it

Use it to show how a series of changes carried one total to another, such as a revenue bridge or a month of cash flow. Each step's bar starts where the previous one ended, so the gap under it is the balance it acted on and its length is what it changed by.

The steps are drawn in the order you give them. The chart never sorts them, because the order is what it shows.

For categories with no order to keep, use a [Bar Chart](/docs/web/charts/bar-chart).

## Usage

```tsx
<WaterfallChart data={bridge}>
  <WaterfallChart.Grid />
  <WaterfallChart.Connectors />
  <WaterfallChart.Bars />
  <WaterfallChart.XAxis />
  <WaterfallChart.Tooltip />
</WaterfallChart>
```

## Parts

```tsx
<WaterfallChart data={…}>
  <WaterfallChart.Header />
  <WaterfallChart.Grid />
  <WaterfallChart.Skeleton />
  <WaterfallChart.Connectors />
  <WaterfallChart.Bars />
  <WaterfallChart.Values />
  <WaterfallChart.XAxis />
  <WaterfallChart.YAxis />
  <WaterfallChart.Tooltip />
  <WaterfallChart.Legend />
</WaterfallChart>
```

- `WaterfallChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the legend or your own control on the trailing side. The value is a string you pass, so it can follow `onActiveIndexChange`.
- `WaterfallChart.Grid` — Lines across the value axis, so a bar can be read against a number.
- `WaterfallChart.Skeleton` — Equal stubs on the baseline, with a highlight moving across them, drawn only while `status` is `loading`.
- `WaterfallChart.Connectors` — The lines from each bar's end to the next band. They always pass behind the bars, wherever you declare them.
- `WaterfallChart.Bars` — The bars. Each takes its kind's colour, or the step's own `color`. Without this part nothing can be read.
- `WaterfallChart.Values` — Each step's change, signed and written just past the end of its bar. It needs vertical room, and it is not drawn sideways.
- `WaterfallChart.XAxis` — The step names under the bands. Sideways, `YAxis` has them instead.
- `WaterfallChart.YAxis` — Value labels down the side. Sideways, the side is the step axis, so it draws the names.
- `WaterfallChart.Tooltip` — The readout, and the reading of a step by hover, press, drag or arrow keys. It reports the change and the balance after it. The other bars fade while one is read.
- `WaterfallChart.Legend` — A swatch and a name for each kind the run contains, over the plot's top corner. On a chart with a header, use the header's `legend` instead.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `WaterfallChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly WaterfallDatum[]` | **required** | The steps, in the order they happen. The chart never sorts them. |
| `status` | `WaterfallChartStatus` | `'ready'` | `loading` holds the bars back and grows them in when it turns `ready`. Add a `WaterfallChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `2` | The plot's width ÷ height. `2` is the wide card shape. |
| `animationDuration` | `number` | `700` | Milliseconds for the bars to grow in. |
| `domainDuration` | `number` | `500` | Milliseconds for the bars and the axis to settle after the data changes. |
| `yDomain` | `[number, number]` | — | Fix the value axis instead of deriving it. The derived axis always includes zero, and bar lengths cannot be compared on one that does not. |
| `orientation` | `WaterfallChartOrientation` | `'vertical'` | `vertical` stands the bars up; `horizontal` lays the run down the side. |
| `barGap` | `number` | `0.34` | Fraction of each band left empty, `0` to `1`. |
| `barWidth` | `number` | — | Largest bar thickness in pixels. Derived from the band when omitted. |
| `cornerRadius` | `number` | `4` | Corner radius on the ends of a bar. |
| `minBarLength` | `number` | `2` | Smallest length a non-zero bar is drawn at, in pixels. |
| `fadedOpacity` | `number` | `0.3` | Opacity of the bars that are not being read. |
| `riseColor` | `WaterfallChartColor` | `'success'` | Which of the theme's roles a step that adds is drawn in. |
| `fallColor` | `WaterfallChartColor` | `'destructive'` | Which of the theme's roles a step that subtracts is drawn in. |
| `totalColor` | `WaterfallChartColor` | `'chart-1'` | Which of the theme's roles a `total` step is drawn in. |
| `onActiveIndexChange` | `(index: number, step: WaterfallStep \| null) => void` | — | The step being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding, for a run with no axis or readout. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(step: WaterfallStep, index: number) => string` | — | What a screen reader says for one step. Defaults to its name, change and balance. |

#### `WaterfallChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `4` | Roughly how many lines to draw across the value axis. |
| `dashArray` | `string` | `'4 6'` | The stroke's dash pattern. |
| `opacity` | `number` | `1` | Opacity of the lines. |

#### `WaterfallChartBarsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cornerRadius` | `number` | — | Corner radius, overriding the chart's. |

#### `WaterfallChartConnectorsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dashArray` | `string` | `'3 4'` | The stroke's dash pattern. |
| `strokeWidth` | `number` | `1` | The stroke's width in pixels. |
| `opacity` | `number` | `1` | Opacity of the lines. |

#### `WaterfallChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `bars` | `number` | — | How many placeholder bars to draw. Defaults to one per step, and to six when the data has not arrived. |
| `duration` | `number` | `1400` | Milliseconds for one pass of the sweep. |

#### `WaterfallChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show. Every step by default, thinned only when the bands get too narrow to read. Pass a number to force it lower. |
| `format` | `(step: WaterfallStep, index: number) => string` | — | Turn a step into its label. Defaults to its `label`. |

#### `WaterfallChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | Roughly how many labels to show along the value axis. |
| `format` | `(value: number) => string` | — | Format a value for its label. Defaults to a compact number. |

#### `WaterfallChartValuesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `format` | `(step: WaterfallStep, index: number) => string` | — | Format a step's number. Defaults to a signed compact number. |

#### `WaterfallChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(step: WaterfallStep) => string` | — | Format the step's change. Defaults to a signed compact number. |
| `formatTotal` | `(step: WaterfallStep) => string \| null` | — | Format the running total line. Return `null` to drop it. |
| `labels` | `Partial<Record<WaterfallKind \| 'balance', string>>` | — | Names for the three kinds and for the running total line. |
| `className` | `string` | — | Added to the readout's surface. |

#### `WaterfallChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `Partial<Record<WaterfallKind, string>>` | — | Names for the three kinds. Defaults to Increase, Decrease and Total. |

#### `WaterfallChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the run is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a total. |
| `labels` | `Partial<Record<WaterfallKind, string>>` | — | Names for the three kinds, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per kind along the trailing edge. Prefer this to `WaterfallChart.Legend` on a chart that has a header: the legend sits over the plot, in the corner the bars also want. |

## In a Server Component

`WaterfallChart` is a client component. A Server Component cannot read `WaterfallChart.Header` off the import, so import each part by name: `WaterfallChartHeader`, `WaterfallChartGrid`, `WaterfallChartConnectors`, `WaterfallChartBars`, `WaterfallChartSkeleton`, `WaterfallChartXAxis`, `WaterfallChartYAxis`, `WaterfallChartValues`, `WaterfallChartTooltip`, `WaterfallChartLegend`.

## Notes

#### Sizing

The chart fills its container's width and takes the plot's height from `aspectRatio`, so a header does not shrink it.

The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### Bundle size

The chart adds about 60 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Data

`value` is what the step changes the running total by, so a decrease is negative and the colour follows from the sign.

`total: true` marks a reading rather than a change. It is measured from the baseline, and its `value` is added to the running total first, so an opening balance carries the figure it opens at and a closing total carries `0`.

A value that is not a finite number counts as zero, so the step keeps its label and later totals stay correct. `waterfallSteps` is the same arithmetic the chart runs, exported so a header or a table can read the running balances.

#### The value axis

The derived axis spans both ends of every bar and always includes zero. `yDomain` overrides it when both ends are finite. A bar past a fixed axis stops at the edge of the plot, and a step wholly past it draws nothing.

#### Reading a step

Hovering anywhere in a band reads it, and the other bars fade. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the bands it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the step changes, not on every frame, and passes the resolved step, so it can drive a readout outside the chart, as the first example does. Inside the chart, `useWaterfallChart` gives the same step.

#### Keyboard

The chart takes focus. The arrow keys walk the steps, Home and End go to the first and last, and Escape clears the reading.

#### Screen readers

Each step is given as text beside the drawing, with its change and the balances either side. `label` names the chart and `labelForDatum` writes a step, for values with a unit.

#### Reduced motion

With reduced motion set, the bars appear at their final lengths and the skeleton's highlight stays still.

## Example

```tsx
'use client';

import { useState } from 'react';
import { Frame } from '@/components/panelui/frame';
import { WaterfallChart, type WaterfallDatum, type WaterfallStep } from '@/components/panelui/waterfall-chart';

const BRIDGE: WaterfallDatum[] = [
  { label: 'Q3', value: 482000, total: true },
  { label: 'New', value: 96400 },
  { label: 'Upsell', value: 41200 },
  { label: 'Churn', value: -58700 },
  { label: 'Down', value: -19300 },
  { label: 'Q4', value: 0, total: true },
];

const money = (value: number) => `$${Math.abs(value).toLocaleString('en')}`;

export default function WaterfallChartOverview() {
  const [step, setStep] = useState<WaterfallStep | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Revenue bridge</Frame.Title>
        <Frame.Action>Hover to read</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <WaterfallChart data={BRIDGE} aspectRatio={1.6} onActiveIndexChange={(_index, next) => setStep(next)}>
          <WaterfallChart.Header
            title={step ? step.label : 'Closing'}
            value={money(step ? step.value : 541600)}
            caption={step && step.kind !== 'total' ? `Balance after: ${money(step.end)}` : 'Annual run rate'}
            legend
          />
          <WaterfallChart.Grid />
          <WaterfallChart.YAxis />
          <WaterfallChart.Connectors />
          <WaterfallChart.Bars />
          <WaterfallChart.XAxis />
          <WaterfallChart.Tooltip />
        </WaterfallChart>
      </Frame.Panel>
    </Frame>
  );
}
```
