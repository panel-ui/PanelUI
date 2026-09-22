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
  <SankeyChart.Header />     {/* the strip above the diagram */}
  <SankeyChart.Skeleton />   {/* the plain shape it waits behind */}
  <SankeyChart.Links />      {/* the ribbons */}
  <SankeyChart.Nodes />      {/* the bars they run between */}
  <SankeyChart.Labels />     {/* the names, and the press targets */}
  <SankeyChart.Tooltip />    {/* what the selected node carries */}
  <SankeyChart.Legend />     {/* every stage named, under the diagram */}
  <SankeyChart.Breakdown />  {/* the selected stage, written out in full */}
</SankeyChart>
```

### Parts

- `SankeyChart.Breakdown` — What the selected stage carries, listed underneath at the full width of the card: where each stream came from, where each one went, and what share of the stage it was. In and out are separate because they are only the same number when nothing was lost, and a stage where they differ is the interesting one. Pressing a row selects the node at the other end, so a flow can be walked one stage at a time.
- `SankeyChart.Legend` — Every stage named, under the diagram, with its share of the largest stage. Pressing one selects the same node its bar would and fades the rest. This is how the nodes too small to carry a name are read and reached — on the chart they are a sliver, here they are a full name and a proper target.
- `SankeyChart.Header` — The strip above the diagram — what the flow is of, what it totals, and room for a control. The value is not derived, because the formatting is not the chart's to guess: 128400 is a count, a currency or a rate depending on what was routed.
- `SankeyChart.Links` — The ribbons. Drawn before the bars, so a bar sits on top of the flows that meet it and keeps a clean edge. Translucent at rest, because ribbons cross and an opaque one hides whichever passes under it.
- `SankeyChart.Nodes` — The bars the ribbons run between, drawn solid. A node is the one thing here that is not crossing anything else, and it reads as an edge only if nothing shows through it. Pressing a bar selects its node, so a stage too small to carry a name can still be reached; `interactive={false}` turns that off.
- `SankeyChart.Labels` — The names, set beside the bars rather than on them — a bar is ten points thick and no name fits in ten points. Also the press targets, padded out where a bar is smaller than one. Each name sits on a small backdrop in the page colour, so it reads over a ribbon of any colour. A name is shown whole or not at all: where two would collide the larger stage keeps its name, and under `orientation="vertical"` a name may run over a neighbour's bar when that neighbour is not using the room. The stages left without a name are the ones Legend and Breakdown are for.
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
| `height` | `number` | — | How tall the diagram is drawn, in points. Under `orientation="vertical"` this is the length of the flow rather than the size of the bars, and left unset it is worked out from how many stages the flow turned out to need. The width is the card's, but nothing in a flow says how deep it should be: a diagram of four nodes and one of forty are the same data at two heights, and which of them is right is a question about the screen. |
| `nodeWidth` | `number` | `10` | How thick a node's bar is, in points. |
| `nodePadding` | `number` | `14` | The gap between two nodes in a column, in points. A maximum rather than a promise. A crowded column gives its spacing up before it gives up the height of its bars, because the bar is the reading. |
| `orientation` | `SankeyOrientation` | `horizontal` | Which way the flow runs: `horizontal` from one side to the other, `vertical` from the top of the diagram down to the bottom. This is the axis the *stages* advance along, not the one the bars point along — a vertical flow draws its bars as horizontal rules and stacks them down the screen. Prefer it on a phone: the stages get the long side of the screen, and a name gets the whole width of the card instead of the gap between two columns. |
| `collapse` | `SankeyCollapse` | — | Folds each column's smallest nodes into one bucket, named `Other` unless you say otherwise. A ribbon carries its value in its thickness, so a column of thirty is thirty hairlines. `maxPerColumn` caps how many nodes a column keeps, the bucket included; `minShare` folds anything under that fraction of its own column. A column where fewer than two nodes would go in is left alone, because one node in a bucket is a rename rather than a simplification. |
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
| `accessibilityLabelForLink` | `(link: SankeyLink, index: number) => string` | — | Overrides what a screen reader says for one ribbon. The ribbons are the reading — a node's total says how much passed through it, never where it went — so each one is spoken in its own right, as "source to target, value". Only the rows that could be drawn are offered; a dropped row is reported through `onDropLinks` instead. |
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
| `radius` | `number` | `2` | Corner radius on a node's bar, in points. |
| `dimOpacity` | `number` | `0.08` | A bar's opacity when something else is selected. |
| `interactive` | `boolean` | `true` | Whether pressing a bar selects its node. On by default, because the names are not always there to press. A bar below `SankeyChart.Labels`' `minHeight` has no name and, without this, no way to be selected at all. |

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

#### `SankeyChartBreakdownProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `formatValue` | `(value: number) => string` | — | Format the figures. Defaults to a compact number. |
| `maxRows` | `number` | — | How many rows each side shows before stopping. |
| `onSelectNode` | `(id: string) => void` | — | Fires with the node at the other end of a row, so a breakdown can be walked: press where a stream went and the chart follows it there. |
| `placeholder` | `string` | `Select a stage to see what it carries` | Shown in place of the rows when nothing is selected. |

#### `SankeyChartLegendProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `limit` | `number` | — | How many names to show before stopping. |
| `showShare` | `boolean` | `true` | Show each node's share of the whole flow beside its name. |

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

### Which way it runs

`orientation` names the axis the *stages* advance along, not the one the bars point along: a vertical flow draws its bars as horizontal rules and stacks them down the screen. `align` swaps with it and settles which row a node goes in rather than which column.

A right-to-left layout mirrors a horizontal flow, so it still reads from where it starts. A vertical one is left alone — it starts at the top in every script, and mirroring it would flip the axis carrying the values rather than the one carrying the order.

### Reaching a stage too small to label

Pressing a bar selects its node, and a bar below the minimum target gets an invisible one over it to be pressed by, so selection never depends on a name being there. A node whose name was dropped stays in the accessibility tree, and every ribbon is offered to a screen reader in its own right as "source to target, value" — a node's total says how much passed through it and never where it went. `accessibilityLabelForLink` changes that wording.

---

Full page, with every example: https://panelui.dev/docs/charts/sankey-chart
