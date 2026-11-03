# ScatterChart

Two quantities against each other, to show how they relate.

```tsx
import { ScatterChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ScatterChart } from '@/components/ui/scatter-chart';
```

### Usage

```tsx
<ScatterChart data={sessions} xDataKey="spend">
  <ScatterChart.Grid />
  <ScatterChart.Points dataKey="revenue" />
  <ScatterChart.XAxis />
  <ScatterChart.YAxis />
  <ScatterChart.Tooltip />
</ScatterChart>
```

### Parts

- `ScatterChart.Header`
- `ScatterChart.Grid` — Reference lines both ways. A scatter plot's x is a quantity, so it earns columns as well as rows.
- `ScatterChart.Points` — One series, as a field of dots. Takes its colour from a `--color-chart-*` token unless given one.
- `ScatterChart.Skeleton` — The still field of muted dots shown while `status="loading"`.
- `ScatterChart.XAxis` — The x labels, evenly along the axis, as real text under the plot.
- `ScatterChart.YAxis` — The value labels down the side, one per grid line. Reserves its own gutter.
- `ScatterChart.Tooltip` — The touch target, the nearest-point selection it drives, and the readout that follows it.
- `ScatterChart.Legend` — A swatch and a name per registered series.

### Props

#### `ScatterChartProps`

Extends `ViewProps, ChartAccessibilityProps<ScatterChartDatum>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `data` | `ScatterChartDatum[]` | **required** | The rows. Each one is a point, placed by two of its values. |
| `xDataKey` | `string` | `x` | Key holding the x value. Unlike the other charts, this must be a number. |
| `status` | `ScatterChartStatus` | `ready` | `loading` draws a still field of muted dots and settles into the real ones when it turns `ready`. One component throughout, rather than a spinner swapped for a chart — swapping loses the transition. |
| `aspectRatio` | `number` | `1` | Width ÷ height. `1` suits a scatter plot: neither axis is the important one. |
| `animationDuration` | `number` | `650` | Milliseconds for the reveal on mount. Defaults to `650`. |
| `domainDuration` | `number` | `500` | Milliseconds for the axes to settle after the data changes. |
| `xDomain` | `[number, number]` | — | Fix the x-axis instead of deriving it from the data. |
| `yDomain` | `[number, number]` | — | Fix the y-axis instead of deriving it from the data. |
| `onActivePointChange` | `(point: ScatterChartPoint \| null) => void` | — | The point under the finger, and `null` when it lifts. This is how a readout in the card's header gets its value — that header is outside the chart, so it cannot use `useScatterChart`. Fires when the selection changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding so the field reaches the edges, for a thumbnail. |
| `children` | `ReactNode` | — | — |

#### `ScatterChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `4` | Horizontal rules across the plot. |
| `columns` | `number` | `4` | Vertical rules down it. A scatter plot's x is a quantity, so it earns a grid in both directions — a line chart's does not, because its x is a label and a rule under a label divides nothing. |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | Dash pattern, e.g. `"4,6"`. Omit for a solid rule. |
| `opacity` | `number` | `1` | — |

#### `ScatterChartPointsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Key holding this series' y values. |
| `color` | `string` | — | Fill colour. Defaults to the `--color-chart-*` token at `colorIndex`, so a series follows the theme without the call site naming a colour. |
| `colorIndex` | `1 \| 2 \| 3 \| 4 \| 5` | `1` | Which `--color-chart-*` token to take when `color` is not given. |
| `size` | `number` | `4.5` | Radius of a point, in points. Ignored when `sizeKey` is given. |
| `sizeKey` | `string` | — | Key holding a third quantity, mapped to each point's *area* — a bubble chart. Area rather than radius, because doubling a radius quadruples the ink and the reader sees four times the value that is there. |
| `sizeRange` | `[number, number]` | — | Smallest and largest radius `sizeKey` maps onto. |
| `opacity` | `number` | `1` | Fill opacity. Below 1 by default so that overlapping points read as denser rather than hiding each other — in a crowded region that overlap *is* the finding, and opaque dots erase it. |

#### `ScatterChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `count` | `number` | — | How many placeholder dots to scatter. |
| `color` | `string` | — | — |

#### `ScatterChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many intervals to divide the axis into. Yields `ticks + 1` labels. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `ScatterChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many intervals to divide the axis into. Yields `ticks + 1` labels. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `ScatterChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showLabel` | `boolean` | `true` | Float a small readout beside the selected point. On by default. |
| `formatX` | `(value: number) => string` | — | Format the x value for the readout. Defaults to a compact number. |
| `formatY` | `(value: number, key: string) => string` | — | Format the y value for the readout. Defaults to a compact number. |
| `formatTitle` | `(datum: ScatterChartDatum) => string` | — | A heading for the readout, from the row — a name, a label, a category. |
| `hitRadius` | `number` | `32` | How far from a point a touch still counts as being on it, in points. |
| `activateAfterLongPress` | `number` | `180` | How long a press has to be held before the readout takes the touch, in milliseconds. Until then the touch belongs to whatever else wants it: a quick tap still reaches a button floating over the chart, and a swipe still scrolls the screen the chart sits in. Set `0` to read on contact, only for a chart with nothing over it and no scroll view around it. |

#### `ScatterChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `labels` | `Record<string, string>` | — | Label per series key. A key with no label falls back to the key itself. |

#### `ScatterChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the chart is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a total. |
| `labels` | `Record<string, string>` | — | Prettier names for the series keys, as the legend takes. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. Prefer this to `ScatterChart.Legend` on a chart that has a header: the legend floats over the plot, where it competes with the points for the same corner. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. Wins over `legend`. |

### Example — A chart card with a readout

Pair it with `Frame` and add `ScatterChart.Tooltip`. Touching the plot selects the nearest point and floats a small readout beside it with both coordinates. The point it names swells and goes solid — both, rather than one: a size change alone is easy to miss among neighbours, and an opacity change alone is invisible wherever the points already overlap.

```tsx
<Frame>
  <Frame.Header>
    <Frame.Title>Spend vs Revenue</Frame.Title>
    <Frame.Action>Touch a point</Frame.Action>
  </Frame.Header>
  <Frame.Panel>
    <ScatterChart data={campaigns} xDataKey="spend" aspectRatio={1.2}>
      <ScatterChart.Grid />
      <ScatterChart.Points dataKey="revenue" />
      <ScatterChart.XAxis format={(v) => `$${Math.round(v / 1000)}k`} />
      <ScatterChart.YAxis format={(v) => `$${Math.round(v / 1000)}k`} />
      <ScatterChart.Tooltip
        formatTitle={(d) => String(d.name)}
        formatX={(v) => `$${(v / 1000).toFixed(1)}k spend`}
        formatY={(v) => `$${(v / 1000).toFixed(1)}k back`}
      />
    </ScatterChart>
  </Frame.Panel>
</Frame>
```

### Notes

### Why this one measures its x

The rest of the charts here place a point by its *position* in the data — the third row goes a third of the way across, whatever value it holds. That is right for a time series and wrong for a scatter plot, whose whole claim is that both coordinates are quantities. `xDataKey` must therefore point at a **number** here, not a label, and a row whose x is not a number is not plotted.

### Finding a point with a finger

A line chart's crosshair snaps to an x index. There is nothing to snap to here: there is no shared x, and two points can sit on the same one. So the nearest point is found by distance instead, on the UI thread, and only within `hitRadius` — a touch in an empty corner selects nothing rather than lighting up whichever point happens to be least far away.

The radius defaults to `32`, sized for a fingertip rather than for the dot. A scatter point is around 4 points across and the comfortable minimum touch target on both platforms is around 44, so without it the chart would only be usable with a mouse it will never see.

Only the identity of the winning point crosses back into JS, and only when it changes, so a drag across the plot costs a handful of re-renders rather than one per frame.

### Neither axis is floored at zero

An area chart is floored at zero, because a filled region floating above the baseline reads as a shape rather than a quantity. A scatter plot is the opposite case: its subject is the *spread*, and forcing a cluster of values between 80 and 90 to share a frame with zero squashes it into a smudge in one corner and hides the very thing being plotted. Pass `xDomain` or `yDomain` when a fixed frame matters more than the spread.

### Overlap is data

Points are drawn at 75% opacity by default, so a crowded region reads as darker rather than as one dot hiding several. Raise `opacity` to `1` only for a sparse plot where nothing overlaps.

### Bubbles map area, not radius

`sizeKey` maps its value onto each point's **area**. Mapping it to the radius instead — which is the easy mistake — means a point holding twice the value carries four times the ink, and the reader believes the larger figure.

### Reading out the selected point

`onActivePointChange` fires as the selection moves between points, and with `null` when the finger lifts. That is the one to use for a readout in the card header, because the header is outside the chart and a hook cannot reach up out of the subtree it is called in. `useScatterChart` is for something rendered *inside* the chart, which is the rarer case.

### Sizing

The chart fills its parent's width and takes its height from `aspectRatio`. Do not set a height directly — the aspect ratio is what keeps the plot geometry stable while the layout settles. `aspectRatio` measures the plot, not the whole chart: the header sits above the drawing area rather than inside it.

**Labels sit on what they name.** Each y label is centred on the grid line it belongs to, so `Grid`'s `rows` and `YAxis`'s `ticks` have to match, as `columns` and `XAxis`'s `ticks` do. All four default to `4`.

### The points arrive where they belong

The other charts reveal by sweeping a clip across the plot, which suits a series that is read along the x-axis. A scatter plot is read as a field, and a wipe hands the reader a direction the data does not have. So there is no wipe here: each point grows into place on its own slice of one shared clock, slightly past its size and back to it, and the placeholder field dissolves underneath as they land. Set `animationDuration` to time the whole arrival, however many points there are — the stagger is taken out of that budget rather than added to it.

Under the system's reduce-motion setting the field is simply there, and the placeholder is cut rather than faded.

## Accessible data

The chart exposes one screen-reader summary and one semantic entry per data row; its SVG paths, axes and markers stay decorative. Set `accessibilityLabel` for a domain-specific summary, `accessibilityLabelForDatum` to format each row, and `onAccessibilityDatumPress` when selecting a row should perform an action. Pass `accessible={false}` only when the same data is already available nearby in an accessible table.

---

Full page, with every example: https://panelui.dev/docs/charts/scatter-chart
