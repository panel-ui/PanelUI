# Radar Chart

Several measures of one thing, drawn as one shape.

```tsx
import { RadarChart } from "@/components/panelui/radar-chart"
```

From npm the path is `panelui-web/radar-chart`. Install with `npx shadcn@latest add @panelui/radar-chart`.

## When to use it

Use it to show the profile of one thing across several measures, and to lay two profiles over each other. Each row of `data` is an axis, and each `RadarChart.Series` is a shape drawn from one of its keys.

The order of the axes changes the outline, and the outline is what people read. Keep the order the same between charts you compare. Three axes is the minimum, and past about eight the labels start to collide.

For data whose axes have no natural order, use a [Bar Chart](/docs/web/charts/bar-chart).

## Usage

```tsx
<RadarChart data={scores} axisKey="skill" domain={[0, 100]}>
  <RadarChart.Grid />
  <RadarChart.Axis />
  <RadarChart.Series dataKey="you" showDots />
  <RadarChart.Tooltip />
</RadarChart>
```

## Parts

```tsx
<RadarChart data={…}>
  <RadarChart.Header />
  <RadarChart.Grid />
  <RadarChart.Axis />
  <RadarChart.Series dataKey="…" />
  <RadarChart.Tooltip />
  <RadarChart.Legend />
</RadarChart>
```

- `RadarChart.Header` — The strip above the rings: `title`, `value` and `caption`, with the series key or your own control on the trailing side.
- `RadarChart.Grid` — The rings and the spokes. Polygons by default, and circles with `circular`.
- `RadarChart.Axis` — The axis names around the rings, each running away from the shape.
- `RadarChart.Series` — One shape. Declare one per key. Later ones draw on top.
- `RadarChart.Tooltip` — The reading for the nearest axis: the spoke lit, a dot per series, and each value in a readout. Without this part the chart does not show a reading.
- `RadarChart.Legend` — A swatch and a name per series, in the bottom-left corner of the plot. On a chart with a header, use the header's `legend` prop instead.

## Props

`RadarChart`, `RadarChart.Header` and `RadarChart.Legend` also take the props of the element they render, and a `className`. `RadarChart.Tooltip` takes a `className` for the readout. `RadarChart.Grid`, `RadarChart.Axis` and `RadarChart.Series` take only the props listed.

#### `RadarChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly RadarChartDatum[]` | **required** | One row per axis, in the order they go round, with one key per series. |
| `axisKey` | `string` | `'axis'` | The key holding each row's axis label. |
| `status` | `RadarChartStatus` | `'ready'` | `loading` draws the rings and no shape, and the shapes grow when it turns `ready`. |
| `size` | `number \| null` | `180` | Ring diameter in pixels, with room for the labels added around it. Pass `null` to fill the width at `aspectRatio`. |
| `aspectRatio` | `number` | `1` | Width over height of the plot when `size` is `null`. |
| `domain` | `readonly [number, number]` | — | The values at the centre and at the outer ring. Defaults to zero and just above the largest value. |
| `animationDuration` | `number` | `620` | Milliseconds for the shapes to grow. |
| `compact` | `boolean` | `false` | Drop the room for axis labels, for a chart without them. |
| `label` | `string` | — | Names the chart for screen readers. |
| `labelForDatum` | `(datum: RadarChartDatum, index: number) => string` | — | Writes one axis for screen readers, for values with a unit. |

#### `RadarChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rings` | `number` | — | How many rings, including the outermost. |
| `color` | `RadarChartColor` | — | Which of the theme's roles to draw it in. Defaults to the border colour. |
| `circular` | `boolean` | — | Draw the rings as circles rather than polygons through the spokes. |
| `spokes` | `boolean` | — | Draw a line from the centre to the rim along each axis. |

#### `RadarChartAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `RadarChartColor` | — | Which of the theme's roles to draw the labels in. Defaults to the muted text colour. |
| `fontSize` | `number` | — | Label size in pixels. |
| `offset` | `number` | — | Gap between the outer ring and the label, in pixels. |
| `formatLabel` | `(label: string, index: number) => string` | — | Rewrite a label, usually to shorten it. |

#### `RadarChartSeriesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | The key in each row holding this series' value. |
| `name` | `string` | — | What the legend, the readout and screen readers call it. Defaults to `dataKey`. |
| `color` | `RadarChartColor` | — | Which of the theme's roles to draw it in. Defaults to the chart palette, in the order the series are declared. |
| `strokeWidth` | `number` | — | Outline width in pixels. |
| `fillOpacity` | `number` | — | Opacity of the fill. Pass `0` for an outline only. |
| `showDots` | `boolean` | — | Draw a dot at each vertex. |

#### `RadarChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, dataKey: string) => string` | — | Format a value. Defaults to a compact number. |
| `className` | `string` | — | Added to the readout. |

#### `RadarChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatName` | `(dataKey: string) => string` | — | Rewrite a series' name. |

#### `RadarChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a caveat. |
| `legend` | `boolean` | — | Draw a swatch and a name per series along the trailing edge. |

## In a Server Component

`RadarChart` is a client component. A Server Component cannot read `RadarChart.Header` off the import, so import each part by name: `RadarChartHeader`, `RadarChartGrid`, `RadarChartAxis`, `RadarChartSeries`, `RadarChartTooltip`, `RadarChartLegend`.

## Notes

#### Sizing

`size` is the diameter of the outer ring, 180 pixels by default, and the plot adds room for the labels around it, so it is wider than it is tall. Pass `size={null}` to fill the container's width at `aspectRatio`. The drawing happens in the browser after it has been measured, so it is not in server-rendered HTML.

For labels that still crowd the shape, shorten them with `formatLabel`. A label with no room left ends in an ellipsis.

#### Colour

`color` on a series names a role in the theme. Without it, series take the chart colours in the order they are declared.

#### Missing values

A row without a number for a series is left out of that series' outline, and the outline joins the axes either side. A series with fewer than three numbers draws nothing.

#### Reading an axis

With `RadarChart.Tooltip`, hovering inside the rings reads the nearest axis. A click or a tap holds the reading until you press that axis again or press outside the rings. A touch drag does not read axes, so the page can still scroll.

#### Keyboard

The plot takes focus. The arrow keys move round the axes, Enter or Space holds the reading, and Escape clears it. Moving to another axis lets go of a held reading.

#### Screen readers

Each axis is given as text beside the drawing, with every series' value, and the reading is announced as it changes. `label` names the chart and `labelForDatum` writes an axis, for values with a unit.

#### Loading

With `status="loading"` the rings are drawn with no shape, and the shapes grow when it turns `ready`.

#### Reduced motion

With reduced motion set, the shapes appear at their full size, and a data change lands in one step.

## Example

```tsx
'use client';

import { RadarChart } from '@/components/panelui/radar-chart';
import { Frame } from '@/components/panelui/frame';

const SCORES = [
  { skill: 'Speed', you: 82, team: 64 },
  { skill: 'Reach', you: 54, team: 72 },
  { skill: 'Depth', you: 71, team: 58 },
  { skill: 'Cost', you: 38, team: 66 },
  { skill: 'Care', you: 64, team: 49 },
  { skill: 'Risk', you: 46, team: 30 },
];

export default function RadarChartOverview() {
  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Your profile</Frame.Title>
        <Frame.Action>Q3</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <RadarChart data={SCORES} axisKey="skill" domain={[0, 100]} label="Your scores out of 100">
          <RadarChart.Grid />
          <RadarChart.Axis />
          <RadarChart.Series dataKey="you" name="You" showDots />
          <RadarChart.Tooltip />
        </RadarChart>
      </Frame.Panel>
    </Frame>
  );
}
```
