# Sankey Chart

Where a quantity came from and where it ended up, as ribbons between stages.

```tsx
import { SankeyChart, type SankeyNode, type SankeyLink } from "@/components/panelui/sankey-chart"
```

From npm the path is `panelui-web/sankey-chart`. Install with `npx shadcn@latest add @panelui/sankey-chart`.

## When to use it

Use it for a routing question: which campaigns produced which signups, which budget lines paid for which departments. The answer has to need a source and a target, because a ribbon has two ends and its thickness is the amount that travelled.

Ribbons are grey at rest and the bars carry the colour. Hovering, tapping or walking to a stage with the arrow keys colours its whole route, every stage before and after it, and a click pins the reading.

The rows under the diagram are optional: `SankeyChart.Breakdown` and `SankeyChart.Legend` are parts, so a chart has them only if you write them.

For a total cut into parts with no routing between them, or what survived each step of one process, a bar chart is easier to read.

## Usage

```tsx
<SankeyChart nodes={stages} links={flows} height={300}>
  <SankeyChart.Links />
  <SankeyChart.Nodes />
  <SankeyChart.Labels />
</SankeyChart>
```

## Parts

```tsx
<SankeyChart nodes={…} links={…}>
  <SankeyChart.Header />
  <SankeyChart.Skeleton />
  <SankeyChart.Links />
  <SankeyChart.Nodes />
  <SankeyChart.Labels />
  <SankeyChart.Tooltip />
  <SankeyChart.Breakdown />
  <SankeyChart.Legend />
</SankeyChart>
```

- `SankeyChart.Header` — The strip above the diagram: `title`, `value` and `caption`, with your own control on the trailing side. The value is not derived, because 128400 can be a count, a currency or a rate.
- `SankeyChart.Skeleton` — Plain equal bars and ribbons, drawn only while `status` is `loading`. Equal, because varied thicknesses would look like real routing.
- `SankeyChart.Links` — The ribbons, grey at rest and in their source's colour on the route being read. With `gradient` each one blends from its source's colour to its target's all the time, and a reading dims the others. A ribbon's `opacity` on the data fades it within that gradient.
- `SankeyChart.Nodes` — The bars the ribbons run between. A bar's height is what passes through it. A node with `bar: false` draws none and can still be read.
- `SankeyChart.Labels` — The names beside the bars, with the figure under each if you pass `showValue`. Where two names would collide, the larger stage keeps its name.
- `SankeyChart.Tooltip` — The figures in a popover beside what is being read. It covers some of the diagram, so a chart with a `Breakdown` usually does not need it.
- `SankeyChart.Breakdown` — Optional. The figures, written out under the diagram. At rest it lists where the flow starts and ends. Reading a stage swaps in where each of its streams came from and went, with its share of the stage. A row selects the node it names. It holds its height, so reading a stage does not move the page.
- `SankeyChart.Legend` — Optional. Every stage named under the diagram with its share of the largest column's total. Use it when some bars are too small to carry a name: pressing an entry selects that node.

## Props

`SankeyChart`, `SankeyChart.Header`, `SankeyChart.Breakdown` and `SankeyChart.Legend` also take the props of the element they render, and a `className`. `SankeyChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `SankeyChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `nodes` | `readonly SankeyNode[]` | **required** | The stages. Order does not decide position; the links do. |
| `links` | `readonly SankeyLink[]` | **required** | What travels between them. |
| `height` | `number` | — | How tall the diagram is drawn, in pixels. Under `orientation="vertical"` it is the length of the flow, and left unset it is worked out from how many stages the flow needs. |
| `nodeWidth` | `number` | `10` | How thick a node's bar is, in pixels. |
| `nodePadding` | `number` | `14` | The most space between two nodes in a column, in pixels. A crowded column gives it up first. |
| `orientation` | `SankeyOrientation` | `'horizontal'` | `horizontal` runs the flow across, `vertical` from the top down, which suits a narrow screen. |
| `collapse` | `SankeyCollapse` | — | Folds each column's smallest nodes into one bucket. `maxPerColumn` caps how many a column keeps, the bucket included; `minShare` folds anything under that fraction of its column; `label` names the bucket, `Other` by default. |
| `align` | `SankeyAlign` | `'justify'` | Which column a node goes in where the flow leaves a choice. |
| `iterations` | `number` | `6` | Relaxation rounds spent untangling the ribbons. |
| `curve` | `number` | `0.5` | How far a ribbon bends, `0` for a straight diagonal and `0.5` for an S. |
| `animationDuration` | `number` | `620` | Milliseconds for one column to draw itself. |
| `staggerDelay` | `number` | `110` | Milliseconds between one column starting and the next. |
| `status` | `SankeyChartStatus` | `'ready'` | `loading` holds the data back. Add `SankeyChart.Skeleton` for a shape to stand in meanwhile. |
| `activeId` | `string \| null` | — | Selected node. Leave unset to let the chart track it. |
| `onActiveIdChange` | `(id: string \| null) => void` | — | Fires with the id of the node being read, and `null` when none is. |
| `targetRows` | `SankeyRowGrid` | — | Ends the last column's ribbons on rows beside the chart, such as a table's, in the order those nodes were given, with no bars or names of their own. Set `height` to fit the rows, and keep each row to one line, because a taller row moves those below it off their ribbons. A horizontal flow only. |
| `onLayout` | `(targets: readonly SankeyTargetLayout[]) => void` | — | Fires with where the last column landed, and again when that moves. |
| `onDropLinks` | `(count: number) => void` | — | Fires with how many link rows could not be drawn: ones naming a node that is not there, carrying nothing, or closing a loop. `0` after a clean render. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForLink` | `(link: SankeyLink, index: number) => string` | — | What a screen reader says for one ribbon. Defaults to "source to target, value". |

#### `SankeyChartLinksProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `gradient` | `boolean` | — | Blend each ribbon from its source's colour to its target's, at rest as well as on a route. |
| `opacity` | `number` | — | A ribbon's opacity at rest. Defaults to `0.09`, or `0.45` with `gradient`. |
| `activeOpacity` | `number` | — | A ribbon's opacity on the route being read. Defaults to `0.42`, or `0.8` with `gradient`. |

#### `SankeyChartNodesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `radius` | `number` | — | Corner radius on a node's bar, in pixels. |
| `dimOpacity` | `number` | — | A bar's opacity when it is off the route being read. |
| `interactive` | `boolean` | — | Whether hovering or pressing a bar reads its node. |

#### `SankeyChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, id: string) => string` | — | Format the figure under a name. Defaults to a compact number. |
| `showValue` | `boolean` | — | Show the figure under the name. |
| `minHeight` | `number` | — | Hide the name on a bar shorter than this, in pixels. |

#### `SankeyChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number) => string` | — | Format the figures. Defaults to a compact number. |
| `className` | `string` | — | Added to the readout's surface. |

#### `SankeyChartBreakdownProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number) => string` | — | Format the figures. Defaults to a compact number. |
| `maxRows` | `number` | — | How many rows each side shows before stopping. |
| `onSelectNode` | `(id: string) => void` | — | Fires with the node at the other end of a row, as the chart follows it there. |
| `startsTitle` | `ReactNode` | `'Sources'` | The heading over the stages nothing arrives at, while nothing is being read. |
| `endsTitle` | `ReactNode` | `'Outcomes'` | The heading over the stages nothing leaves, while nothing is being read. |
| `sourcesTitle` | `ReactNode` | `'From'` | The heading over what arrives at the stage being read. |
| `targetsTitle` | `ReactNode` | `'To'` | The heading over what leaves the stage being read. |

#### `SankeyChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `limit` | `number` | — | How many names to show before stopping. |
| `showShare` | `boolean` | — | Show each node's share of the largest column's total beside its name. |

#### `SankeyChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the flow is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a caveat. |

## In a Server Component

`SankeyChart` is a client component. A Server Component cannot read `SankeyChart.Header` off the import, so import each part by name: `SankeyChartHeader`, `SankeyChartLinks`, `SankeyChartNodes`, `SankeyChartLabels`, `SankeyChartTooltip`, `SankeyChartBreakdown`, `SankeyChartLegend`, `SankeyChartSkeleton`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `height`, because nothing in a flow says how deep it should be. Raising it thickens every ribbon together, which is how to make small streams legible. The plot draws in the browser after it has been measured, and the space is reserved until then.

#### What a bar is worth

A node is worth the larger of what arrives and what leaves. Give it a `value` to pin it, for a stage that loses some of what it received to somewhere the links do not describe.

#### Keyboard

The arrow keys walk the bars, column by column. Escape clears the reading. A screen reader gets every ribbon as a list, named by `labelForLink`.

## Example

```tsx
'use client';

import { Frame } from '@/components/panelui/frame';
import { SankeyChart, useSankeyChart, type SankeyLink, type SankeyNode } from '@/components/panelui/sankey-chart';

const STAGES: SankeyNode[] = [
  { id: 'search', label: 'Search' },
  { id: 'social', label: 'Social' },
  { id: 'direct', label: 'Direct' },
  { id: 'docs', label: 'Docs' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'signup', label: 'Signed up' },
  { id: 'left', label: 'Left' },
];

const FLOWS: SankeyLink[] = [
  { source: 'search', target: 'docs', value: 26_000 },
  { source: 'search', target: 'pricing', value: 16_000 },
  { source: 'social', target: 'docs', value: 9_000 },
  { source: 'social', target: 'pricing', value: 22_000 },
  { source: 'direct', target: 'docs', value: 12_000 },
  { source: 'direct', target: 'pricing', value: 13_000 },
  { source: 'docs', target: 'signup', value: 14_000 },
  { source: 'docs', target: 'left', value: 33_000 },
  { source: 'pricing', target: 'signup', value: 21_000 },
  { source: 'pricing', target: 'left', value: 30_000 },
];

const TOTAL = 98_000;

function Reading() {
  const { activeLabel, activeValue, activeLink } = useSankeyChart();
  if (activeLink) {
    return (
      <SankeyChart.Header
        title={`${activeLink.source.label} to ${activeLink.target.label}`}
        value={activeLink.value.toLocaleString('en-US')}
      />
    );
  }
  return (
    <SankeyChart.Header
      title={activeLabel ? `${activeLabel}, ${Math.round((activeValue / TOTAL) * 100)}% of sessions` : 'Sessions'}
      value={(activeLabel ? activeValue : TOTAL).toLocaleString('en-US')}
    />
  );
}

export default function SankeyChartOverview() {
  return (
    <Frame variant="band" className="w-full max-w-2xl">
      <Frame.Header>
        <Frame.Title>Traffic</Frame.Title>
        <Frame.Action>November</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <SankeyChart nodes={STAGES} links={FLOWS} height={300} label="Sessions from source to outcome">
          <Reading />
          <SankeyChart.Links />
          <SankeyChart.Nodes />
          <SankeyChart.Labels showValue />
          <SankeyChart.Breakdown formatValue={(value) => value.toLocaleString('en-US')} />
        </SankeyChart>
      </Frame.Panel>
    </Frame>
  );
}
```
