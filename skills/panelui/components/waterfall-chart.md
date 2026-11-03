# WaterfallChart

How a run of changes carried one total to another.

```tsx
import { WaterfallChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { WaterfallChart } from '@/components/ui/waterfall-chart';
```

### Anatomy

```tsx
<WaterfallChart data={…}>
  <WaterfallChart.Header />      {/* the strip above the plot */}
  <WaterfallChart.Grid />        {/* lines across the value axis */}
  <WaterfallChart.Skeleton />    {/* the stubs it waits behind */}
  <WaterfallChart.Connectors />  {/* each bar's end to the next bar's start */}
  <WaterfallChart.Bars />        {/* the bars themselves */}
  <WaterfallChart.Values />      {/* each change, written at the end of its bar */}
  <WaterfallChart.XAxis />       {/* step names along the bottom */}
  <WaterfallChart.YAxis />       {/* value labels down the side */}
  <WaterfallChart.Tooltip />     {/* the drag, and the card it opens */}
  <WaterfallChart.Legend />      {/* a key to the three colours */}
</WaterfallChart>
```

### Parts

- `WaterfallChart.Header` — The strip above the plot — what the run is of, what it reads, and room for a control or a key. The chart introducing itself, as distinct from the caption on the card around it.
- `WaterfallChart.Grid` — Lines across the value axis, so a bar can be read against a number rather than only against the bar beside it.
- `WaterfallChart.Connectors` — The lines from each bar's end to the next bar's start. Draw them before `Bars` so their ends pass behind the bars they touch rather than stopping short of them.
- `WaterfallChart.Bars` — The bars. Six animated paths a frame — one per colour, each split into the bar under the finger and the rest — so a run of forty steps costs what a run of four does.
- `WaterfallChart.Values` — Each step's change, written just past the end of its bar and signed. Upright only: sideways there is nowhere for a number at the end of a bar to go that is not on top of the bar or off the chart.
- `WaterfallChart.Skeleton` — The waiting state: equal stubs on the baseline with a sweep across them, shown while `status="loading"`.
- `WaterfallChart.XAxis` — Step names under the bands. Real text, so they follow the theme's font and the platform's text scaling.
- `WaterfallChart.YAxis` — Value labels down the side, and the step names when the chart is sideways. The chart reserves a gutter for them rather than drawing them over the plot.
- `WaterfallChart.Tooltip` — The drag that selects a step, and the card that reports it — the change, and the balance it left behind. The card follows whichever axis the bands run along.
- `WaterfallChart.Legend` — A swatch and a name for each of the three roles the run actually contains. A run with no totals in it does not list a colour for them.

### Props

#### `WaterfallChartProps`

Extends `ViewProps, ChartAccessibilityProps<WaterfallStep>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `WaterfallDatum[]` | **required** | The steps, in the order they happen. |
| `status` | `WaterfallChartStatus` | `ready` | `loading` holds the bars at the baseline and grows them into the real ones when it turns `ready`. One component throughout, rather than a spinner swapped for a chart — swapping loses the transition. Add a `WaterfallChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `2` | Width ÷ height. `2` is the wide card shape. |
| `animationDuration` | `number` | `700` | Milliseconds for the bars to grow in on mount. |
| `domainDuration` | `number` | `500` | Milliseconds for the value axis to settle after the data changes. |
| `yDomain` | `[number, number]` | — | Fix the value axis instead of deriving it. The derived domain always includes zero, and one that does not is a run whose bars cannot be compared — pass this only when you mean it. |
| `orientation` | `WaterfallChartOrientation` | `vertical` | `vertical` stands the bars up; `horizontal` lays the run down the side. |
| `barGap` | `number` | `0.34` | Fraction of each band left empty, `0` to `1`. A fraction rather than a pixel gap so the proportions hold at any width. |
| `barWidth` | `number` | — | Fixed bar thickness in points. Derived from the band when omitted. |
| `cornerRadius` | `number` | `4` | Corner radius on the ends of a bar. |
| `minBarLength` | `number` | `2` | Smallest length a non-zero bar is drawn at, in points. A step that rounds to nothing still happened, and a bar of zero length says it did not. |
| `fadedOpacity` | `number` | `0.3` | Opacity of the bars that are not under the finger. |
| `riseColor` | `string` | — | Colour of a step that adds. Defaults to the success token. |
| `fallColor` | `string` | — | Colour of a step that subtracts. Defaults to the destructive token. |
| `totalColor` | `string` | — | Colour of a `total` step. Defaults to the first chart token. |
| `onActiveIndexChange` | `(index: number, step: WaterfallStep \| null) => void` | — | The step under the finger as it moves, and `-1`/`null` when it lifts. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding, for a run with no axis or readout. |
| `children` | `ReactNode` | — | — |

#### `WaterfallChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `4` | How many lines to draw across the value axis. |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | — |
| `opacity` | `number` | `1` | — |

#### `WaterfallChartBarsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cornerRadius` | `number` | `4` | Corner radius, overriding the chart's. |

#### `WaterfallChartConnectorsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | — |
| `strokeWidth` | `number` | `1` | — |
| `opacity` | `number` | `1` | — |

#### `WaterfallChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `bars` | `number` | — | How many placeholder bars to draw. Defaults to one per step, and to six when the data has not arrived — the count is the one thing a loading chart can be honest about only if it already has the steps. |
| `duration` | `number` | `1400` | Milliseconds for one pass of the sweep. |
| `color` | `string` | — | — |

#### `WaterfallChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show. Every step by default, thinned only when the bands get too narrow to read — pass a number to force it lower. |
| `format` | `(step: WaterfallStep, index: number) => string` | — | Turn a step into its label. Defaults to its `label`. |
| `className` | `string` | — | — |

#### `WaterfallChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show along the value axis. |
| `format` | `(value: number) => string` | — | Format a value for its label. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `WaterfallChartValuesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `format` | `(step: WaterfallStep, index: number) => string` | — | Format a step's number. Defaults to a signed compact number. |
| `className` | `string` | — | — |

#### `WaterfallChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(step: WaterfallStep) => string` | — | Format the step's change. Defaults to a signed compact number. |
| `formatTotal` | `(step: WaterfallStep) => string \| null` | — | Format the running total line. Return `null` to drop it. |
| `className` | `string` | — | — |
| `activateAfterLongPress` | `number` | `180` | How long a press has to be held before the readout takes the touch, in milliseconds. Until then the touch belongs to whatever else wants it: a quick tap still reaches a button floating over the chart, and a swipe still scrolls the screen the chart sits in. Set `0` to read on contact, only for a chart with nothing over it and no scroll view around it. |

#### `WaterfallChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `labels` | `Partial<Record<WaterfallKind, string>>` | — | Names for the three roles. |

#### `WaterfallChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the run is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a total. |
| `labels` | `Partial<Record<WaterfallKind, string>>` | — | Names for the three roles, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per role along the trailing edge. Prefer this to `WaterfallChart.Legend` on a chart that has a header: the legend floats over the plot, where it competes with the bars for the same corner. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — The data

Steps in the order they happen. `value` is what that step changes the running total by, so a decrease is negative and the colour follows from the sign.

`total: true` marks a reading rather than a change. Its `value` is added to the running total before the bar is drawn, so an opening balance carries the figure it opens at and a closing total carries `0` — it reads the balance as it stands.

```tsx
const bridge: WaterfallDatum[] = [
  { label: 'Q3', value: 482000, total: true },
  { label: 'New', value: 96400 },
  { label: 'Expansion', value: 41200 },
  { label: 'Churn', value: -58700 },
  { label: 'Downgrade', value: -19300 },
  { label: 'Q4', value: 0, total: true },
];
```

### Notes

A non-finite step value is treated as zero, preserving the step and its label without poisoning every later running total. An explicit `yDomain` is used only when both ends are finite; otherwise the chart derives a safe domain from the run.

### What a total step means

`total: true` moves a bar onto the baseline and into the neutral colour. Its `value` is added to the running figure before the bar is drawn, which covers both uses with one rule: an opening balance carries the figure it opens at, and a closing total carries `0` so it reads the balance the run arrived at.

### Why the axis always reaches zero

A bar is read by its length, and a step's position off the baseline is a running total the reader is being asked to measure. Cropping the axis breaks both readings at once. The derived domain therefore always includes zero. `yDomain` overrides it, and doing so is opting into a chart that misreads.

### Why the connectors are worth drawing

Without them the bars are a row of rectangles at unexplained heights. The line from one bar's end to the next bar's start is what says the second continues the first, and it is the only part of the drawing that carries the sequence.

They are drawn across the full width of both bands rather than only the gap between them, so their ends disappear behind the bars they touch — put `Connectors` before `Bars` in the children for that to hold.

### What it costs to draw

Six animated paths a frame for the bars — one per colour, each split into the bar under the finger and the rest — plus one for the connectors. A run of forty steps is seven animated props, not forty, and the split is what lets the rest dim without giving every bar its own opacity.

Each bar grows from its own start towards its end rather than up from the baseline. A step is a movement between two balances, and growing it from zero would animate a quantity the chart is not claiming.

### Reduced motion

The grow-in and the domain tween are both skipped, and the chart draws straight to its final shape.

**`aspectRatio` measures the plot, not the whole chart.** The header sits above the drawing area rather than inside it, so a chart with one is taller than the ratio alone suggests.

### Accessibility

The SVG drawing is decorative. `WaterfallChart` exposes one summary and one structured entry per resolved step, including its change, kind, starting total and ending total. Use `accessibilityLabel` and `accessibilityHint` for domain context, `accessibilityLabelForDatum` to replace a step's spoken text, and `onAccessibilityDatumPress` when a step has an equivalent action. Set `accessible={false}` only when the same sequence is already presented nearby.

---

Full page, with every example: https://panelui.dev/docs/charts/waterfall-chart
