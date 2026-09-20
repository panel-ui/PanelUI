# SankeyChart

Where a quantity came from and where it ended up.

```tsx
import { SankeyChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { SankeyChart } from '@/components/ui/sankey-chart';
```

### Anatomy

```tsx
<SankeyChart nodes={…} links={…}>
  <SankeyChart.Header />    {/* the strip above the diagram */}
  <SankeyChart.Skeleton />  {/* the plain shape it waits behind */}
  <SankeyChart.Links />     {/* the ribbons */}
  <SankeyChart.Nodes />     {/* the bars they run between */}
  <SankeyChart.Labels />    {/* the names, and the press targets */}
  <SankeyChart.Tooltip />   {/* what the selected node carries */}
</SankeyChart>
```

### Parts

- `SankeyChart.Header` — The strip above the diagram — what the flow is of, what it totals, and room for a control. The value is not derived, because the formatting is not the chart's to guess: 128400 is a count, a currency or a rate depending on what was routed.
- `SankeyChart.Links` — The ribbons. Drawn before the bars, so a bar sits on top of the flows that meet it and keeps a clean edge. Translucent at rest, because ribbons cross and an opaque one hides whichever passes under it.
- `SankeyChart.Nodes` — The bars the ribbons run between, drawn solid. A node is the one thing here that is not crossing anything else, and it reads as an edge only if nothing shows through it.
- `SankeyChart.Labels` — The names, set beside the bars rather than on them — a bar is ten points thick and no name fits in ten points. Also the press targets: a node worth one percent of the flow is a sliver nobody can hit, so the row it sits in is the target, padded out where the sliver is smaller than one.
- `SankeyChart.Tooltip` — What the selected node carries, anchored beside it and clamped to the plot. In and out are shown separately because they are only the same number when nothing was lost — and a node where they differ is the interesting one on the chart.
- `SankeyChart.Skeleton` — The waiting state: a few plain bars and the ribbons between them, every one the same size. Varied thicknesses would be an invented routing, and nobody can tell an invented one from a real one until it changes under them.

### Props

#### `SankeyChartProps`

Extends `ViewProps, ChartAccessibilityProps<SankeyNode>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `nodes` | `SankeyNode[]` | **required** | The stages. Order does not decide position — the links do. |
| `links` | `SankeyLink[]` | **required** | What travels between them. |
| `height` | `number` | `240` | How tall the diagram is drawn, in points. The width is the card's, but nothing in a flow says how deep it should be: a diagram of four nodes and one of forty are the same data at two heights, and which of them is right is a question about the screen. |
| `nodeWidth` | `number` | `10` | How thick a node's bar is, in points. |
| `nodePadding` | `number` | `14` | The gap between two nodes in a column, in points. A maximum rather than a promise. A crowded column gives its spacing up before it gives up the height of its bars, because the bar is the reading. |
| `align` | `SankeyAlign` | `justify` | Which column a node goes in where the flow leaves a choice. |
| `iterations` | `number` | `6` | Relaxation rounds spent untangling the ribbons. |
| `curve` | `number` | `0.5` | How far a ribbon bends, `0` for a straight diagonal and `0.5` for an S. |
| `color` | `string` | — | The first hue. The rest of the palette follows from the theme's tokens. |
| `animationDuration` | `number` | `620` | Milliseconds for one column to draw itself. |
| `staggerDelay` | `number` | `110` | Milliseconds between one column starting and the next. `0` for all at once. |
| `status` | `SankeyChartStatus` | `ready` | `loading` draws a plain placeholder until the data arrives. |
| `activeId` | `string \| null` | — | Selected node. Leave unset to let the chart track it. |
| `onActiveIdChange` | `(id: string \| null) => void` | — | Fires with the selected node's id, or `null` when the selection is cleared. |
| `onDropLinks` | `(count: number) => void` | — | Fires with how many link rows could not be drawn — ones naming a node that is not there, carrying nothing, or closing a loop. `0` after a clean render, so a banner can be shown and taken away from the same signal. |
| `children` | `ReactNode` | — | — |

#### `SankeyChartLinksProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `opacity` | `number` | `0.4` | A ribbon's opacity at rest. |
| `activeOpacity` | `number` | `0.78` | A ribbon's opacity when its node is selected. |
| `dimOpacity` | `number` | `0.08` | And when something else is. |

#### `SankeyChartNodesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `radius` | `number` | — | Corner radius on a node's bar, in points. |
| `dimOpacity` | `number` | `0.08` | A bar's opacity when something else is selected. |

#### `SankeyChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `formatValue` | `(value: number, node: SankeyNode) => string` | — | Format the figure beside a name. Defaults to a compact number. |
| `showValue` | `boolean` | `false` | Show the figure under the name. |
| `minHeight` | `number` | `6` | Hide the name on a bar shorter than this, in points. A diagram of forty nodes has bars a few points tall, and forty names at that spacing overlap into a grey band that hides the flow behind it. The names that are dropped are the smallest ones, which is where the tooltip takes over. |

#### `SankeyChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `formatValue` | `(value: number) => string` | — | Format the figures. Defaults to a compact number. |

#### `SankeyChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |

#### `SankeyChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what the flow is of. |
| `value` | `string` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `string` | — | One muted line under the value — a period, a comparison, a caveat. |
| `children` | `ReactNode` | — | Trailing slot — a control, a badge, a range picker. |

### Example — The data

Two arrays. Nodes carry an `id` the links name; links carry a `source`, a `target` and a `value`.

A node's height is worked out for you — it is the larger of what arrives and what leaves. Set `value` on a node only where those two disagree and the difference matters, such as a step that loses some of what it received to somewhere the links do not describe.

```tsx
const sources: SankeyNode[] = [
  { id: 'search', label: 'Search' },
  { id: 'social', label: 'Social' },
  { id: 'direct', label: 'Direct' },
  { id: 'signup', label: 'Signed up' },
  { id: 'browse', label: 'Browsed' },
  { id: 'left', label: 'Left' },
];

const flows: SankeyLink[] = [
  { source: 'search', target: 'signup', value: 5200 },
  { source: 'search', target: 'browse', value: 12400 },
  { source: 'social', target: 'browse', value: 8100 },
  { source: 'social', target: 'left', value: 9600 },
  { source: 'direct', target: 'signup', value: 3100 },
  { source: 'direct', target: 'left', value: 2800 },
];
```

### Notes

The entrance runs column by column, so the flow arrives in the order it happens. `staggerDelay={0}` draws it all at once, and `animationDuration` sets how long one column takes. Both are ignored where the platform is set to reduce motion — the diagram is simply there.

The imperative handle carries `replay`, for a control that re-runs the entrance.

Colours come from the theme's five chart tokens, assigned by a node's position in your array and stepped once the palette runs out. A ribbon takes its source node's colour, so a stream is the colour of where it came from; set `color` on a link to override that, or on a node to fix the node and everything leaving it.

Under a right-to-left layout the flow is mirrored, so it still reads from where it starts.

---

Full page, with every example: https://panelui.dev/docs/charts/sankey-chart
