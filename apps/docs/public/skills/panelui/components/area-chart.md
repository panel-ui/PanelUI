# AreaChart

Filled bands over time, stacked or overlaid.

```tsx
import { AreaChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { AreaChart } from '@/components/ui/area-chart';
```

### Anatomy

```tsx
<AreaChart>
  <AreaChart.Grid />
  <AreaChart.Area dataKey="…" />        {/* one per series, bottom first */}
  <AreaChart.Skeleton />                 {/* while status="loading" */}
  <AreaChart.XAxis />
  <AreaChart.YAxis />
  <AreaChart.Legend />
  <AreaChart.Tooltip />                 {/* crosshair, dots and readout */}
</AreaChart>
```

### Parts

- `AreaChart.Header`
- `AreaChart.Grid` — Horizontal rules, so a band can be read against a number.
- `AreaChart.Area` — One filled band, with the line along its top edge. The fill is a downward gradient by default, so the top edge stays the darkest thing in the band.
- `AreaChart.Skeleton` — A low band on the baseline with a sweep across it, shown while `status="loading"`.
- `AreaChart.XAxis` — The x labels. Real text, so they follow the theme’s font and the platform’s text scaling.
- `AreaChart.YAxis` — Value labels down the side. The chart reserves a gutter for them rather than drawing them over the plot.
- `AreaChart.Tooltip` — The crosshair, the drag that drives it, and a dot riding the top edge of every band.
- `AreaChart.Legend` — A swatch and a name per series, reversed for a stack so the key reads in the order the bands appear.

### Props

#### `AreaChartProps`

Extends `ViewProps, ChartAccessibilityProps<AreaChartDatum>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `AreaChartDatum[]` | **required** | The rows. Each one is a point along the x-axis. |
| `xDataKey` | `string` | `date` | Key holding the x label. Used by the axis and the crosshair readout. |
| `status` | `AreaChartStatus` | `ready` | `loading` holds the bands flat and grows them into the real ones when it turns `ready`. Add an `AreaChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `2` | Width ÷ height. `2` is the wide card shape. |
| `animationDuration` | `number` | `700` | Milliseconds for the reveal on mount. |
| `domainDuration` | `number` | `500` | Milliseconds for the y-axis to settle after the data changes. |
| `yDomain` | `[number, number]` | — | Fix the y-axis instead of deriving it from the data. |
| `stacked` | `boolean` | `false` | Sit each band on the running total of the ones below it, so the top edge is the whole and each thickness is a share. The order the `Area` children are declared in is the stacking order, bottom first. Unstacked, the bands overlay and their fills are translucent — the right reading when the series are alternatives rather than parts of a total. |
| `curve` | `ChartCurve` | `monotone` | `monotone` never overshoots between points; `linear` joins them straight. |
| `onActiveIndexChange` | `(index: number, datum: AreaChartDatum \| null) => void` | — | The point under the crosshair as it moves, and `-1`/`null` when it lifts. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding so the bands reach the edges, for a sparkline. |
| `children` | `ReactNode` | — | — |

#### `AreaChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | — | — |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | — |
| `opacity` | `number` | — | — |

#### `AreaChartAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' values. |
| `color` | `string` | — | Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. |
| `colorIndex` | `SeriesColorIndex` | `1` | Which of the five chart tokens to take. |
| `fillOpacity` | `number` | — | Opacity of the fill at the top of the band. |
| `gradientToOpacity` | `number` | `0` | Opacity at the bottom. `0` fades the band out; match `fillOpacity` for a flat fill. |
| `showLine` | `boolean` | `true` | Draw the line along the top edge of the band. |
| `strokeWidth` | `number` | `2` | Thickness of that line. |

#### `AreaChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | — | Milliseconds for one pass of the sweep. |
| `color` | `string` | — | — |

#### `AreaChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | — |
| `format` | `(datum: AreaChartDatum, index: number) => string` | — | — |
| `className` | `string` | — | — |

#### `AreaChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | — |
| `format` | `(value: number) => string` | — | — |
| `className` | `string` | — | — |

#### `AreaChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |
| `formatValue` | `(value: number, key: string) => string` | — | Format one series' value. Defaults to a compact number. |
| `formatX` | `(datum: AreaChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `className` | `string` | — | — |
| `activateAfterLongPress` | `number` | `180` | How long a press has to be held before the readout takes the touch, in milliseconds. Until then the touch belongs to whatever else wants it: a quick tap still reaches a button floating over the chart, and a swipe still scrolls the screen the chart sits in. Set `0` to read on contact, only for a chart with nothing over it and no scroll view around it. |

#### `AreaChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys. |

#### `AreaChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a total. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge, in the order the bands appear on a stack. Prefer this to `AreaChart.Legend` on a chart that has a header: the legend floats over the plot, where a tall band and a key end up in the same corner. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — Stacked

The first `Area` declared is the bottom of the stack. Order is load-bearing here in a way it is not on a line chart — it decides what sits on what.

```tsx
<AreaChart data={traffic} xDataKey="hour" stacked>
  <AreaChart.Grid />
  <AreaChart.Area dataKey="direct" />
  <AreaChart.Area dataKey="search" colorIndex={2} />
  <AreaChart.Area dataKey="social" colorIndex={3} />
  <AreaChart.XAxis ticks={5} />
</AreaChart>
```

### Notes

### Stacked or overlaid

Stack when the series are parts of one thing and the total means something: channels making up your traffic, plan tiers making up your revenue. Overlay when they are alternatives being compared, where a total would be a number nobody asked for.

The two are drawn differently on purpose. Stacked bands touch, so their fills are nearly opaque — a translucent band would show the one beneath through it and the pair would read as a third colour. Overlaid bands must be translucent, or the one in front hides the ones behind entirely.

### Why the fill starts at zero

An area is a filled region, and a region floating above the bottom of the plot reads as a shape rather than as a quantity. A series that never goes below zero is therefore drawn from zero, and only the top of the domain gets headroom.

### Why this is a separate component

Stacking is not a flag that could have been added to `LineChart.Area`. It changes the y-domain from the largest single series to the largest sum, it makes each area's baseline a curve rather than the axis, and it makes declaration order load-bearing. A chart where all of that was true of some children and not others would be a chart nobody could read.

### Reduced motion

The reveal and the domain tween are both skipped, and the chart draws straight to its final shape.

**`aspectRatio` measures the plot, not the whole chart.** The header sits above the drawing area rather than inside it, so a chart with a readout is taller than its ratio alone suggests — measure the box and the header would eat into the plot while still claiming the shape you asked for.

**Labels sit on what they name.** Each x label is placed on its own point, and each y label is centred on the grid line it belongs to. `Grid`'s `rows` and `YAxis`'s `ticks` have to match for the numbers to line up; both default to `4`.

## Accessible data

The chart exposes one screen-reader summary and one semantic entry per data row; its SVG paths, axes and markers stay decorative. Set `accessibilityLabel` for a domain-specific summary, `accessibilityLabelForDatum` to format each row, and `onAccessibilityDatumPress` when selecting a row should perform an action. Pass `accessible={false}` only when the same data is already available nearby in an accessible table.

---

Full page, with every example: https://panelui.dev/docs/charts/area-chart
