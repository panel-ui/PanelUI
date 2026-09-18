# MirrorAreaChart

Two readings of one timeline, one above a baseline and one below it.

```tsx
import { MirrorAreaChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { MirrorAreaChart } from '@/components/ui/mirror-area-chart';
```

### Anatomy

```tsx
<MirrorAreaChart data={…}>
  <MirrorAreaChart.Header />    {/* the strip above the plot */}
  <MirrorAreaChart.Grid />      {/* dots, or ruled lines */}
  <MirrorAreaChart.Skeleton />  {/* a band along the baseline while loading */}
  <MirrorAreaChart.Area />      {/* one per series, side="top" or "bottom" */}
  <MirrorAreaChart.Baseline />  {/* the line both halves grow from */}
  <MirrorAreaChart.XAxis />     {/* labels along the bottom */}
  <MirrorAreaChart.YAxis />     {/* each half's maximum, and zero */}
  <MirrorAreaChart.Tooltip />   {/* the crosshair, the dot and the readout */}
  <MirrorAreaChart.Legend />    {/* a swatch and a name per area */}
</MirrorAreaChart>
```

### Parts

- `MirrorAreaChart.Header` — The strip above the plot: a title, a value, a caption and an optional legend or control. Pass the value yourself; follow `onActiveIndexChange` if it should track the finger.
- `MirrorAreaChart.Grid` — The texture behind the bands. `variant="dots"` (the default) is a field of points with one row on the baseline; `variant="lines"` draws dashed rules across each half. `spacing` is the distance between dots, or the number of rules per half.
- `MirrorAreaChart.Area` — One band. `side` picks the half. Areas on the same side overlay in declaration order, so declare a total before the part of it. `muted` draws it in the muted foreground colour, for a total the coloured areas are parts of.
- `MirrorAreaChart.Baseline` — The line both halves grow away from. Declare it after the areas so it is drawn over their bases.
- `MirrorAreaChart.Skeleton` — The loading state: a band either side of the baseline with a sweep across it, shown while `status="loading"`.
- `MirrorAreaChart.XAxis` — Labels along the bottom. `ticks` sets how many are shown.
- `MirrorAreaChart.YAxis` — Three labels in a gutter the chart reserves on the left: the top half's maximum, zero on the baseline and the bottom half's maximum. `formatTop` and `formatBottom` format each half.
- `MirrorAreaChart.Tooltip` — The drag across the plot, a dashed crosshair, a dot on the outer edge of the top half, and a readout beside them. The readout lists every series; `formatSummary` replaces the list with one line.
- `MirrorAreaChart.Legend` — A swatch and a name per area, top half first, floated over the top corner of the plot. On a chart with a header, prefer `Header legend`.

### Props

#### `MirrorAreaChartProps`

Extends `ViewProps, ChartAccessibilityProps<MirrorAreaChartDatum>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `MirrorAreaChartDatum[]` | **required** | The rows. Each one is a point along the x-axis. |
| `xDataKey` | `string` | `date` | Key holding the x label. Used by the axis and the readout. |
| `split` | `number` | `0.55` | How much of the plot's height sits above the baseline, from `0` to `1`. Give the half you want read first the larger share. |
| `topDomain` | `[number, number]` | — | Fix the top half's scale instead of deriving it from the data. Only the upper end is used: the baseline is always zero. |
| `bottomDomain` | `[number, number]` | — | Fix the bottom half's scale. Only the upper end is used. |
| `curve` | `ChartCurve` | `monotone` | `monotone` never overshoots between points; `linear` joins them straight. |
| `status` | `MirrorAreaChartStatus` | `ready` | `loading` holds the bands flat on the baseline and grows them out when it turns `ready`. Add a `MirrorAreaChart.Skeleton` to show something meanwhile. |
| `aspectRatio` | `number` | `1.6` | Width ÷ height. |
| `animationDuration` | `number` | `700` | Milliseconds for the bands to grow out on mount. |
| `domainDuration` | `number` | `500` | Milliseconds for either scale to settle after the data changes. |
| `onActiveIndexChange` | `(index: number, datum: MirrorAreaChartDatum \| null) => void` | — | The point under the crosshair as it moves, and `-1`/`null` when it lifts. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding so the bands reach the edges, for a sparkline. |
| `children` | `ReactNode` | — | — |

#### `MirrorAreaChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `'dots' \| 'lines'` | — | `dots` is a field of points; `lines` is dashed rules across each half. |
| `spacing` | `number` | — | Distance between dots, or how many rules each half gets. |
| `color` | `string` | — | — |
| `opacity` | `number` | — | — |

#### `MirrorAreaChartBaselineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |
| `strokeWidth` | `number` | `1.5` | — |
| `opacity` | `number` | — | — |

#### `MirrorAreaChartAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. |
| `side` | `MirrorAreaChartSide` | `top` | Which half it is drawn in. |
| `label` | `string` | — | The name shown by the readout and the legend. Defaults to `dataKey`. |
| `color` | `string` | — | Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. |
| `colorIndex` | `SeriesColorIndex` | `1` | Which of the five chart tokens to take. |
| `muted` | `boolean` | `false` | Draw it in the muted foreground colour instead, for a total that the coloured areas are parts of. |
| `fillOpacity` | `number` | — | Opacity of the fill at the band's outer edge. |
| `gradientToOpacity` | `number` | — | Opacity of the fill at the baseline. Defaults to `fillOpacity`, a flat fill. |
| `showLine` | `boolean` | `true` | Draw the line along the band's outer edge. |
| `strokeWidth` | `number` | `1.5` | Thickness of that line. |

#### `MirrorAreaChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | — | Milliseconds for one pass of the sweep. |
| `color` | `string` | — | — |

#### `MirrorAreaChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | — |
| `format` | `(datum: MirrorAreaChartDatum, index: number) => string` | — | — |
| `className` | `string` | — | — |

#### `MirrorAreaChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatTop` | `(value: number) => string` | — | Format a value in the top half. |
| `formatBottom` | `(value: number) => string` | — | Format a value in the bottom half. |
| `className` | `string` | — | — |

#### `MirrorAreaChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | Colour of the crosshair and the dot. Defaults to the foreground token. |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: MirrorAreaChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `formatSummary` | `(datum: MirrorAreaChartDatum) => string` | — | One line to show instead of a row per series — "1,120 jobs · 78% high". Use it when the series only make sense read together. |
| `className` | `string` | — | — |

#### `MirrorAreaChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MirrorAreaChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a total. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per area along the trailing edge. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — The data

One row per point on the x-axis, with a key for each series. A missing or non-numeric value leaves a gap in that band. A negative value is drawn on the baseline, because each half only grows away from it.

```tsx
const queue: MirrorAreaChartDatum[] = [
  { time: '14:00', jobs: 947, high: 653, share: 69 },
  { time: '14:30', jobs: 1120, high: 874, share: 78 },
  { time: '15:00', jobs: 982, high: 697, share: 71 },
  // …
];
```

### Notes

An explicit `topDomain` or `bottomDomain` is used only when both ends are finite. The baseline is always zero on both halves.

### Reduced motion

The bands are drawn straight to their final shape, and a change of scale is not animated.

**`aspectRatio` measures the plot, not the whole chart.** The header sits above the drawing area, so a chart with one is taller than the ratio alone suggests.

### Accessibility

The SVG drawing is decorative. `MirrorAreaChart` exposes one summary and one entry per row, with every series' value under its `label`. Use `accessibilityLabel` and `accessibilityHint` for context, `accessibilityLabelForDatum` to replace a row's spoken text, and `onAccessibilityDatumPress` when a row has an equivalent action.

---

Full page, with every example: https://panelui.dev/docs/charts/mirror-area-chart
