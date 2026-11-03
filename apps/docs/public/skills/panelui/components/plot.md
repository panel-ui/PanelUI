# Plot

A chart you assemble out of its marks.
> **Alpha.** This API is still moving.


```tsx
import { Plot } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Plot } from '@/components/ui/plot';
```

### Anatomy

```tsx
<Plot data={…}>
  <Plot.Header />    {/* the row above the drawing */}
  <Plot.Legend />    {/* a swatch and a name per mark */}
  <Plot.Grid />      {/* the rules the marks arrive into */}
  <Plot.Area />      {/* a series as a fill */}
  <Plot.Bars />      {/* a series as columns */}
  <Plot.Line />      {/* a series as a stroke */}
  <Plot.Dots />      {/* a dot per row */}
  <Plot.Layer />     {/* marks of your own, in the SVG tree */}
  <Plot.Rule />      {/* a reference line, with a caption */}
  <Plot.YAxis />     {/* value labels down the side */}
  <Plot.XAxis />     {/* labels along the bottom */}
  <Plot.Cursor />    {/* the drag, and the line that follows it */}
  <Plot.Tooltip />   {/* the readout that rides the cursor */}
  <Plot.Overlay />   {/* anything of yours that is text or takes a touch */}
</Plot>
```

### Parts

- `Plot.Header` — The row above the drawing — what the plot is of, and the one number worth reading. Pass `children` to replace it entirely and keep only its place.
- `Plot.Legend` — A swatch and a name for every mark that registered. `labels` maps a `dataKey` to something a reader recognises; without it the key itself is shown.
- `Plot.Grid` — Horizontal rules across the plot. Drawn outside the reveal, so the frame is already there when the marks are uncovered into it.
- `Plot.Area` — A series as a fill down to the baseline. Write it before the line it belongs under — the order the marks are written is the order they are drawn.
- `Plot.Bars` — A series as columns, all of them in one path. Its presence puts the whole plot on a band scale unless `xScale` says otherwise: a bar centred on the plot's edge is a bar half of which is outside it.
- `Plot.Line` — A series as a stroked path. `curve="monotone"` never overshoots between points; `linear` joins them straight. `dashArray` is for a series that is not real yet — a forecast, a projection.
- `Plot.Dots` — A dot per row, ringed in the page colour so it reads on top of the line rather than in it. For a series short enough that its individual points are worth marking.
- `Plot.Rule` — A reference line across the plot at a value — a target, a limit, an average — with a caption naming it. Pass `x` instead of `y` for a rule down the plot at a row: the release the numbers are read against, the day a change landed. A view rather than an SVG line, so the caption is real text; it hides itself when the value falls outside the axis rather than pinning to the edge and claiming a number the chart does not cover.
- `Plot.Layer` — Marks of your own, dropped into the SVG tree where they are written. They reach the geometry through `usePlot()` rather than being handed it, because a mark that animates holds hooks and a render prop is not a component.
- `Plot.Overlay` — Anything of yours that is text or takes a touch, laid over the drawing. SVG text ignores the platform's text scaling and the theme's font, and a gesture handler cannot be attached to an SVG node at all.
- `Plot.XAxis` — Labels along the bottom, each centred on the row it names and clamped inside the frame.
- `Plot.YAxis` — Value labels down the side, one per grid line. Give it the same `ticks` as the grid, or the numbers name lines that are not there. It reads the domain the data settles at rather than the tweening one, so the axis holds still enough to read.
- `Plot.Cursor` — The drag, and the line that follows it. The hit area is the whole plot — a cursor you have to land on the line to summon is one nobody finds. Split from the readout because a plot whose value is shown in its own header wants this and no label.
- `Plot.Tooltip` — The readout that rides the cursor. Needs a `Plot.Cursor` beside it, which owns the gesture; on its own it never appears. Pass a function as `children` to draw it yourself.

### Props

#### `PlotProps`

Extends `ViewProps, ChartAccessibilityProps<PlotDatum>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `PlotDatum[]` | **required** | The rows. Each one is a position along the x-axis. |
| `xDataKey` | `string` | `label` | Key holding the x label. Used by the axis and the readout. |
| `status` | `PlotStatus` | `ready` | `loading` draws the frame and nothing in it, and reveals the marks when it turns `ready`. One component throughout rather than a spinner swapped for a chart — swapping loses the transition. |
| `aspectRatio` | `number` | `2` | Width ÷ height. `2` is the wide card shape; `1.6` suits a narrow column. |
| `animationDuration` | `number` | `700` | Milliseconds for the plot to be uncovered on mount. |
| `domainDuration` | `number` | `500` | Milliseconds for the y-axis to settle after the data changes. |
| `yDomain` | `[PlotBound, PlotBound]` | — | The y-domain, as `[low, high]`. Either end may be a number to pin it there or `auto` to take it from the data. Pinning one end is the case this exists for: `[0, 'auto']` keeps the baseline at zero, which a chart of lengths needs — a bar cropped at the bottom is a length that lies — while still letting the top follow whatever arrives. |
| `nice` | `boolean` | `false` | Round the derived ends of the y-domain out to whole numbers. Left off, an axis ends a tenth of the span past the largest value, so it gets labelled 34,650 — true, and not a number anybody was looking for. On, the ends move out to a step of 1, 2 or 5 times a power of ten, and the labels become values a reader can measure against. It only ever widens the axis, and a pinned end is left alone. |
| `xScale` | `PlotScale` | — | How an index becomes an x. Derived from the marks when left out: a plot with bars in it is banded, and anything else is on points. |
| `curve` | `PlotCurve` | `monotone` | How series are joined between points, unless a mark overrides it. |
| `onActiveIndexChange` | `(index: number, datum: PlotDatum \| null) => void` | — | The row under the cursor as it moves, and `-1`/`null` when the finger lifts. This is how a readout *outside* the plot gets its value — that header is not inside this provider, so it cannot use `usePlotCursor`. |
| `compact` | `boolean` | `false` | Drop the padding so the marks reach the edges — for a plot with no axis, grid or cursor, where the shape is the whole point. |
| `children` | `ReactNode` | — | — |

#### `PlotGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | — | Horizontal rules across the plot. |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | Dash pattern, e.g. `"4,6"`. Omit for a solid rule. |
| `opacity` | `number` | `0.18` | — |

#### `PlotSeriesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column of `data` this mark draws. |
| `color` | `string` | — | Overrides the theme token. |
| `colorIndex` | `number` | `1` | Which `--color-chart-*` token to take, `1` to `5`. |

#### `PlotLineProps`

Extends `PlotSeriesProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `strokeWidth` | `number` | `2.5` | — |
| `curve` | `PlotCurve` | `monotone` | `monotone` never overshoots between points; `linear` joins them straight. |
| `dashArray` | `string` | — | Dash pattern, e.g. `"6,4"` — for a forecast, or a series that is not real. |

#### `PlotAreaProps`

Extends `PlotSeriesProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `opacity` | `number` | `0.18` | — |
| `curve` | `PlotCurve` | `monotone` | — |

#### `PlotBarsProps`

Extends `PlotSeriesProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `gap` | `number` | `0.35` | Fraction of each slice left empty, `0` to `1`. |
| `radius` | `number` | `4` | Rounds the end the bar grows towards, in points. |
| `opacity` | `number` | `0.18` | — |
| `baseline` | `number` | `0` | The value the columns grow from. Zero by default, and zero is nearly always right — a bar is a length, and a length has to start where the quantity does. Set it for the case where the reader is being shown movement rather than size: temperatures against a seasonal average, a score against a pass mark. Columns then run up and down from that line instead of all standing on the floor. It is clamped into the axis, so a baseline the domain does not cover falls back to the nearer edge. |

#### `PlotDotsProps`

Extends `PlotSeriesProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `number` | `3.5` | Radius, in points. |
| `ringWidth` | `number` | `2` | Ring around each dot, so it reads on top of the line rather than in it. |

#### `PlotLayerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `PlotOverlayProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PlotRuleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `y` | `number` | — | Where to draw it, in the data's own units. Omit it and pass `x` instead for a rule down the plot rather than across it. |
| `x` | `number` | — | A row to draw a vertical rule at, by index — the release the numbers are read against, the day a change landed. The x axis here carries positions rather than quantities, so this is which row rather than what value. Exactly one of `y` and `x` is drawn; `y` wins if both are given. |
| `label` | `string` | — | A name for what the line means. Nothing is drawn without one. |
| `color` | `string` | — | Overrides the line *and* its caption, so the two cannot drift apart. |
| `strokeWidth` | `number` | `2.5` | Thickness in points. |
| `dashed` | `boolean` | `false` | Break the line into dashes, for a rule that should read as an annotation rather than as a series the chart is drawing. |
| `opacity` | `number` | `0.18` | Fades the line and its caption together. |
| `labelPlacement` | `'start' \| 'end'` | `end` | Which end of the rule the caption sits at. |
| `labelClassName` | `string` | — | — |
| `className` | `string` | — | — |

#### `PlotXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show. The rest are dropped, evenly. |
| `format` | `(datum: PlotDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |
| `className` | `string` | — | — |

#### `PlotYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many intervals to divide the axis into. Yields `ticks + 1` labels. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `PlotCursorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |
| `showLine` | `boolean` | `true` | Hide the vertical line and keep only the touch handling. |
| `activateAfterLongPress` | `number` | `180` | How long a press has to be held before the cursor takes the touch, in milliseconds. Until then the touch belongs to whatever else wants it: a quick tap still reaches a button floating over the chart, and a swipe still scrolls the screen the chart sits in. Set `0` to read on contact, only for a chart with nothing over it and no scroll view around it. |

#### `PlotTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: PlotDatum) => string` | — | Format the heading from the row. Defaults to the value at `xDataKey`. |
| `children` | `(datum: PlotDatum, index: number) => ReactNode` | — | Draw the readout yourself, given the row under the cursor. |
| `className` | `string` | — | — |

#### `PlotHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | A word for what the plot is of. |
| `value` | `string` | — | The figure, large. Usually the total, or the row under the cursor. |
| `caption` | `string` | — | A line under the value. |
| `children` | `ReactNode` | — | Replaces the whole header, keeping only its place above the drawing. |

#### `PlotLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `labels` | `Record<string, string>` | — | Names for the columns, keyed by `dataKey`. Falls back to the key itself. |

### Example — Two marks, one scale

The domain is derived from every mark that registered, so two quantities on one plot are drawn against one axis. That is the reason to compose rather than to stack two charts: two scales drawn over each other look like a comparison and are not one.

**Both marks have to be in the same unit.** Revenue and costs are money and the gap between them is the margin — reading that off the chart is the point. Revenue and *order counts* are not: hundreds and tens of thousands on one linear axis puts the smaller series flat along the floor, where it says nothing. There is no second axis; draw the second quantity as its own plot.

Order is drawing order. The line is written after the columns, so it is drawn over them.

```tsx
<Plot data={months} xDataKey="month" aspectRatio={1.7}>
  <Plot.Header title="Revenue" value={money(total)} />
  <Plot.Legend labels={{ revenue: 'Revenue', costs: 'Costs' }} />
  <Plot.Grid />
  <Plot.Bars dataKey="revenue" colorIndex={2} />
  <Plot.Line dataKey="costs" colorIndex={1} curve="linear" />
  <Plot.Dots dataKey="costs" colorIndex={1} />
  <Plot.YAxis />
  <Plot.XAxis ticks={6} />
</Plot>
```

### Notes

Non-finite series values are ignored when the domain and marks are derived. A non-finite `yDomain` end is treated as `auto`, so malformed telemetry cannot push the plot geometry to infinity.

### The reveal is shared

Every mark is drawn inside one clip rectangle that widens on mount, so the columns, the fill and the line arrive as one drawing rather than as three effects starting together. A composed chart is more at risk of that than a fixed one, which is why the clip lives on the root and not on the marks.

It plays once. Sending `status` back to `loading` and returning it to `ready` arms it again, so a refetch is uncovered rather than appearing whole on the frame the data lands.

### What registers, and why

`Plot.Line`, `Plot.Area`, `Plot.Bars` and `Plot.Dots` each register their `dataKey` and colour with the root. That is what the derived domain measures and what the legend and the readout list. Multiple marks may share one key — an area, line and dots for the same series register independently, so removing one does not remove the survivors from the domain or legend. Data keys are ordinary strings and may contain punctuation, including `|`. A mark drawn through `Plot.Layer` registers nothing — it is not reading a column the root knows about — so give the root a `yDomain` if what you drew has to fit inside the axis.

### Reference lines

`Plot.Rule` is drawn at full strength in the foreground colour. A target nobody can read is a target the chart is not stating, so what keeps a rule from being mistaken for a series is that it is neutral and, with `dashed`, broken — not that it is faint. `color` moves the line and its caption together, so the two cannot end up disagreeing about what the rule means.

`labelPlacement` puts the caption at either end. `y` draws across the plot at a value; `x` draws down it at a row, by index, for the release or the deploy the numbers either side are being read against.

### Round numbers on the axis

An axis derived from the data ends where the data ended, which is how a chart comes to be labelled 34,650. `nice` rounds the derived ends out to a step of 1, 2 or 5 times a power of ten, so the labels are values a reader can measure a bar against. It only widens, never crops, and a pinned end is left where it was put — `yDomain={[0, 'auto']}` with `nice` keeps the baseline at zero and rounds only the top.

### Colours

`colorIndex` picks one of the five `--color-chart-*` tokens, so a plot follows the active theme and is put on brand by overriding those five in your own `global.css`. `color` overrides it with a literal, which is right for a mark whose colour carries meaning of its own.

### One axis, and only one

There is no secondary axis and no plan for one. Two scales on one drawing is the chart mistake that survives review most often, because it looks like a comparison from across the room and falls apart the moment anyone reads the numbers. Two quantities in different units are two plots.

### Accessibility

The SVG drawing is decorative. `Plot` exposes one chart summary and one structured entry per row using the registered series keys. Use `accessibilityLabel` and `accessibilityHint` for domain context, `accessibilityLabelForDatum` for custom spoken language, and `onAccessibilityDatumPress` when a row has an equivalent action. Set `accessible={false}` only when the same data is already presented nearby.

---

Full page, with every example: https://panelui.dev/docs/charts/plot
