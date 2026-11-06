# Ring Chart

Progress towards several targets, as concentric arcs.

```tsx
import { RingChart } from "@/components/panelui/ring-chart"
```

From npm the path is `panelui-web/ring-chart`. Install with `npx shadcn@latest add @panelui/ring-chart`.

## When to use it

Use it for a few values that each have their own target: calories, minutes and steps against today's goals, or tasks done against a sprint. Each ring is measured against its own `maxValue`, so three rings can all be at ninety percent of three unrelated numbers.

The rings do not add up, so the chart has no total. A value past its target fills the ring and stops.

For parts of one whole, use a [Pie Chart](/docs/web/charts/pie-chart). For values on one shared scale, use a [Bar Chart](/docs/web/charts/bar-chart).

## Usage

```tsx
<RingChart data={goals} size={208}>
  <RingChart.Ring index={0} />
  <RingChart.Ring index={1} />
  <RingChart.Ring index={2} />
  <RingChart.Center />
  <RingChart.Legend />
</RingChart>
```

## Parts

```tsx
<RingChart data={…}>
  <RingChart.Header />
  <RingChart.Ring index={0} />
  <RingChart.Center />
  <RingChart.Legend />
</RingChart>
```

- `RingChart.Header` — The strip above the rings: `title`, `value` and `caption`, with a colour key or your own control on the trailing side.
- `RingChart.Ring` — One ring, drawn from the entry at `index` in `data`. The chart draws only the rings it is given a part for.
- `RingChart.Center` — The readout in the hole: the outermost ring's value and target, then the same for the ring being read.
- `RingChart.Legend` — A swatch, a name and a percentage per ring, under the plot. Each entry is a button that reads its ring.

## Props

`RingChart`, `RingChart.Header` and `RingChart.Legend` also take the props of the element they render, and a `className`. `RingChart.Center` takes a `className` for its readout. `RingChart.Ring` draws into the chart's SVG and takes only the props listed.

#### `RingChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly RingDatum[]` | **required** | One entry per ring, outermost first. |
| `size` | `number` | — | Fixed diameter in pixels. Without it the chart fills its container's width as a square. |
| `strokeWidth` | `number` | `12` | Thickness of each ring. |
| `ringGap` | `number` | `6` | Gap between one ring and the next. |
| `startAngle` | `number` | `0` | Where the arcs begin, in degrees clockwise from twelve o'clock. |
| `endAngle` | `number` | `360` | Where they end, on the same clock. Anything less than a turn from `startAngle` leaves a gap and reads as a gauge: `startAngle={-90} endAngle={90}` is the half circle over the top. |
| `animationDuration` | `number` | `700` | Milliseconds for the arcs to sweep in. |
| `activeIndex` | `number` | — | The ring being read. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number) => void` | — | Fires when the reading changes, from a hover, a key or a press, with `-1` when it ends. |
| `label` | `string` | — | Names the chart for screen readers. |
| `labelForDatum` | `(datum: RingDatum, index: number) => string` | — | Writes one ring for screen readers, for a value with a unit. |

#### `RingChartRingProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `index` | `number` | **required** | Which entry in `data` this ring draws. |
| `color` | `RingChartColor` | — | Which of the theme's roles to draw it in, over the datum's and the palette. |
| `lineCap` | `'round' \| 'butt'` | — | Rounded ends or square ones. Defaults to round, and to square when the ring is segmented. |
| `trackOpacity` | `number` | — | Opacity of the track behind the arc. |
| `segments` | `number` | — | Break the ring into this many ticks, lit one at a time, for a target made of countable things. |
| `segmentGap` | `number` | — | Gap between one tick and the next, in pixels. |

#### `RingChartCenterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultLabel` | `string` | — | Heading shown when no ring is read. Defaults to the outermost ring's own name. |
| `formatValue` | `(value: number, ring: RingDatum \| null) => string` | — | Format the number under the label. Defaults to a compact number. |
| `className` | `string` | — | Added to the readout. |

#### `RingChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showValue` | `boolean` | — | Show each ring's percentage of its own target beside its name. |

#### `RingChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a target. |
| `labels` | `Record<string, string>` | — | Prettier names for the rings, keyed by their `label`. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per ring along the trailing edge. |

## In a Server Component

`RingChart` is a client component. A Server Component cannot read `RingChart.Header` off the import, so import each part by name: `RingChartHeader`, `RingChartRing`, `RingChartCenter`, `RingChartLegend`.

## Notes

#### Sizing

The chart takes `size` as its diameter, or fills its container's width as a square without it. `strokeWidth` and `ringGap` stay in pixels at any size, so a small chart fits fewer rings. An inner ring that runs out of room stays at its minimum radius and overlaps the one outside it.

The plot draws in the browser after it has been measured, so it is not in server-rendered HTML.

#### Colour

`color` on a datum or on `RingChart.Ring` names a role in the theme, and the part's wins. Without either, rings take the five chart colours in order.

#### Reading a ring

Hovering a ring reads it. A click or a tap holds the reading until you press that ring again or press outside the rings. A touch drag does not read rings, so the page can still scroll.

`useRingChart` gives the ring being read to anything rendered inside the chart.

#### Keyboard

The plot takes focus. The arrow keys, Home and End move between rings, Enter or Space holds the reading, and Escape clears it. Moving to another ring lets go of a held reading. The legend's entries are buttons, reached with Tab.

#### Screen readers

Each ring is given as text beside the drawing, as its name and percentage, and a ring read with the keyboard is announced. `label` names the chart and `labelForDatum` writes a ring, for values with a unit.

#### Reduced motion

With reduced motion set, the rings appear at their values without sweeping, and a data change lands in one step.

## Example

```tsx
'use client';

import { useState } from 'react';
import { RingChart } from '@/components/panelui/ring-chart';
import { Frame } from '@/components/panelui/frame';

const GOALS = [
  { label: 'Move', value: 486, maxValue: 600 },
  { label: 'Exercise', value: 24, maxValue: 30 },
  { label: 'Stand', value: 9, maxValue: 12 },
];

export default function RingChartOverview() {
  const [active, setActive] = useState(-1);
  const ring = GOALS[active] ?? GOALS[0]!;

  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Activity</Frame.Title>
        <Frame.Action>Today</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <RingChart data={GOALS} size={208} onActiveIndexChange={setActive}>
          <RingChart.Header title={ring.label} value={`${ring.value} of ${ring.maxValue}`} />
          <RingChart.Ring index={0} />
          <RingChart.Ring index={1} />
          <RingChart.Ring index={2} />
          <RingChart.Center />
          <RingChart.Legend />
        </RingChart>
      </Frame.Panel>
    </Frame>
  );
}
```
