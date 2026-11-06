# Polar Area Chart

Several readings compared on one measure, as a dial.

```tsx
import { PolarAreaChart } from "@/components/panelui/polar-area-chart"
```

From npm the path is `panelui-web/polar-area-chart`. Install with `npx shadcn@latest add @panelui/polar-area-chart`.

## When to use it

Use it for a handful of readings on one scale when the overall shape matters: which direction the weight sits in, or whether one reading runs away from the rest. Every wedge takes the same angle and the radius carries the value, so the values do not have to add up to anything.

A wedge worth twice another covers four times the area under the default scale, and area is what the eye adds up first. Set `scale="area"` to make the ink proportional to the value, at the cost of unevenly spaced rings.

To rank the readings, use a [Bar Chart](/docs/web/charts/bar-chart). For parts of one total, use a [Pie Chart](/docs/web/charts/pie-chart).

## Usage

```tsx
<PolarAreaChart data={scores} size={240}>
  <PolarAreaChart.Grid />
  <PolarAreaChart.Wedges />
  <PolarAreaChart.Labels />
  <PolarAreaChart.Tooltip />
  <PolarAreaChart.Legend />
</PolarAreaChart>
```

## Parts

```tsx
<PolarAreaChart data={…}>
  <PolarAreaChart.Header />
  <PolarAreaChart.Skeleton />
  <PolarAreaChart.Grid />
  <PolarAreaChart.Wedges />
  <PolarAreaChart.Labels />
  <PolarAreaChart.Tooltip />
  <PolarAreaChart.Legend />
</PolarAreaChart>
```

- `PolarAreaChart.Header` — The strip above the dial: `title`, `value` and `caption`, with a colour key or your own control on the trailing side.
- `PolarAreaChart.Grid` — The rings, each at the value it stands for, with optional spokes along the wedge edges.
- `PolarAreaChart.Wedges` — Every wedge, in data order. The chart draws nothing without this part. Its props set the rounding and the dimming.
- `PolarAreaChart.Labels` — The value on each wedge that reaches at least `minRadius`, in black or white to suit the wedge's colour.
- `PolarAreaChart.Tooltip` — The name and value of the wedge being read, over the dial. This is how the short, unlabelled wedges are named.
- `PolarAreaChart.Legend` — A swatch, a name and a value per wedge, under the dial. Each entry is a button that reads its wedge.
- `PolarAreaChart.Skeleton` — One plain disc while `status` is `loading`.

## Props

`PolarAreaChart`, `PolarAreaChart.Header`, `PolarAreaChart.Legend` and `PolarAreaChart.Skeleton` also take the props of the element they render, and a `className`. `PolarAreaChart.Labels` and `PolarAreaChart.Tooltip` take a `className` for each label and for the readout. `PolarAreaChart.Grid` and `PolarAreaChart.Wedges` take only the props listed.

#### `PolarAreaChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly PolarAreaDatum[]` | **required** | One entry per wedge, drawn clockwise in the order they are listed. |
| `size` | `number` | — | Diameter in pixels. Without it the chart fills its container's width as a square. |
| `maxValue` | `number` | — | The value the outermost ring stands for. Defaults to a round number above the largest value. |
| `scale` | `PolarAreaScale` | `'radius'` | `radius` puts the value on the radius, `area` on the ink. |
| `startAngle` | `number` | `0` | Where the first wedge begins, in degrees clockwise from twelve o'clock. |
| `padAngle` | `number` | `0` | Gap between one wedge and the next, in degrees. |
| `status` | `PolarAreaChartStatus` | `'ready'` | `loading` shows `PolarAreaChart.Skeleton`, then the wedges grow when it turns `ready`. |
| `animationDuration` | `number` | `620` | Milliseconds for the wedges to grow, and to move when `data` changes. |
| `activeIndex` | `number` | — | The wedge being read. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number) => void` | — | Fires when the reading changes, from a hover, a key or a press, with `-1` when it ends. |
| `label` | `string` | — | Names the chart for screen readers. |
| `labelForDatum` | `(datum: PolarAreaDatum, index: number) => string` | — | Writes one wedge for screen readers, for a value with a unit. |

#### `PolarAreaChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rings` | `number` | — | How many rings, including the outermost. |
| `color` | `PolarAreaChartColor` | — | Which of the theme's roles to draw it in. Defaults to the border colour. |
| `spokes` | `boolean` | — | Draw a line from the centre out along each wedge's edge. |

#### `PolarAreaChartWedgesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cornerRadius` | `number` | — | Rounds the turns of each wedge, in pixels. |
| `dimOpacity` | `number` | — | Opacity of the other wedges while one is read. |

#### `PolarAreaChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, datum: PolarAreaDatum) => string` | — | Format the value. Defaults to a compact number. |
| `minRadius` | `number` | — | Wedges reaching less far than this, in pixels, are left unlabelled. |
| `className` | `string` | — | Added to each label. |

#### `PolarAreaChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, datum: PolarAreaDatum) => string` | — | Format the value. Defaults to a compact number. |
| `className` | `string` | — | Added to the readout. |

#### `PolarAreaChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `PolarAreaChartColor` | — | Which of the theme's roles to draw the disc in. Defaults to the muted surface. |

#### `PolarAreaChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showValue` | `boolean` | — | Show each wedge's reading beside its name. |
| `formatValue` | `(value: number, datum: PolarAreaDatum) => string` | — | Format the value. Defaults to a compact number. |

#### `PolarAreaChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a caveat. |
| `labels` | `Record<string, string>` | — | Prettier names for the wedges, keyed by their `label`. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per wedge along the trailing edge, for two or three short names. |

## In a Server Component

`PolarAreaChart` is a client component. A Server Component cannot read `PolarAreaChart.Header` off the import, so import each part by name: `PolarAreaChartHeader`, `PolarAreaChartGrid`, `PolarAreaChartWedges`, `PolarAreaChartLabels`, `PolarAreaChartTooltip`, `PolarAreaChartLegend`, `PolarAreaChartSkeleton`.

## Notes

#### Sizing

The chart takes `size` as its diameter, or fills its container's width as a square without it. The plot draws in the browser after it has been measured, so it is not in server-rendered HTML.

#### Colour

`color` on a datum names a role in the theme. Without it, wedges take the five chart colours in order, and a sixth wedge repeats the first.

#### Reading a wedge

Hovering a wedge reads it. A click or a tap holds the reading until you press that wedge again or press outside the wedges. A touch drag does not read wedges, so the page can still scroll.

`usePolarAreaChart` gives the wedge being read to anything rendered inside the chart.

#### Keyboard

The plot takes focus. The arrow keys move between wedges, Enter or Space holds the reading, and Escape clears it. Moving to another wedge lets go of a held reading. The legend's entries are buttons, reached with Tab.

#### Screen readers

Each wedge is given as text beside the drawing, as its name and value, and the reading is announced as it changes. `label` names the chart and `labelForDatum` writes a wedge, for values with a unit.

#### Reduced motion

With reduced motion set, the wedges appear at their full reach, and a data change lands in one step.

#### Zero and negative values

A negative value counts as zero. A wedge at zero draws nothing, though the arrow keys and the legend still reach it.

## Example

```tsx
'use client';

import { PolarAreaChart } from '@/components/panelui/polar-area-chart';
import { Frame } from '@/components/panelui/frame';

const SCORES = [
  { label: 'Speed', value: 82 },
  { label: 'Reach', value: 54 },
  { label: 'Depth', value: 71 },
  { label: 'Cost', value: 28 },
  { label: 'Care', value: 64 },
];

export default function PolarAreaChartOverview() {
  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Team scores</Frame.Title>
        <Frame.Action>Q3</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <PolarAreaChart data={SCORES} size={240}>
          <PolarAreaChart.Grid />
          <PolarAreaChart.Wedges />
          <PolarAreaChart.Labels />
          <PolarAreaChart.Tooltip />
          <PolarAreaChart.Legend />
        </PolarAreaChart>
      </Frame.Panel>
    </Frame>
  );
}
```
