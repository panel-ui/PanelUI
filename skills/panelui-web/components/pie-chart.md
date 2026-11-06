# Pie Chart

One total, divided between its parts.

```tsx
import { PieChart } from "@/components/panelui/pie-chart"
```

From npm the path is `panelui-web/pie-chart`. Install with `npx shadcn@latest add @panelui/pie-chart`.

## When to use it

Use it for a handful of parts of one obvious total: a budget, a disk, a split of traffic. Every slice is a share of the sum of `data`, so there is no maximum to set.

Angles are hard to compare, and a pie stops working at around six or seven slices. Sort the parts, keep the top few and put the rest in an "everything else" slice.

For parts that need precise comparison, or that do not belong to one whole, use a [Bar Chart](/docs/web/charts/bar-chart).

## Usage

```tsx
<PieChart data={spend} size={208} innerRadius={0.62}>
  <PieChart.Header title="August" />
  <PieChart.Slices />
  <PieChart.Center />
  <PieChart.Legend />
</PieChart>
```

## Parts

```tsx
<PieChart data={…}>
  <PieChart.Header />
  <PieChart.Skeleton />
  <PieChart.Slices />
  <PieChart.Center />
  <PieChart.Legend />
</PieChart>
```

- `PieChart.Header` — The strip above the dial: `title`, `value` and `caption`, with a colour key or your own control on the trailing side.
- `PieChart.Slices` — Every slice, in data order. The chart draws nothing without this part. Its props set the rounding, the lift and the dimming.
- `PieChart.Center` — The readout in the hole: the total, then the value and share of the slice being read. It draws nothing when `innerRadius` is `0`.
- `PieChart.Legend` — A swatch, a name and a share per slice, under the dial. Each entry is a button that reads its slice.
- `PieChart.Skeleton` — The dial as one plain band while `status` is `loading`. It fades out as the slices unroll over it.

## Props

`PieChart`, `PieChart.Header`, `PieChart.Legend` and `PieChart.Skeleton` also take the props of the element they render, and a `className`. `PieChart.Center` takes a `className` for its readout. `PieChart.Slices` draws nothing itself and takes only the props listed.

#### `PieChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly PieDatum[]` | **required** | One entry per slice, in the order they are drawn clockwise. |
| `size` | `number` | — | Fixed diameter in pixels. Fills the container's width as a square when omitted. |
| `innerRadius` | `number` | `0` | The hole, as a share of the radius. `0` is a pie. Anything above it is a donut, and `0.55` to `0.65` leaves room for a readout in the middle. |
| `startAngle` | `number` | `0` | Where the first slice begins, in degrees clockwise from twelve o'clock. |
| `endAngle` | `number` | `360` | Where the last one ends, on the same clock. A turn between the two closes the pie, and anything less leaves a gap and reads as a dial. |
| `padAngle` | `number` | `0` | Gap between one slice and the next, in degrees. |
| `minAngle` | `number` | `0` | The smallest angle any non-zero slice is drawn at, in degrees. The angle it borrows comes off the others in proportion, so the turn still closes. |
| `animationDuration` | `number` | `620` | Milliseconds for the pie to unroll. |
| `status` | `PieChartStatus` | `'ready'` | `loading` holds the slices back and unrolls them when it turns `ready`. |
| `activeIndex` | `number` | — | The slice being read. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number) => void` | — | Fires with the slice being read, or `-1` when there is none. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: PieDatum, index: number) => string` | — | What a screen reader says for one slice. Defaults to its name and share. |

#### `PieChartSlicesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cornerRadius` | `number` | — | Rounds the four turns of each slice, in pixels. |
| `popOut` | `number` | — | How far a slice lifts out of the pie while it is read, in pixels. |
| `dimOpacity` | `number` | — | Opacity of the other slices while one is read. |

#### `PieChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `PieChartColor` | — | Which of the theme's roles to draw the band in. Defaults to the muted surface. |

#### `PieChartCenterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultLabel` | `string` | — | Heading shown when no slice is read. |
| `formatValue` | `(value: number, slice: PieDatum \| null) => string` | — | Format the number under the label. Defaults to a compact number. |
| `className` | `string` | — | Added to the readout. |

#### `PieChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showValue` | `boolean` | — | Show each slice's share of the whole beside its name. |

#### `PieChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a caveat. |
| `labels` | `Record<string, string>` | — | Prettier names for the slices, keyed by their `label`. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per slice along the trailing edge, for two or three short names. Past that use `PieChart.Legend`, which has the whole width. |

## In a Server Component

`PieChart` is a client component. A Server Component cannot read `PieChart.Header` off the import, so import each part by name: `PieChartHeader`, `PieChartSlices`, `PieChartCenter`, `PieChartLegend`, `PieChartSkeleton`.

## Notes

#### Sizing

The chart takes `size` as its diameter, or fills its container's width as a square without it. The plot draws in the browser after it has been measured, so it is not in server-rendered HTML.

#### Colour

`color` on a datum names a role in the theme. Without it, slices take the five chart colours in order, and a sixth slice repeats the first.

#### Reading a slice

Hovering a slice reads it. A click or a tap holds the reading until you press that slice again, press outside the slices, or press Escape. On a touch screen a drag scrolls the page and does not read slices.

Inside the chart, `usePieChart` gives the slice being read and its share.

#### Keyboard

The plot takes focus. The arrow keys move between slices, Enter or Space holds the reading, and Escape clears it. Moving to another slice lets go of a held reading. The legend's entries are buttons, reached with Tab.

#### Screen readers

Each slice is given as text beside the drawing, as its name and share, and the reading is announced as it changes. `label` names the chart and `labelForDatum` writes a slice, for values with a unit.

#### Reduced motion

With reduced motion set, the pie appears without unrolling and the data change does not animate. The lift on a slice being read stays, because it is the response to the pointer or a press.

#### Zero and negative values

A negative value counts as zero, and a slice worth zero is not drawn, whatever `minAngle` says. It keeps its legend entry.

## Example

```tsx
'use client';

import { useState } from 'react';
import { PieChart } from '@/components/panelui/pie-chart';
import { Frame } from '@/components/panelui/frame';

const SPEND = [
  { label: 'Rent', value: 1450 },
  { label: 'Food', value: 620 },
  { label: 'Transport', value: 210 },
  { label: 'Utilities', value: 185 },
  { label: 'Everything else', value: 240 },
];

const total = SPEND.reduce((sum, slice) => sum + slice.value, 0);
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function PieChartOverview() {
  const [active, setActive] = useState(-1);
  const slice = active >= 0 ? SPEND[active] : undefined;

  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Spending</Frame.Title>
        <Frame.Action>August</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <PieChart data={SPEND} size={208} innerRadius={0.62} onActiveIndexChange={setActive}>
          <PieChart.Header
            title={slice ? slice.label : 'All categories'}
            value={dollars(slice ? slice.value : total)}
          />
          <PieChart.Slices />
          <PieChart.Center formatValue={dollars} />
          <PieChart.Legend />
        </PieChart>
      </Frame.Panel>
    </Frame>
  );
}
```
