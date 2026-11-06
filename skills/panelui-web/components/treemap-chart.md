# Treemap Chart

A total, cut into the parts it is made of, sized by area.

```tsx
import { TreemapChart } from "@/components/panelui/treemap-chart"
```

From npm the path is `panelui-web/treemap-chart`. Install with `npx shadcn@latest add @panelui/treemap-chart`.

## When to use it

Use it to show what a total is made of when there are too many parts for a pie chart. Each tile is one part, and its area is its share of the whole.

People compare areas badly, so a treemap is for ranking and grouping at a glance. Exact values belong in the labels, the readout or a `Breakdown` table.

The tiles are sorted largest first and share one colour that fades with rank, because the area already says which is bigger.

## Usage

```tsx
<TreemapChart data={spend}>
  <TreemapChart.Header title="Spend" value="$48,200" />
  <TreemapChart.Tiles />
  <TreemapChart.Labels />
  <TreemapChart.Tooltip />
</TreemapChart>
```

## Parts

```tsx
<TreemapChart data={…}>
  <TreemapChart.Header />
  <TreemapChart.Tiles />
  <TreemapChart.Skeleton />
  <TreemapChart.Labels />
  <TreemapChart.Tooltip />
  <TreemapChart.Legend />
  <TreemapChart.Breakdown />
</TreemapChart>
```

- `TreemapChart.Header` — The strip above the box: `title`, `value` and `caption`, with your own control on the trailing side. Pass the value yourself, from `onActiveIndexChange` if it should follow the chart.
- `TreemapChart.Tiles` — The rectangles. One part rather than one per datum, because a tile's box depends on every tile before it in its row.
- `TreemapChart.Skeleton` — The box undivided, with a highlight moving across it, drawn only while `status` is `loading`.
- `TreemapChart.Labels` — Names and values on the tiles. A tile shows both on two lines, both on one line, its name alone, or nothing, depending on its room.
- `TreemapChart.Tooltip` — The readout for the tile being read. This is how the tiles too small to label are read.
- `TreemapChart.Legend` — A swatch and a name per tile, under the box. Pointing at one reads its tile, and pressing it pins the reading.
- `TreemapChart.Breakdown` — A table of every tile with its exact value and share. Reading a row lights its tile. It sits beside the box from 448 pixels wide and under it below that.

## Props

`TreemapChart`, `TreemapChart.Header`, `TreemapChart.Legend` and `TreemapChart.Breakdown` also take the props of the element they render, and a `className`. `TreemapChart.Labels` puts its `className` on the layer of labels, and `TreemapChart.Tooltip` puts its own on the readout. The other parts take only the props listed.

#### `TreemapChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly TreemapDatum[]` | **required** | The parts of the total, in any order. Sorted by the chart unless told not to. |
| `aspectRatio` | `number` | `1.4` | Width ÷ height of the box the tiles fill. |
| `gap` | `number` | `3` | Pixels between one tile and the next. |
| `cornerRadius` | `number` | `6` | Corner radius of a tile, in pixels. |
| `tileAspect` | `number` | `1` | How much wider than square-ish to lay the tiles out. `1` keeps the shapes closest to square, which are the easiest to compare. Raise it on a short chart, where a tile needs width for a name across it. |
| `sort` | `boolean` | `true` | Sort the tiles largest first. The layout assumes a descending run, so the shapes suffer without it. Turn it off where the given order is the message. |
| `maxTiles` | `number` | — | The most tiles to draw, counting the gathered one. Past it, the first tiles are kept, which are the largest unless `sort` is off, and the rest are gathered into one. |
| `otherLabel` | `string` | `'Other'` | What the gathered tile is called. |
| `color` | `TreemapChartColor` | `'chart-1'` | The ramp's hue: a theme role or any CSS colour. |
| `animationDuration` | `number` | `520` | Milliseconds for one tile to arrive. |
| `staggerDelay` | `number` | `26` | Milliseconds between one tile starting and the next. `0` for all at once. |
| `status` | `TreemapChartStatus` | `'ready'` | `loading` holds the tiles back. Add a `TreemapChart.Skeleton` to stand in the box meanwhile. |
| `activeIndex` | `number` | — | The tile being read, indexed as laid out. Leave unset to let the chart track it. |
| `onActiveIndexChange` | `(index: number, tile: TreemapTile \| null) => void` | — | Fires with the tile being read, and `-1`/`null` when there is none. Fires on hover as well as on a press. |
| `onSelect` | `(tile: TreemapTile) => void` | — | Fires when a tile is clicked or tapped, or Enter is pressed on it. For a tile that leads somewhere. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForTile` | `(tile: TreemapTile) => string` | — | What a screen reader says for one tile. Defaults to its name, value and share. |

#### `TreemapChartTilesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dimOpacity` | `number` | `0.35` | Opacity of the tiles that are not being read, once one is. |

#### `TreemapChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | `1400` | Milliseconds for one pass of the sweep. |

#### `TreemapChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showValue` | `boolean` | `true` | Show each tile's value under its name. |
| `showShare` | `boolean` | `false` | Show each tile's share of the total beside its value. |
| `formatValue` | `(value: number, tile: TreemapTile) => string` | — | Format the value. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `TreemapChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, tile: TreemapTile) => string` | — | Format the value. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `TreemapChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `limit` | `number` | — | How many tiles to name before stopping. |
| `showShare` | `boolean` | `true` | Show each tile's share beside its name. |

#### `TreemapChartBreakdownProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `limit` | `number` | — | How many tiles to list before stopping. |
| `showShare` | `boolean` | `true` | Show each tile's share beside its value. |
| `formatValue` | `(value: number, tile: TreemapTile) => string` | — | Format the value. Defaults to the full number. |

#### `TreemapChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the total is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a caveat. |

## In a Server Component

`TreemapChart` is a client component. A Server Component cannot read `TreemapChart.Header` off the import, so import each part by name: `TreemapChartHeader`, `TreemapChartTiles`, `TreemapChartSkeleton`, `TreemapChartLabels`, `TreemapChartTooltip`, `TreemapChartLegend`, `TreemapChartBreakdown`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the box alone, so a header does not shrink it. The tiles draw in the browser after the box has been measured, and the space is reserved until then, so they are not in server-rendered HTML.

#### Bundle size

The chart adds about 60 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Colour

`color` names a role in the theme or takes any CSS colour, on the chart for the ramp and on a datum for one tile. Labels are white or near-black depending on the tile under them, so they stay readable on any colour in both themes.

#### Reading a tile

Hovering a tile reads it and dims the others. A click or a tap pins the reading, a second one on the same tile lets go of it, and Escape clears it. `onActiveIndexChange` fires when the tile changes, so it can drive a readout outside the chart, as the first example does. For a tile that opens something, use `onSelect`, which does not fire on hover.

#### Keyboard

The box takes focus. The arrow keys move between tiles, Enter or Space pins the reading and fires `onSelect`, and Escape clears it. The rows of `Legend` and `Breakdown` are buttons.

#### Screen readers

Each tile is given as text beside the drawing. `label` names the chart and `labelForTile` writes a tile, for values with a unit.

#### Negative values

Negative and non-finite values are treated as zero, because an area cannot be less than none.

#### Reduced motion

With reduced motion set, the tiles and labels appear in place, and the skeleton's highlight is not drawn.

## Example

```tsx
'use client';

import { useState } from 'react';
import { Frame } from '@/components/panelui/frame';
import { TreemapChart, type TreemapTile } from '@/components/panelui/treemap-chart';

const SPEND = [
  { label: 'Compute', value: 18_300 },
  { label: 'Storage', value: 8_200 },
  { label: 'Network', value: 6_100 },
  { label: 'Database', value: 5_400 },
  { label: 'Logs', value: 3_700 },
  { label: 'CDN', value: 2_900 },
  { label: 'Backups', value: 2_100 },
  { label: 'Email', value: 1_500 },
];

const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

const total = SPEND.reduce((sum, part) => sum + part.value, 0);

export default function TreemapChartOverview() {
  const [active, setActive] = useState<TreemapTile | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Infrastructure</Frame.Title>
        <Frame.Action>November</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <TreemapChart data={SPEND} color="primary" onActiveIndexChange={(_index, tile) => setActive(tile)}>
          <TreemapChart.Header
            title={active ? active.label : 'Spend this month'}
            value={dollars(active ? active.value : total)}
            caption={active ? `${Math.round(active.share * 100)}% of spend` : 'Compute is 38% of it'}
          />
          <TreemapChart.Tiles />
          <TreemapChart.Labels formatValue={dollars} />
          <TreemapChart.Tooltip formatValue={dollars} />
        </TreemapChart>
      </Frame.Panel>
    </Frame>
  );
}
```
