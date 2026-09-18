# BumpChart

How a set of things ranked against each other over time.

```tsx
import { BumpChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { BumpChart } from '@/components/ui/bump-chart';
```

### Anatomy

```tsx
<BumpChart data={…}>
  <BumpChart.Header />    {/* the strip above the plot */}
  <BumpChart.Grid />      {/* a guide down every column */}
  <BumpChart.Skeleton />  {/* a bar on every row while loading */}
  <BumpChart.Line />      {/* one per series */}
  <BumpChart.YAxis />     {/* #1, #2… down the side */}
  <BumpChart.XAxis />     {/* column labels along the bottom */}
  <BumpChart.Labels />    {/* each name beside its last point */}
  <BumpChart.Tooltip />   {/* the scrub, and the standings it opens */}
  <BumpChart.Legend />    {/* a swatch and a name per series */}
</BumpChart>
```

### Parts

- `BumpChart.Header` — The strip above the plot: a title, a value, a caption and an optional legend or control. Pass the value yourself; follow `onHighlightChange` or `onActiveIndexChange` if it should track the chart.
- `BumpChart.Grid` — Dashed guides down every column, and optionally across every rank with `horizontal`.
- `BumpChart.Line` — One series. It registers its colour and label with the chart; the lines are drawn together so the picked-out one can sit on top of every crossing.
- `BumpChart.Skeleton` — The loading state: a thin bar on every rank row with a sweep across them, shown while `status="loading"`.
- `BumpChart.XAxis` — Column labels along the bottom. `ticks` sets how many are shown.
- `BumpChart.YAxis` — The ranks down the side, one on every row. The chart keeps a gutter for them. `format` changes `#1` to anything else.
- `BumpChart.Labels` — Each series' name level with its last point, in a column the chart reserves on the right. The names move with their lines when the data changes. Tapping one picks that line out, and tapping it again clears it; pass `pressable={false}` to turn that off.
- `BumpChart.Tooltip` — The scrub across the columns, with a card listing every series in the order it stood at the column under the finger. The card sits beside the crosshair, on whichever side has room.
- `BumpChart.Legend` — A swatch and a name per series, floated over the top corner of the plot. On a chart with a header, prefer `Header legend`.

### Props

#### `BumpChartProps`

Extends `ViewProps, ChartAccessibilityProps<BumpChartDatum>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `BumpChartDatum[]` | **required** | The rows. Each one is a column: a week, a round, a release. |
| `xDataKey` | `string` | `date` | Key holding the column's label. |
| `values` | `'rank' \| 'score'` | `rank` | What the series columns hold. `rank` (the default) takes them as places, `1` at the top. `score` ranks every row for you, highest first. |
| `highlight` | `string \| null` | — | The series drawn in its colour and on top, with the rest muted. `null` picks none, and every line keeps its own colour. Controlled — pair it with `onHighlightChange`. |
| `defaultHighlight` | `string \| null` | `null` | The series picked out on first render, when `highlight` is not passed. |
| `onHighlightChange` | `(key: string \| null) => void` | — | Called when a name in `BumpChart.Labels` is tapped. |
| `status` | `BumpChartStatus` | `ready` | `loading` hides the lines and shows `BumpChart.Skeleton` if there is one. The lines are revealed when it turns `ready`. |
| `aspectRatio` | `number` | `1.7` | Width ÷ height. |
| `animationDuration` | `number` | `700` | Milliseconds for the reveal on mount. |
| `morphDuration` | `number` | `500` | Milliseconds for the lines to move to new places when the data changes. |
| `onActiveIndexChange` | `(index: number, datum: BumpChartDatum \| null) => void` | — | The column under the scrub as it moves, and `-1`/`null` when it lifts. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding, for a chart with no axes. |
| `children` | `ReactNode` | — | — |

#### `BumpChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `vertical` | `boolean` | `true` | A guide down every column. |
| `horizontal` | `boolean` | `false` | A guide across every rank. |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | — |
| `opacity` | `number` | `1` | — |

#### `BumpChartLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' rank, or its score with `values="score"`. |
| `label` | `string` | — | The name shown by `Labels`, the tooltip and the legend. Defaults to `dataKey`. |
| `color` | `string` | — | Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. |
| `colorIndex` | `SeriesColorIndex` | `1` | Which of the five chart tokens to take. |
| `strokeWidth` | `number` | `1.5` | Thickness of the line. The picked-out line is drawn one point thicker. |
| `showDots` | `boolean` | `true` | Draw a dot at every column. |

#### `BumpChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | — | Milliseconds for one pass of the sweep. |
| `color` | `string` | — | — |
| `rows` | `number` | — | How many rank rows to stand in for. |

#### `BumpChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many columns to label, spread across the run. |
| `format` | `(datum: BumpChartDatum, index: number) => string` | — | — |
| `className` | `string` | — | — |

#### `BumpChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `format` | `(rank: number) => string` | — | Format a rank. Defaults to `#1`, `#2`… |
| `className` | `string` | — | — |

#### `BumpChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `width` | `number` | — | Room kept to the right of the plot for the names. Longer names are cut short. |
| `pressable` | `boolean` | — | Let a tap on a name pick that line out, and a second tap clear it. |
| `className` | `string` | — | — |

#### `BumpChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |
| `formatRank` | `(rank: number) => string` | — | Format a rank in the readout. Defaults to `#1`, `#2`… |
| `formatX` | `(datum: BumpChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `className` | `string` | — | — |

#### `BumpChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `BumpChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a total. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — The data

One row per column. Each series is a key holding its rank in that column, with `1` at the top. A missing or non-numeric value leaves a gap in that line rather than dropping it to the bottom.

```tsx
const league: BumpChartDatum[] = [
  { week: 'w32', harbour: 3, northside: 2, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w33', harbour: 3, northside: 2, kestrel: 1, oldMill: 5, riverside: 4 },
  { week: 'w34', harbour: 2, northside: 3, kestrel: 1, oldMill: 4, riverside: 5 },
  // …
  { week: 'Now', harbour: 1, northside: 2, kestrel: 3, oldMill: 4, riverside: 5 },
];
```

### Notes

With `values="rank"` a rank must be a finite number of at least `1`; anything else is a gap. The number of rows is the lowest rank any series holds, so a table of five with one series missing still keeps five rows.

### Room at the sides

`YAxis` and `Labels` each reserve room beside the plot before it is laid out. `Labels` takes 84 points by default; set its `width` for longer or shorter names. A name that does not fit is cut short.

### Reduced motion

The reveal and the move between data sets are both skipped, and the chart draws straight to its final shape.

**`aspectRatio` measures the plot, not the whole chart.** The header sits above the drawing area, so a chart with one is taller than the ratio alone suggests.

### Accessibility

The SVG drawing is decorative. `BumpChart` exposes one summary and one entry per column, listing each series' rank there. The names in `Labels` are buttons with a selected state. Use `accessibilityLabel` and `accessibilityHint` for context, `accessibilityLabelForDatum` to replace a column's spoken text, and `onAccessibilityDatumPress` when a column has an equivalent action.

---

Full page, with every example: https://panelui.dev/docs/charts/bump-chart
