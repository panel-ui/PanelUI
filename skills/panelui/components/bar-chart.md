# BarChart

Categories compared by length, grouped or stacked.

```tsx
import { BarChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { BarChart } from '@/components/ui/bar-chart';
```

### Anatomy

```tsx
<BarChart>
  <BarChart.Grid />                     {/* lines across the value axis */}
  <BarChart.Bar dataKey="…" />          {/* one per series */}
  <BarChart.Skeleton />                 {/* while status="loading" */}
  <BarChart.XAxis />                    {/* category labels, under the bands */}
  <BarChart.YAxis />                    {/* value labels, down the side */}
  <BarChart.Legend />
  <BarChart.Tooltip />                  {/* the drag, and the readout */}
</BarChart>
```

### Parts

- `BarChart.Header`
- `BarChart.Grid` — Lines across the value axis, so a bar can be read against a number and not only against the bar beside it.
- `BarChart.Bar` — One series. Every bar in it is a subpath of a single animated path, split in two so the band under the finger keeps full ink while the rest fade.
- `BarChart.Skeleton` — A row of short, equal stubs on the baseline with a sweep across them, shown while `status="loading"`.
- `BarChart.XAxis` — Category labels under the bands. Real text, so they follow the theme’s font and the platform’s text scaling.
- `BarChart.YAxis` — Value labels down the side. The chart reserves a gutter for them, rather than drawing them over the plot.
- `BarChart.Tooltip` — The drag that selects a band, and the card that reports it. The card follows whichever axis the bands run along — across the plot when the bars grow up, down it when they grow right — so it always sits beside the bar it is describing.
- `BarChart.Legend` — A swatch and a name per series.

### Props

#### `BarChartProps`

Extends `ViewProps, ChartAccessibilityProps<BarChartDatum>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `BarChartDatum[]` | **required** | The rows. Each one is a band along the category axis. |
| `xDataKey` | `string` | `name` | Key holding the category label. Used by the axis and the readout. |
| `status` | `BarChartStatus` | `ready` | `loading` holds the bars at the baseline and grows them into the real ones when it turns `ready`. One component throughout, rather than a spinner swapped for a chart — swapping loses the transition. Add a `BarChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `2` | Width ÷ height. `2` is the wide card shape. |
| `animationDuration` | `number` | `700` | Milliseconds for the bars to grow in on mount. |
| `domainDuration` | `number` | `500` | Milliseconds for the value axis to settle after the data changes. |
| `yDomain` | `[number, number]` | — | Fix the value axis instead of deriving it. Note that the derived domain always includes zero, and a domain that does not is a bar chart whose lengths cannot be compared — pass this only when you mean it. |
| `orientation` | `BarChartOrientation` | `vertical` | `vertical` grows the bars upward; `horizontal` grows them rightward. |
| `stacked` | `boolean` | `false` | Stack the series on each other instead of standing them side by side. |
| `barGap` | `number` | `0.2` | Fraction of each band left empty, `0` to `1`. A fraction rather than a pixel gap so the proportions hold at any width. |
| `barWidth` | `number` | — | Fixed bar thickness in points. Derived from the band when omitted. |
| `stackGap` | `number` | `0` | Points between the segments of a stack. |
| `cornerRadius` | `number` | `4` | Corner radius on the growing end of a bar. |
| `minBarLength` | `number` | `0` | Smallest length a non-zero bar is drawn at, in points. A value that rounds to nothing still happened, and a bar of zero height says it did not. |
| `fadedOpacity` | `number` | `0.3` | Opacity of the bars that are not under the finger. |
| `onActiveIndexChange` | `(index: number, datum: BarChartDatum \| null) => void` | — | The band under the finger as it moves, and `-1`/`null` when it lifts. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding, for a bar sparkline with no axis or readout. |
| `children` | `ReactNode` | — | — |

#### `BarChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | — | How many lines to draw across the value axis. |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | — |
| `opacity` | `number` | — | — |

#### `BarChartBarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. |
| `color` | `string` | — | Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. |
| `colorIndex` | `SeriesColorIndex` | — | Which of the five chart tokens to take. |
| `cornerRadius` | `number` | `4` | Corner radius, overriding the chart's. |

#### `BarChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `bars` | `number` | — | How many placeholder bars to draw. Defaults to one per row, and to seven when the data has not arrived — the count is the one thing a loading chart can be honest about only if it already has the rows. |
| `duration` | `number` | — | Milliseconds for one pass of the sweep. |
| `color` | `string` | — | — |

#### `BarChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show. Every category by default, thinned only when the bands get too narrow to read — pass a number to force it lower. |
| `format` | `(datum: BarChartDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |
| `className` | `string` | — | — |

#### `BarChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show along the value axis. |
| `format` | `(value: number) => string` | — | Format a value for its label. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `BarChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: BarChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `className` | `string` | — | — |
| `activateAfterLongPress` | `number` | `180` | How long a press has to be held before the readout takes the touch, in milliseconds. Until then the touch belongs to whatever else wants it: a quick tap still reaches a button floating over the chart, and a swipe still scrolls the screen the chart sits in. Set `0` to read on contact, only for a chart with nothing over it and no scroll view around it. |

#### `BarChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys. |

#### `BarChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a total. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. Prefer this to `BarChart.Legend` on a chart that has a header: the legend floats over the plot, where it competes with the bars for the same corner. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — Two series side by side

Declare a `Bar` per series. They stand in one band, sharing the width `barGap` leaves — which is a fraction rather than a pixel gap, so the proportions hold at any width.

```tsx
<BarChart data={revenue} xDataKey="month">
  <BarChart.Grid />
  <BarChart.Bar dataKey="revenue" />
  <BarChart.Bar dataKey="costs" colorIndex={2} />
  <BarChart.XAxis />
  <BarChart.Legend labels={{ revenue: 'Revenue', costs: 'Costs' }} />
</BarChart>
```

### Notes

### Data budget

For an animated chart, keep the data at **500 rows or fewer and no more than four `Bar` series**. The regression budget also covers 1,000 rows by five series, but that is a tested ceiling rather than the recommended interactive size; profile on the slowest target device before using it. Downsample or paginate beyond the recommendation.

Every series scans every row twice per animated frame — once for the active band and once for the rest — so frame work grows as `2 × rows × series`. Grouping and stacking have the same frame cost. Stacking additionally prepares each series from the ones below it when data or series change, adding `rows × series × (series - 1) / 2` value visits; wide stacks therefore cost more to update than grouped data even when they animate identically.

### Buttons over the chart

The readout takes the touch only after the press has been held for 180 ms. Until then the touch belongs to whatever else wants it, so a tap on a button floating over the chart reaches the button, and a swipe still scrolls the screen the chart sits in.

To change the wait, pass `activateAfterLongPress` to `BarChart.Tooltip`. Pass `0` to read on contact, for a chart with nothing drawn over it and no scroll view around it. Every chart that reads values under the finger takes the same prop.

### Why the axis always reaches zero

A bar is read by its length, so the axis it is measured against has to start at nothing. Cropped at the bottom — the trick that makes a line chart's changes legible — a bar twice as tall no longer means twice as much, and the chart quietly exaggerates every difference in it. The derived domain therefore always includes zero. `yDomain` overrides it, and doing so is opting into a chart that misreads.

### Bands, not points

A line has a point at each x; a bar owns a slice of width around it. `barGap` is the fraction of that slice left empty and `barWidth` caps the thickness, so a chart of six bars and a chart of sixty both stay proportional without either being told a pixel size.

### What it costs to draw

Each series is two animated paths a frame — the band under the finger, and everything else — rather than one animated node per bar. Fifty bars is four animated props, not fifty, and the split is what lets the rest dim without giving every bar its own opacity.

The corners are drawn as a path rather than with `rx`, because a bar is rounded on the end it grows towards and square on the end it grows from. `rx` rounds all four corners or none, and a bar rounded at the axis reads as floating above it.

### Reduced motion

The grow-in and the domain tween are both skipped, and the chart draws straight to its final shape.

**`aspectRatio` measures the plot, not the whole chart.** The header sits above the drawing area rather than inside it, so a chart with a readout is taller than its ratio alone suggests — measure the box and the header would eat into the plot while still claiming the shape you asked for.

**Labels sit on what they name.** Each x label is placed on its own band, and each y label is centred on the grid line it belongs to. `Grid`'s `rows` and `YAxis`'s `ticks` have to match for the numbers to line up; both default to `4`.

## Accessible data

The chart exposes one screen-reader summary and one semantic entry per data row; its SVG paths, axes and markers stay decorative. Set `accessibilityLabel` for a domain-specific summary, `accessibilityLabelForDatum` to format each row, and `onAccessibilityDatumPress` when selecting a row should perform an action. Pass `accessible={false}` only when the same data is already available nearby in an accessible table.

---

Full page, with every example: https://panelui.dev/docs/charts/bar-chart
