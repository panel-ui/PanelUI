# BubbleChart

Named circles on two axes, with a third quantity on their area.

```tsx
import { BubbleChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { BubbleChart } from '@/components/ui/bubble-chart';
```

### Anatomy

```tsx
<BubbleChart>
  <BubbleChart.Grid />        {/* reference lines both ways */}
  <BubbleChart.Quadrants />   {/* a crosshair, and a name for each corner */}
  <BubbleChart.Trend />       {/* the line the cloud fits best */}
  <BubbleChart.Bubbles />     {/* the circles */}
  <BubbleChart.Labels />      {/* their names, inside them */}
  <BubbleChart.SizeKey />     {/* what an area is worth */}
  <BubbleChart.Skeleton />    {/* while status="loading" */}
  <BubbleChart.XAxis label="Efficiency" />
  <BubbleChart.YAxis label="Performance" />
  <BubbleChart.Legend />      {/* under the plot, instead of Labels */}
  <BubbleChart.Tooltip />     {/* the drag, and the readout */}
</BubbleChart>
```

### Parts

- `BubbleChart.Header`
- `BubbleChart.Grid` — Reference lines both ways, eight of each. That is twice the four intervals an axis is divided into, so every second line carries a number and the ones between it are halves of a labelled step. `dashArray` changes the pattern; pass `undefined` for solid rules.
- `BubbleChart.Quadrants` — A crosshair splitting the plot into four, with a word for each corner. It stands at the mean of each axis by default; pass `x` and `y` for a threshold somebody decided rather than one the data produced. The tint marks the two corners a reading usually ends at.
- `BubbleChart.Trend` — The least-squares line through the cloud, dashed and drawn under the circles because it is a summary of the data rather than data. `onFit` hands back the slope, the intercept and `r` — 1 is every bubble on the line, 0 is a cloud with no direction at all.
- `BubbleChart.Bubbles` — The circles. Colour comes from the row unless `color` overrides every one of them.
- `BubbleChart.Labels` — The names, written inside the circles. A bubble too small to hold its own is left without one rather than given an unreadable one.
- `BubbleChart.SizeKey` — Three nested circles saying what a bubble's area is worth. Area is the one quantity the chart has no axis for, so without this the reader can see that one circle is bigger than another and has no way to know by how much. Needs a `sizeKey` on the chart.
- `BubbleChart.Skeleton` — A still field of muted circles shown while `status="loading"`, dissolving as the real ones grow in.
- `BubbleChart.XAxis` — Value labels along the bottom, evenly spaced because the axis is a continuous scale rather than a list of rows. `label` writes what the axis measures under the numbers, and the chart reserves the room for it.
- `BubbleChart.YAxis` — Value labels down the side, and the gutter they sit in. `label` writes what the axis measures up the side of it, turned on its side because that is the only way a word fits a gutter sized for numbers.
- `BubbleChart.Tooltip` — The touch target, the nearest-bubble selection it drives, and the readout that follows it.
- `BubbleChart.Legend` — A swatch and a name per bubble, drawn under the plot. Use it instead of `BubbleChart.Labels` when the circles are too small to carry their own names.

### Props

#### `BubbleChartProps`

Extends `ViewProps, ChartAccessibilityProps<BubbleChartDatum>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `BubbleChartDatum[]` | **required** | The rows. One bubble each. |
| `xDataKey` | `string` | `x` | Key holding the horizontal value. |
| `yDataKey` | `string` | `y` | Key holding the vertical value. |
| `sizeKey` | `string` | — | Key holding the third quantity, mapped to each bubble's *area*. Without it every bubble is drawn at the middle of `sizeRange` and the chart is a scatter plot with names on it. |
| `labelKey` | `string` | — | Key holding the name written inside the circle. |
| `colorKey` | `string` | — | Key holding a colour for the row — either a CSS colour or a number from 1 to 5 naming a `--color-chart-*` token. Without it the ramp cycles by row. |
| `sizeRange` | `[number, number]` | — | Smallest and largest radius `sizeKey` maps onto, in points. The largest is also what the plot holds back at every edge, so raising it costs room. |
| `status` | `BubbleChartStatus` | `ready` | `loading` shows a still field of muted circles and dissolves it as the real bubbles grow in. One component throughout, rather than a spinner swapped for a chart — swapping loses the transition. Add a `BubbleChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `1` | Width ÷ height. `1` is the square shape a bubble field reads best in. |
| `animationDuration` | `number` | `800` | Milliseconds for the bubbles to grow in on mount. |
| `domainDuration` | `number` | `500` | Milliseconds for the axes to settle after the data changes. |
| `xDomain` | `[number, number]` | — | Fix the horizontal axis instead of deriving it. |
| `yDomain` | `[number, number]` | — | Fix the vertical axis instead of deriving it. |
| `onActivePointChange` | `(point: BubbleChartPoint \| null) => void` | — | The bubble under the finger, and `null` when it lifts. |
| `children` | `ReactNode` | — | — |

#### `BubbleChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `8` | Horizontal rules across the plot. Eight, which is twice the four intervals an axis is divided into by default, so every second line carries a number and the ones between it are halves of a labelled step rather than an unrelated rhythm. Squares this size recede behind the circles; the coarse grid a smaller number draws reads as blocks laid over the plot. |
| `columns` | `number` | `8` | Vertical rules up it. Both axes are measured, so both earn lines. |
| `dashArray` | `string` | — | Dash pattern for the rules. Pass `undefined` for solid ones. |
| `color` | `string` | — | — |
| `opacity` | `number` | `1` | — |

#### `BubbleChartTrendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onFit` | `(fit: { slope: number; intercept: number; r: number }) => void` | — | The line's slope and intercept, and how tightly the cloud sits on it, once they have been computed. `r` runs 0 to 1: 1 is every bubble on the line, 0 is a cloud with no direction at all. Given here rather than left for the caller to work out, because the fit is already being computed to draw the line and doing it twice invites the two answers to disagree. It fires when the numbers change, not on every render that produced the same ones, so putting the fit straight into state is safe. |
| `color` | `string` | — | — |
| `strokeWidth` | `number` | `1.5` | — |
| `dashArray` | `string` | — | Dash pattern. Dashed by default: the line is a reading, not a measurement. |
| `opacity` | `number` | `1` | — |

#### `BubbleChartBubblesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `opacity` | `number` | `1` | Fill opacity. Below 1 by default so that overlapping bubbles read as denser rather than hiding each other — in a crowded corner that overlap *is* the finding, and opaque circles erase it. |
| `color` | `string` | — | One colour for every bubble, overriding the per-row ramp. |

#### `BubbleChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `count` | `number` | — | How many placeholder circles to scatter. |
| `color` | `string` | — | — |

#### `BubbleChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `minRadius` | `number` | `10` | Smallest radius a bubble may have and still be given its label. Below it the name is wider than the circle it names. |
| `format` | `(point: BubbleChartPoint) => string` | — | Turn a bubble into its label. Defaults to the value at `labelKey`. |
| `className` | `string` | — | — |

#### `BubbleChartQuadrantsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `x` | `number` | — | Where the vertical rule stands. Defaults to the mean of the x values. |
| `y` | `number` | — | Where the horizontal rule lies. Defaults to the mean of the y values. |
| `labels` | `{` | — | A word for each corner, written in the corner it belongs to. |
| `topLeft` | `string` | — | — |
| `topRight` | `string` | — | — |
| `bottomLeft` | `string` | — | — |
| `bottomRight` | `string` | — | — |
| `tint` | `boolean` | `true` | Tint the high-high and low-low corners. On by default. |
| `color` | `string` | — | — |
| `className` | `string` | — | — |

#### `BubbleChartSizeKeyProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `placement` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `bottom-right` | Which corner of the plot it sits in. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `label` | `string` | — | A word for what the area means — "people", "revenue". |
| `className` | `string` | — | — |

#### `BubbleChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many intervals to divide the axis into. Yields `ticks + 1` labels. Four, and the domain is rounded out to four steps to match, so the numbers come out round. Fewer leaves most of the grid unnamed — a line with nothing beside it is a line the reader has to count their way to. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `label` | `string` | — | What the axis measures, written under the numbers. |
| `className` | `string` | — | — |

#### `BubbleChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many intervals to divide the axis into. Yields `ticks + 1` labels. Four, matching the four steps the domain is rounded out to and every second line of the default grid. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `label` | `string` | — | What the axis measures, written up the side of it. |
| `className` | `string` | — | — |

#### `BubbleChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showLabel` | `boolean` | `true` | Float a small readout beside the selected bubble. On by default. |
| `formatX` | `(value: number) => string` | — | Format the x value for the readout. Defaults to a compact number. |
| `formatY` | `(value: number) => string` | — | Format the y value for the readout. Defaults to a compact number. |
| `formatSize` | `(value: number) => string` | — | Format the size value for the readout. Defaults to a compact number. |
| `hitRadius` | `number` | `22` | Floor on the touch target, for a chart whose smallest bubbles are tiny. |
| `className` | `string` | — | — |
| `activateAfterLongPress` | `number` | `180` | How long a press has to be held before the readout takes the touch, in milliseconds. Until then the touch belongs to whatever else wants it: a quick tap still reaches a button floating over the chart, and a swipe still scrolls the screen the chart sits in. Set `0` to read on contact, only for a chart with nothing over it and no scroll view around it. |

#### `BubbleChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `limit` | `number` | — | Cap on how many bubbles are named. The rest are left to the readout. |

#### `BubbleChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — what the area means, usually. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. |

### Example — Three quantities on one chart

Two of them are the axes and the third is the area. Say what the area means in the header — a reader who is not told has no way to work it out from the picture.

```tsx
<Frame className="w-full">
  <Frame.Header>
    <Frame.Title>Performance vs efficiency</Frame.Title>
    <Frame.Action>Drag to inspect</Frame.Action>
  </Frame.Header>
  <Frame.Panel>
    <BubbleChart
      data={TEAMS}
      xDataKey="efficiency"
      yDataKey="performance"
      sizeKey="people"
      labelKey="team"
    >
      <BubbleChart.Header value="8 teams" caption="Circle area is team size" />
      <BubbleChart.Grid />
      <BubbleChart.Bubbles />
      <BubbleChart.Labels />
      <BubbleChart.XAxis />
      <BubbleChart.YAxis />
      <BubbleChart.Tooltip />
    </BubbleChart>
  </Frame.Panel>
</Frame>
```

### Notes

### Area, not radius

`sizeKey` maps to a circle's *area*. Doubling a radius quadruples the ink, so a chart that scaled the radius would show a doubled value as four times the size and the reader would believe the picture. `sizeRange` is the smallest and largest radius the scale runs between, and the scale runs over the whole data set so one bubble's size means the same thing as another's. Its upper end is also what the plot holds back at every edge — a circle is drawn about its centre, so without that the bubble carrying the largest value is the one cropped in half.

Without a `sizeKey` every bubble is drawn at the middle of `sizeRange`, which is a scatter plot with names on it — and an honest one.

### The grid, and the numbers on it

The grid draws eight rules each way and each axis prints five numbers, so every second gridline carries one. That relationship is the point of both defaults: a number beside every line of a grid fine enough to read against is a column of numbers, and a grid coarse enough for that reads as blocks laid behind the circles.

The domain is rounded out to the same four steps the axes are divided into, so the numbers come out round rather than ending wherever the data happened to end.

`rows`, `columns` and `ticks` all move independently if a chart wants a different rhythm — keep the grid a whole multiple of the ticks, or the numbers stop landing on lines.

### Naming the axes

`label` on `XAxis` and `YAxis` says what each one measures. The chart reserves the room before it lays the plot out, so adding one moves the plot rather than writing over it. The y label is turned on its side, which is the only way a word fits a gutter sized for numbers.

### Colour

The ramp cycles by row. Pass `colorKey` to name a colour per row: either a CSS colour, or a number from 1 to 5 selecting a `--color-chart-*` token. `BubbleChart.Bubbles` also takes a single `color` for every circle, which is what a chart with a legend usually wants.

### Selection

The readout clears the *edge* of the bubble rather than its centre, and drops below it where there is no room above — lifted by a constant it landed on the larger circles, which are exactly the ones a finger is most likely to be resting on.

A touch picks the nearest bubble whose own circle — or the `hitRadius` floor, whichever is larger — reaches the finger. Nearest rather than topmost, because where bubbles overlap the one drawn last is not the one being aimed at.

## Accessible data

The chart exposes one screen-reader summary and one semantic entry per data row; its SVG circles, axes and labels stay decorative. Set `accessibilityLabel` for the summary, `accessibilityLabelForDatum` to phrase a row in your own words, and `onAccessibilityDatumPress` to make each row activatable. Pass `accessible={false}` to drop the semantic layer entirely.

---

Full page, with every example: https://panelui.dev/docs/charts/bubble-chart
