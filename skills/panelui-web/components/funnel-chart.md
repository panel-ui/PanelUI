# Funnel Chart

Where a population drained away, one step at a time.

```tsx
import { FunnelChart } from "@/components/panelui/funnel-chart"
```

From npm the path is `panelui-web/funnel-chart`. Install with `npx shadcn@latest add @panelui/funnel-chart`.

## When to use it

Use it to show how many were left at each step of a process, such as a checkout or a signup. Each stage is drawn as a band of one ribbon, as tall as its value where it starts and as tall as the next stage's where it ends.

Every stage has to be a subset of the one above it, in the order the steps happen. The chart never sorts them.

For categories that do not nest, use a [Bar Chart](/docs/web/charts/bar-chart).

## Usage

```tsx
<FunnelChart data={checkout}>
  <FunnelChart.Header title="Viewed" value="41,800" />
  <FunnelChart.Stages />
  <FunnelChart.Labels />
</FunnelChart>
```

## Parts

```tsx
<FunnelChart data={…}>
  <FunnelChart.Header />
  <FunnelChart.Skeleton />
  <FunnelChart.Stages />
  <FunnelChart.Labels />
  <FunnelChart.Legend />
</FunnelChart>
```

- `FunnelChart.Header` — The strip above the run: `title`, `value` and `caption`, with your own control on the trailing side. The value is a string you pass, so it can follow `onActiveIndexChange`.
- `FunnelChart.Skeleton` — One plain ribbon over the whole run, drawn only while `status` is `loading`. It has no divisions, because placeholder stages would read as a real drop-off.
- `FunnelChart.Stages` — The ribbon. It is one part rather than one per stage, because a stage's near edge is the previous stage's far edge.
- `FunnelChart.Labels` — The readings around the ribbon: the count above each band, the name under it, and the conversion in a pill on it. `share` picks which conversion.
- `FunnelChart.Legend` — A swatch, a name and a reading per stage, under the run. Use it in place of `Labels` on a compact chart. `layout` is `list` or `inline`.

## Props

`FunnelChart`, `FunnelChart.Header` and `FunnelChart.Legend` also take the props of the element they render, and a `className`. `FunnelChart.Labels` puts its `className` on each stage's column. `FunnelChart.Stages` and `FunnelChart.Skeleton` draw nothing themselves and take only the props listed.

#### `FunnelChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly FunnelDatum[]` | **required** | The steps, in the order they happen. Never reordered. |
| `height` | `number` | `200` | How tall the run is drawn, in pixels. The width is the container's, and nothing in the data says how deep the ribbon should taper. |
| `stageSize` | `number` | — | How wide one stage is, in pixels. Left unset, the stages divide the width between them. |
| `gap` | `number` | `4` | Space between one stage and the next, in pixels. |
| `layers` | `number` | `3` | Concentric rings drawn per stage. `1` draws the band once, flat. |
| `edges` | `FunnelEdges` | `'curved'` | Whether the sides of a band are curves or straight diagonals. |
| `minWidth` | `number` | `0.1` | The shortest a non-zero stage is drawn, as a share of the tallest. A genuine zero is still drawn as nothing. |
| `color` | `FunnelChartColor` | `'chart-1'` | The funnel's hue, as one of the theme's roles. |
| `animationDuration` | `number` | `700` | Milliseconds for one stage to grow. |
| `staggerDelay` | `number` | `90` | Milliseconds between one stage starting and the next. `0` for all at once. |
| `status` | `FunnelChartStatus` | `'ready'` | `loading` holds the stages back and grows them in when it turns `ready`. |
| `activeIndex` | `number` | — | The stage being read. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number, stage: FunnelDatum \| null) => void` | — | The stage being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(stage: FunnelDatum, index: number) => string` | — | What a screen reader says for one stage. Defaults to its name, count and share of the first. |

#### `FunnelChartStagesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dimOpacity` | `number` | `0.3` | Opacity of the stages that are not being read, once one is. |

#### `FunnelChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `FunnelChartColor` | — | Which of the theme's roles to draw the placeholder in. Defaults to the theme's skeleton colour. |

#### `FunnelChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Added to each stage's column. |
| `formatValue` | `(value: number, stage: FunnelDatum) => string` | — | Format the count. Defaults to a compact number. |
| `formatShare` | `(share: number, stage: FunnelDatum) => string` | — | Format the conversion in the pill. Defaults to a whole percent. |
| `share` | `FunnelShare` | `'top'` | Which conversion the pill reports. `top` is the share of the first stage. `previous` is the share of the stage above, so the first stage has no pill. |
| `showValue` | `boolean` | `true` | Show the count above the ribbon. |
| `showLabel` | `boolean` | `true` | Show the stage's name under the ribbon. |

#### `FunnelChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `layout` | `FunnelLegendLayout` | `'list'` | `list` gives every stage a row, with the numbers in a column. `inline` runs them together and wraps, which is denser where the names are short. |
| `showValue` | `boolean` | `true` | Show each stage's reading beside its name. |
| `formatValue` | `(value: number, stage: FunnelDatum) => string` | — | Format the value in a `list` key. Defaults to a compact number. |

#### `FunnelChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the funnel is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a caveat. |

## In a Server Component

`FunnelChart` is a client component. A Server Component cannot read `FunnelChart.Header` off the import, so import each part by name: `FunnelChartHeader`, `FunnelChartStages`, `FunnelChartLabels`, `FunnelChartLegend`, `FunnelChartSkeleton`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `height`, which applies to the run alone, so a header or a legend does not shrink it. The stages divide the width between them unless `stageSize` is set. Keep the stage names short: five stages at phone width leave each name about 70 pixels.

The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### Bundle size

The chart adds about 60 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Data

Heights are measured against the largest value, so a stage larger than the one above it is drawn as given, wider than its parent. Check the data if you see one.

A non-zero stage is never drawn shorter than `minWidth`, a share of the tallest, so a very small stage stays visible. A stage of zero draws nothing. A negative value counts as zero.

#### Colour

`color` on the chart names a role in the theme, and the stages fade along the run in that one hue. `color` on a stage draws that stage at full strength.

#### Reading a stage

Hovering a column reads its stage, and the whole column is the target, so a thin stage is as easy to reach as a wide one. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the stages it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the stage changes, not on every frame, so it can drive a readout outside the chart, as the first example does. Inside the chart, `useFunnelChart` gives the same stage with its shares. `activeIndex` makes the stage controlled.

#### Keyboard

The plot takes focus. The arrow keys move between stages, Home and End go to the first and last, Enter or Space pins the reading, and Escape clears it. `FunnelChart.Legend` rows are buttons in the tab order as well.

#### Screen readers

Each stage is given as text beside the drawing, and the stage being read is announced as it changes. `label` names the chart and `labelForDatum` writes a stage, for values with a unit. Without it a stage is read as its name, count and share of the first stage.

#### Reduced motion

With reduced motion set, the stages appear at their final heights.

## Example

```tsx
'use client';

import { useState } from 'react';
import { FunnelChart, type FunnelDatum } from '@/components/panelui/funnel-chart';
import { Frame } from '@/components/panelui/frame';

const CHECKOUT: FunnelDatum[] = [
  { label: 'Viewed', value: 41800 },
  { label: 'Basket', value: 18240 },
  { label: 'Address', value: 9420 },
  { label: 'Card', value: 6180 },
  { label: 'Paid', value: 5240 },
];

export default function FunnelChartOverview() {
  const [active, setActive] = useState<FunnelDatum | null>(null);
  const stage = active ?? CHECKOUT[0]!;

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Checkout</Frame.Title>
        <Frame.Action>Hover to read</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <FunnelChart data={CHECKOUT} height={240} onActiveIndexChange={(_index, next) => setActive(next)}>
          <FunnelChart.Header title={stage.label} value={stage.value.toLocaleString('en')} caption="Last 30 days" />
          <FunnelChart.Stages />
          <FunnelChart.Labels />
        </FunnelChart>
      </Frame.Panel>
    </Frame>
  );
}
```
