# Plot

A chart you assemble from marks on one shared scale, for the shapes the named charts do not cover.

```tsx
import { Plot } from "@/components/panelui/plot"
```

From npm the path is `panelui-web/plot`. Install with `npx shadcn@latest add @panelui/plot`.

## When to use it

Use `Plot` when you need a combination of marks that no named chart draws: columns with a line over them, a series against a shaded band, or a mark you wrote yourself. It measures a box and resolves one y-axis, and every part you put inside it draws on them, in the order they are written.

Reach for a named chart first. [Bar Chart](/docs/web/charts/bar-chart) and the others already decide where the baseline belongs and how loading reads, and a chart assembled here has to make those decisions itself.

It is marked alpha. The parts are settled, and the fields `usePlot` hands out are the part most likely to change.

## Usage

```tsx
<Plot data={months} xDataKey="month">
  <Plot.Grid />
  <Plot.Bars dataKey="revenue" color="info" />
  <Plot.Line dataKey="costs" color="primary" />
  <Plot.YAxis />
  <Plot.XAxis />
</Plot>
```

## Parts

```tsx
<Plot data={…}>
  <Plot.Header />    {/* the row above the drawing */}
  <Plot.Legend />    {/* a swatch and a name per mark */}
  <Plot.Grid />      {/* the rules the marks arrive into */}
  <Plot.Area />      {/* a series as a fill */}
  <Plot.Bars />      {/* a series as columns */}
  <Plot.Line />      {/* a series as a stroke */}
  <Plot.Dots />      {/* a dot per row */}
  <Plot.Layer />     {/* marks of your own, in SVG */}
  <Plot.Rule />      {/* a reference line, with a caption */}
  <Plot.YAxis />     {/* value labels down the side */}
  <Plot.XAxis />     {/* labels along the bottom */}
  <Plot.Cursor />    {/* reading the rows, and the line that follows */}
  <Plot.Tooltip />   {/* the readout that rides the cursor */}
  <Plot.Overlay />   {/* anything of yours that is text or takes a pointer */}
</Plot>
```

- `Plot.Header` — The row above the drawing: what the plot is of, and the one number worth reading. Pass `children` to replace it and keep only its place.
- `Plot.Legend` — A swatch and a name for every mark. `labels` maps a `dataKey` to a name. Without it the key itself is shown.
- `Plot.Grid` — Horizontal rules across the plot. They are outside the reveal, so the frame is there when the marks are uncovered.
- `Plot.Area` — A series as a fill down to the bottom of the plot. Write it before the line that belongs over it.
- `Plot.Bars` — A series as columns. Its presence puts the whole plot on a band scale, and zero on the axis. `opacity` takes a function to set it per row, and `minHeight` keeps a small value visible.
- `Plot.Line` — A series as a stroked path. `curve="monotone"` never overshoots between points, `linear` joins them straight, and `step` holds each value until the next point. A gap in the column breaks the line.
- `Plot.Dots` — A dot per row, ringed in the page colour so it reads on top of the line.
- `Plot.Rule` — A reference line at a value, or down the plot at a row when you pass `x`, with a caption. It hides itself when the value falls outside the axis.
- `Plot.Layer` — Marks of your own, in SVG, in the plot's pixels. They reach the geometry through `usePlot()`.
- `Plot.Overlay` — Anything of yours that is text or takes a pointer, laid over the drawing.
- `Plot.XAxis` — Labels along the bottom, each centred on the row it names and held inside the frame.
- `Plot.YAxis` — Value labels down the side, with room made for them. Give it the same `ticks` as the grid's `rows`, so every label has a line.
- `Plot.Cursor` — Reading the rows: hover, press or drag across them, or focus the chart and use the arrow keys. A click or tap pins the reading until the next press elsewhere or Escape. It draws the line that follows, which `showLine={false}` hides.
- `Plot.Tooltip` — The readout that rides the cursor. It needs a `Plot.Cursor` beside it. Pass a function as `children` to draw it yourself.

## Props

`Plot`, `Plot.Header`, `Plot.Legend` and `Plot.Overlay` also take the props of the element they render, and a `className`. `Plot.Tooltip` puts its `className` on the readout. The marks, `Plot.Grid`, `Plot.Layer` and `Plot.Cursor` take only the props listed.

#### `PlotProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly PlotDatum[]` | **required** | The rows. Each one is a position along the x-axis. |
| `xDataKey` | `string` | `'label'` | Key holding the x label. Used by the axis and the readout. |
| `status` | `PlotStatus` | `'ready'` | `loading` draws the frame and nothing in it, and reveals the marks when it turns `ready`. |
| `aspectRatio` | `number` | `2` | The plot's width ÷ height. `2` is the wide card shape, and `1.6` suits a narrow column. |
| `animationDuration` | `number` | `700` | Milliseconds for the plot to be uncovered. |
| `domainDuration` | `number` | `500` | Milliseconds for the marks and the y-axis to settle after the data changes. |
| `yDomain` | `[PlotBound, PlotBound]` | — | The y-domain, as `[low, high]`. Either end may be a number to pin it there or `auto` to take it from the data. `[0, 'auto']` keeps the baseline at zero while the top follows whatever arrives. |
| `nice` | `boolean` | `false` | Round the derived ends of the y-domain out to a step of 1, 2 or 5 times a power of ten, so the axis labels are values a reader can measure against. It only ever widens the axis, and a pinned end is left alone. |
| `xScale` | `PlotScale` | — | How an index becomes an x. Derived from the marks when left out: a plot with bars in it is banded, and anything else is on points. `Plot.Bars` always needs slices, so it keeps the plot banded even when this says `point`. |
| `curve` | `PlotCurve` | `'monotone'` | How series are joined between points, unless a mark overrides it. |
| `onActiveIndexChange` | `(index: number, datum: PlotDatum \| null) => void` | — | The row being read, and `-1`/`null` when there is none. This is how a readout outside the plot gets its value. Fires when the row changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the padding so the marks reach the edges, for a plot with no axis, grid or cursor. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: PlotDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its keys and values. |

#### `PlotSeriesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column of `data` this mark draws. |
| `color` | `PlotColor` | `'chart-1'` | A theme role by name, or any CSS colour. |

#### `PlotLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `strokeWidth` | `number` | `2.5` | Thickness of the stroke, in pixels. |
| `curve` | `PlotCurve` | `'monotone'` | `monotone` never overshoots between points, `linear` joins them straight, and `step` holds each value until the next point. The root's by default. |
| `dashArray` | `string` | — | Dash pattern, such as `"6 4"`, for a forecast or a series that is not real yet. |

#### `PlotAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `opacity` | `number` | `0.18` | Opacity of the fill. |
| `curve` | `PlotCurve` | — | `monotone` never overshoots between points, `linear` joins them straight, and `step` holds each value until the next point. The root's by default. |

#### `PlotBarsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `gap` | `number` | `0.35` | Fraction of each slice left empty, `0` to `1`. |
| `radius` | `number` | `4` | Rounds the end the bar grows towards, in pixels. |
| `opacity` | `number \| ((datum: PlotDatum, index: number) => number)` | `1` | Opacity of the fill. Pass a function to set it per row, to fade rows that have not happened yet or dim the ones not being read. |
| `minHeight` | `number` | `0` | The shortest a bar may be drawn, in pixels, so a small value beside a large one still shows. A value on the baseline draws no bar. The reading keeps the real value. |
| `baseline` | `number` | `0` | The value the columns grow from, for a chart of movement against a reference. It is clamped into the axis, so a baseline the domain does not cover falls back to the nearer edge. |

#### `PlotDotsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `number` | `3.5` | Radius, in pixels. |
| `ringWidth` | `number` | `2` | Ring around each dot in the page colour, so it reads on top of the line. |

#### `PlotGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `4` | Horizontal rules across the plot. Yields `rows + 1` lines. |
| `color` | `PlotColor` | — | A theme role by name, or any CSS colour. The border colour by default. |
| `dashArray` | `string` | `'4 6'` | Dash pattern, such as `"4 6"`. An empty string draws a solid rule. |
| `opacity` | `number` | `1` | Opacity of the lines. |

#### `PlotOverlayProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `PlotRuleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `y` | `number` | — | Where to draw it, in the data's own units. Wins if `x` is given too. |
| `x` | `number` | — | A row to draw a vertical rule at, by index: the day a change landed, the release being read against. |
| `label` | `string` | — | A name for what the line means. |
| `color` | `PlotColor` | — | A theme role by name, or any CSS colour, for the line and its caption. The foreground colour by default. |
| `strokeWidth` | `number` | `1` | Thickness in pixels. |
| `dashed` | `boolean` | `false` | Break the line into dashes, so it reads as an annotation rather than a series. |
| `opacity` | `number` | `1` | Fades the line and its caption together. |
| `labelPlacement` | `'start' \| 'end'` | `'end'` | Which end of the rule the caption sits at. |
| `labelClassName` | `string` | — | Added to the caption. |
| `className` | `string` | — | Added to the rule. |

#### `PlotXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | How many labels to show. The rest are dropped, evenly. |
| `format` | `(datum: PlotDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |
| `className` | `string` | — | Added to each label. |

#### `PlotYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | How many intervals to divide the axis into. Yields `ticks + 1` labels. Give it the same count as the grid. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `className` | `string` | — | Added to each label. |

#### `PlotCursorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `PlotColor` | — | A theme role by name, or any CSS colour. The foreground colour by default. |
| `showLine` | `boolean` | `true` | Hide the vertical line and keep only the reading. |

#### `PlotTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: PlotDatum) => string` | — | Format the heading from the row. Defaults to the value at `xDataKey`. |
| `className` | `string` | — | Added to the readout's surface. |

#### `PlotHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | A word for what the plot is of. |
| `value` | `ReactNode` | — | The figure, large. Usually the total, or the row being read. |
| `caption` | `ReactNode` | — | A line under the value. |

#### `PlotLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `Record<string, string>` | — | Names for the columns, keyed by `dataKey`. Falls back to the key itself. |

## In a Server Component

`Plot` is a client component. A Server Component cannot read `Plot.Header` off the import, so import each part by name: `PlotHeader`, `PlotLegend`, `PlotGrid`, `PlotArea`, `PlotBars`, `PlotLine`, `PlotDots`, `PlotRule`, `PlotLayer`, `PlotOverlay`, `PlotXAxis`, `PlotYAxis`, `PlotCursor`, `PlotTooltip`.

## Notes

Non-finite values are ignored when the domain and the marks are derived, and a non-finite `yDomain` end is treated as `auto`.

Every mark, including your layers, is uncovered by one clip, so they arrive as one drawing. With reduced motion the clip does not run and data changes land at once.

For a screen reader the rows are listed as text, using `label` and `labelForDatum`. Keep `format` and the other callbacks free to change between renders: they do not redraw the chart.

## Example

```tsx
'use client';

import { Plot } from '@/components/panelui/plot';

const MONTHS = [
  { month: 'Jan', revenue: 18400, costs: 12100 },
  { month: 'Feb', revenue: 21200, costs: 13300 },
  { month: 'Mar', revenue: 19800, costs: 14200 },
  { month: 'Apr', revenue: 24600, costs: 14800 },
  { month: 'May', revenue: 27100, costs: 16200 },
  { month: 'Jun', revenue: 25300, costs: 17100 },
  { month: 'Jul', revenue: 29800, costs: 17600 },
  { month: 'Aug', revenue: 31500, costs: 18900 },
];

const money = (value: number) => `$${(value / 1000).toFixed(1)}k`;

export default function PlotOverview() {
  return (
    <Plot data={MONTHS} xDataKey="month" aspectRatio={1.7} className="max-w-lg">
      <Plot.Header title="Revenue" value="$198.1k" />
      <Plot.Legend labels={{ costs: 'Costs', revenue: 'Revenue' }} />
      <Plot.Grid />
      <Plot.Bars dataKey="costs" color="info" />
      <Plot.Line dataKey="revenue" color="primary" />
      <Plot.Dots dataKey="revenue" color="primary" />
      <Plot.YAxis format={(value) => `$${Math.round(value / 1000)}k`} />
      <Plot.XAxis />
      <Plot.Cursor />
      <Plot.Tooltip formatValue={money} />
    </Plot>
  );
}
```
