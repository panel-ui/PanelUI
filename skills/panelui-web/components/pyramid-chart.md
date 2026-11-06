# Pyramid Chart

Two series mirrored about a centre line, one row per category, on one shared scale.

```tsx
import { PyramidChart } from "@/components/panelui/pyramid-chart"
```

From npm the path is `panelui-web/pyramid-chart`. Install with `npx shadcn@latest add @panelui/pyramid-chart`.

## When to use it

Use it to compare two series row by row, such as men and women by age band. Each row has a bar going left and a bar going right from a centre line.

Both sides use the same scale, taken from the larger of the two series, so a bar twice as long as the one facing it means twice as much.

For two series side by side rather than back to back, use a [Bar Chart](/docs/web/charts/bar-chart).

## Usage

```tsx
<PyramidChart data={penguins} xDataKey="species">
  <PyramidChart.Grid />
  <PyramidChart.Bar dataKey="male" side="start" />
  <PyramidChart.Bar dataKey="female" side="end" />
  <PyramidChart.XAxis />
  <PyramidChart.YAxis />
  <PyramidChart.Tooltip />
</PyramidChart>
```

## Parts

```tsx
<PyramidChart data={…}>
  <PyramidChart.Header />
  <PyramidChart.Grid />
  <PyramidChart.Skeleton />
  <PyramidChart.Bar side="start" />
  <PyramidChart.Bar side="end" />
  <PyramidChart.XAxis />
  <PyramidChart.YAxis />
  <PyramidChart.Tooltip />
  <PyramidChart.Legend />
</PyramidChart>
```

- `PyramidChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the legend or your own control on the trailing side. The value is a string you pass, so it can follow `onActiveIndexChange`.
- `PyramidChart.Grid` — Dashed lines at each step on both wings, and a solid line down the middle. `columns` is how many lines per wing.
- `PyramidChart.Skeleton` — Equal stubs either side of the centre, with a highlight moving across them, drawn only while `status` is `loading`.
- `PyramidChart.Bar` — One wing. `side` decides which, and the default colour differs per side, so two bars with only a key and a side are already told apart.
- `PyramidChart.XAxis` — The value labels along the bottom: the same values twice, either side of a zero in the middle. `ticks` is how many per wing.
- `PyramidChart.YAxis` — The category names, one per row. `labelPlacement` on the chart decides where they sit.
- `PyramidChart.Tooltip` — The readout, and the reading of a row by hover, press, drag or arrow keys. The other rows fade while one is read.
- `PyramidChart.Legend` — A swatch and a name per series, over the plot's top corner. On a chart with a header, use the header's `legend` instead.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `PyramidChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly PyramidChartDatum[]` | **required** | The rows. Each one is a band across the chart, with a wing either side. |
| `xDataKey` | `string` | `'name'` | Key holding the category label. Used by the axis and the readout. |
| `status` | `PyramidChartStatus` | `'ready'` | `loading` holds the bars at the centre and grows them out when it turns `ready`. Add a `PyramidChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `1.2` | The plot's width ÷ height. `1.2` suits three or four rows in a card. |
| `animationDuration` | `number` | `700` | Milliseconds for the bars to grow out. |
| `domainDuration` | `number` | `500` | Milliseconds for the bars to settle after the data changes. |
| `maxValue` | `number` | — | Fix the far end of the shared scale instead of deriving it. The near end is zero either way. |
| `labelPlacement` | `PyramidChartLabelPlacement` | `'above'` | Where the category names sit. `above` gives each row a line of its own over its pair of bars. `center` puts them in a gutter between the wings, and `start` down the left edge. |
| `barGap` | `number` | `0.25` | Fraction of each band left empty, `0` to `1`. |
| `barWidth` | `number` | — | Largest bar thickness in pixels. Derived from the band when omitted. |
| `cornerRadius` | `number` | `4` | Corner radius on the outward end of a bar. |
| `minBarLength` | `number` | `0` | Smallest length a positive bar is drawn at, in pixels. |
| `fadedOpacity` | `number` | `0.3` | Opacity of the rows that are not being read. |
| `onActiveIndexChange` | `(index: number, datum: PyramidChartDatum \| null) => void` | — | The row being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: PyramidChartDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its keys and values. |

#### `PyramidChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `columns` | `number` | `2` | How many lines to draw on each wing. |
| `dashArray` | `string` | `'4 6'` | The stroke's dash pattern. |
| `opacity` | `number` | `1` | Opacity of the lines. |
| `centreLine` | `boolean` | `true` | Draw the solid line down the middle. A gutter between the wings leaves it out. |

#### `PyramidChartBarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. |
| `side` | `PyramidChartSide` | `'end'` | Which wing it grows into. |
| `color` | `PyramidChartColor` | — | Which of the theme's roles the series is drawn in. Defaults to a different one per side, so two bars with nothing but a key and a side are told apart. |
| `cornerRadius` | `number` | — | Corner radius, overriding the chart's. |

#### `PyramidChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | — | How many placeholder rows to draw. Defaults to one per row of data, and to five when the data has not arrived. |
| `duration` | `number` | `1400` | Milliseconds for one pass of the sweep. |

#### `PyramidChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `2` | How many labels per wing, not counting the zero in the middle. |
| `format` | `(value: number) => string` | — | Format a value for its label. Defaults to a compact number. |
| `className` | `string` | — | Added to the layer holding the labels. |

#### `PyramidChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `format` | `(datum: PyramidChartDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |
| `className` | `string` | — | Added to the layer holding the names. |

#### `PyramidChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: PyramidChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `className` | `string` | — | Added to the readout's surface. |

#### `PyramidChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys. |

#### `PyramidChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a total. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. Prefer this to `PyramidChart.Legend` on a chart that has a header: the legend sits over the plot, in the corner the bars also want. |

## In a Server Component

`PyramidChart` is a client component. A Server Component cannot read `PyramidChart.Header` off the import, so import each part by name: `PyramidChartHeader`, `PyramidChartGrid`, `PyramidChartBar`, `PyramidChartSkeleton`, `PyramidChartXAxis`, `PyramidChartYAxis`, `PyramidChartTooltip`, `PyramidChartLegend`.

## Notes

#### Sizing

The chart fills its container's width and takes the plot's height from `aspectRatio`, so a header does not shrink it. Height has nothing to do with how many rows there are: to shorten a tall chart raise `aspectRatio`, because removing rows only makes the bars thicker.

The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### Bundle size

The chart adds about 60 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Data

The far end of the scale is the largest value in either series, rounded up to a step that halves cleanly. The near end is zero and cannot be moved, because a bar cropped at its base misreports its value.

Which side a series is on comes from `side`, not from the sign of its numbers. A negative value is drawn as nothing and still appears in the readout, so a data error shows as a gap.

#### Colour

`color` on a bar names a role in the theme. Without it, the start wing is `chart-2` and the end wing is `chart-1`.

#### Reading a row

Hovering anywhere in a row reads it, and the other rows fade. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the rows it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the row changes, not on every frame, so it can drive a readout outside the chart, as the first example does. Inside the chart, `usePyramidChart` gives the same row.

#### Keyboard

The chart takes focus. The arrow keys walk the rows, Home and End go to the first and last, and Escape clears the reading.

#### Screen readers

Each row is given as text beside the drawing. `label` names the chart and `labelForDatum` writes a row, for values with a unit. Without it a row is read as its keys and values.

#### Reduced motion

With reduced motion set, the bars appear at their final lengths and the skeleton's highlight stays still.

## Example

```tsx
'use client';

import { useState } from 'react';
import { PyramidChart, type PyramidChartDatum } from '@/components/panelui/pyramid-chart';
import { Frame } from '@/components/panelui/frame';

const PENGUINS = [
  { species: 'Adelie', male: 73, female: 73 },
  { species: 'Chinstrap', male: 34, female: 34 },
  { species: 'Gentoo', male: 61, female: 58 },
];

const LABELS = { male: 'Male', female: 'Female' };

export default function PyramidChartOverview() {
  const [active, setActive] = useState<PyramidChartDatum | null>(null);
  const total = active ? Number(active.male) + Number(active.female) : 333;

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Penguins observed</Frame.Title>
        <Frame.Action>Hover to read</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <PyramidChart
          data={PENGUINS}
          xDataKey="species"
          aspectRatio={1.4}
          onActiveIndexChange={(_index, datum) => setActive(datum)}
        >
          <PyramidChart.Header
            value={String(total)}
            caption={active ? String(active.species) : 'Three species'}
            labels={LABELS}
            legend
          />
          <PyramidChart.Grid />
          <PyramidChart.Bar dataKey="male" side="start" />
          <PyramidChart.Bar dataKey="female" side="end" />
          <PyramidChart.XAxis />
          <PyramidChart.YAxis />
          <PyramidChart.Tooltip labels={LABELS} />
        </PyramidChart>
      </Frame.Panel>
    </Frame>
  );
}
```
