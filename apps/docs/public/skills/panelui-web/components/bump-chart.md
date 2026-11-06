# Bump Chart

How a set of things ranked against each other over time.

```tsx
import { BumpChart } from "@/components/panelui/bump-chart"
```

From npm the path is `panelui-web/bump-chart`. Install with `npx shadcn@latest add @panelui/bump-chart`.

## When to use it

Each series is drawn at its rank in every column, with an S-curve wherever it changes places. Use it for league tables, leaderboards, search positions or any ranking tracked over time.

The rows are evenly spaced whatever the gap between the scores behind them, so the chart shows order and not distance. When how far apart the series are matters, use a line chart of the scores instead.

More than three or four lines in their own colours are hard to follow through the crossings. Pick one out with `highlight`: it is drawn in its colour and on top, and the rest are drawn in a muted grey.

## Usage

```tsx
<BumpChart data={league} xDataKey="week" defaultHighlight="harbour">
  <BumpChart.Grid />
  <BumpChart.Line dataKey="harbour" label="Harbour" color="chart-2" />
  <BumpChart.Line dataKey="northside" label="Northside" />
  <BumpChart.YAxis />
  <BumpChart.XAxis />
  <BumpChart.Labels />
  <BumpChart.Tooltip />
</BumpChart>
```

## Parts

```tsx
<BumpChart data={…}>
  <BumpChart.Header />
  <BumpChart.Grid />
  <BumpChart.Skeleton />
  <BumpChart.Line dataKey="…" />
  <BumpChart.YAxis />
  <BumpChart.XAxis />
  <BumpChart.Labels />
  <BumpChart.Standings />
  <BumpChart.Tooltip />
  <BumpChart.Legend />
</BumpChart>
```

- `BumpChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the series key or your own control on the trailing side. Pass the value yourself, from `onHighlightChange` or `onActiveIndexChange` if it should follow the chart.
- `BumpChart.Grid` — Dashed guides down every column, and across every rank with `horizontal`.
- `BumpChart.Skeleton` — A thin bar on every rank row with a highlight moving across them, drawn only while `status` is `loading`.
- `BumpChart.Line` — One series. Declare one per key. With `values="score"`, their order breaks ties.
- `BumpChart.YAxis` — The ranks down the side, one on every row, with room made for them. `format` changes `#1` to anything else.
- `BumpChart.XAxis` — Column labels along the bottom. `ticks` sets how many are shown, spread across the run.
- `BumpChart.Labels` — Each series' name level with its last point, in a column kept on the right. The names move with their lines when the data changes. Pressing one picks that line out, and pressing it again clears it. `pressable={false}` turns that off.
- `BumpChart.Standings` — A table of the column being read, or of the last column when none is, with the places gained or lost since the column before. Reading the chart reorders it. It sits beside the plot from 448 pixels wide and under it below that.
- `BumpChart.Tooltip` — The readout, and what drives it. It lists every series in the order it stood at that column, and it covers the plot, so the pointer does not have to land on a line.
- `BumpChart.Legend` — A swatch and a name per series, over the top corner of the plot. On a chart with a header, use the header's `legend` prop instead.

## Props

`BumpChart`, `BumpChart.Header`, `BumpChart.Labels`, `BumpChart.Standings` and `BumpChart.Legend` also take the props of the element they render, and a `className`. `BumpChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `BumpChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly BumpChartDatum[]` | **required** | The rows. Each one is a column: a week, a round, a release. |
| `xDataKey` | `string` | `'date'` | Key holding the column's label. |
| `values` | `'rank' \| 'score'` | `'rank'` | What the series columns hold. `rank` takes them as places, `1` at the top. `score` ranks every row for you, highest first. |
| `highlight` | `string \| null` | — | The series drawn in its colour and on top, with the rest muted. `null` picks none, and every line keeps its own colour. Controlled: pair it with `onHighlightChange`. |
| `defaultHighlight` | `string \| null` | `null` | The series picked out on first render, when `highlight` is not passed. |
| `onHighlightChange` | `(key: string \| null) => void` | — | Called when a name in `Labels` or a row of `Standings` is pressed. |
| `status` | `BumpChartStatus` | `'ready'` | `loading` hides the lines and shows `BumpChart.Skeleton` if there is one. The lines are drawn in from the left when it turns `ready`. |
| `aspectRatio` | `number` | `1.7` | The plot's width ÷ height. |
| `animationDuration` | `number` | `700` | Milliseconds for the lines to draw in. |
| `morphDuration` | `number` | `500` | Milliseconds for the lines to move to new places when the data changes. |
| `onActiveIndexChange` | `(index: number, datum: BumpChartDatum \| null) => void` | — | The column being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding, for a chart with no axes. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: BumpChartDatum, index: number) => string` | — | What a screen reader says for one column. Defaults to its label and every series' rank. |

#### `BumpChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `vertical` | `boolean` | — | A guide down every column. |
| `horizontal` | `boolean` | — | A guide across every rank. |
| `dashArray` | `string` | — | The stroke's dash pattern. |
| `opacity` | `number` | — | Opacity of the lines. |

#### `BumpChartLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dataKey` | `string` | **required** | Column in the data holding this series' rank, or its score with `values="score"`. |
| `label` | `string` | — | The name shown by `Labels`, `Standings`, the tooltip and the legend. Defaults to `dataKey`. |
| `color` | `BumpChartColor` | — | Which of the theme's roles the series is drawn in. |
| `strokeWidth` | `number` | — | Thickness of the line. The picked-out line is drawn one pixel thicker. |
| `showDots` | `boolean` | — | Draw a dot at every column. |

#### `BumpChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | — | How many rank rows to stand in for. Defaults to the data's, and at least four. |
| `duration` | `number` | — | Milliseconds for one pass of the sweep. |

#### `BumpChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many columns to label, spread across the run. |
| `format` | `(datum: BumpChartDatum, index: number) => string` | — | Turn a row into its label. Defaults to the value at `xDataKey`. |

#### `BumpChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `format` | `(rank: number) => string` | — | Format a rank. Defaults to `#1`, `#2`… |

#### `BumpChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `width` | `number` | `84` | Room kept to the right of the plot for the names. Longer names are cut short. |
| `pressable` | `boolean` | `true` | Let pressing a name pick that line out, and pressing it again clear it. |

#### `BumpChartStandingsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatRank` | `(rank: number) => string` | `(rank: number) => '#' + rank` | Format a rank. Defaults to `#1`, `#2`… |
| `movement` | `boolean` | `true` | Show the places gained or lost since the column before. |
| `pressable` | `boolean` | `true` | Let pressing a row pick that line out, and pressing it again clear it. |

#### `BumpChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatRank` | `(rank: number) => string` | `(rank: number) => '#' + rank` | Format a rank in the readout. Defaults to `#1`, `#2`… |
| `formatX` | `(datum: BumpChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `className` | `string` | — | Added to the readout's surface. |

#### `BumpChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a total. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. |

## In a Server Component

`BumpChart` is a client component. A Server Component cannot read `BumpChart.Header` off the import, so import each part by name: `BumpChartHeader`, `BumpChartGrid`, `BumpChartLine`, `BumpChartSkeleton`, `BumpChartXAxis`, `BumpChartYAxis`, `BumpChartLabels`, `BumpChartStandings`, `BumpChartTooltip`, `BumpChartLegend`.

## Notes

#### The data

One row per column. Each series is a key holding its rank in that column, with `1` at the top. A missing or non-numeric value leaves a gap in that line, and a line that stops before the last column has its name beside the point where it stopped. The number of rows is the lowest rank any series holds, so a table of five with one series missing keeps five rows.

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone, so a header does not shrink it. The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

`YAxis` and `Labels` each keep room beside the plot. `Labels` takes 84 pixels by default; set its `width` for longer or shorter names. A name that does not fit is cut short.

#### Bundle size

The chart adds about 60 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root. The drawing library is shared with the other web charts, so a second chart costs far less.

#### Colour

`color` on `BumpChart.Line` names a role in the theme. Every series defaults to `chart-1`, so give the others their own, or pick one out with `highlight` and leave the rest.

#### Reading a column

With a `Tooltip` or `Standings`, hovering a column reads it. On a touch screen a sideways drag reads the columns it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the column changes, not on every frame, so it can drive a readout outside the chart, as the first example does. Inside the chart, `useBumpChart` gives the same column and the picked line.

#### Keyboard

With a `Tooltip` or `Standings`, the plot takes focus. The arrow keys move between columns, Home and End go to the first and last, and Escape clears the reading. The names and the rows of the table are buttons.

#### Screen readers

Each column is given as text beside the drawing, listing every series' rank. `label` names the chart and `labelForDatum` writes a column. The names and the rows of the table say whether they are pressed.

#### Reduced motion

With reduced motion set, the lines appear without drawing in, and the skeleton's highlight is not drawn.

## Example

```tsx
'use client';

import { useState } from 'react';
import { BumpChart, bumpRanks, type BumpChartDatum } from '@/components/panelui/bump-chart';
import { Frame } from '@/components/panelui/frame';

const CLUBS = [
  { key: 'harbour', label: 'Harbour', color: 'chart-2' },
  { key: 'northside', label: 'Northside', color: 'chart-1' },
  { key: 'kestrel', label: 'Kestrel', color: 'chart-3' },
  { key: 'oldMill', label: 'Old Mill', color: 'chart-4' },
  { key: 'riverside', label: 'Riverside', color: 'chart-5' },
] as const;

const LEAGUE = [
  { week: 'w32', harbour: 3, northside: 2, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w33', harbour: 3, northside: 2, kestrel: 1, oldMill: 5, riverside: 4 },
  { week: 'w34', harbour: 2, northside: 3, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w35', harbour: 2, northside: 1, kestrel: 3, oldMill: 4, riverside: 5 },
  { week: 'w36', harbour: 1, northside: 3, kestrel: 2, oldMill: 4, riverside: 5 },
  { week: 'w37', harbour: 1, northside: 2, kestrel: 3, oldMill: 5, riverside: 4 },
  { week: 'Now', harbour: 1, northside: 2, kestrel: 3, oldMill: 4, riverside: 5 },
];

const RANKS = bumpRanks(LEAGUE, CLUBS.map(({ key }) => key));

export default function BumpChartOverview() {
  const [picked, setPicked] = useState<string | null>('harbour');
  const [active, setActive] = useState<{ index: number; datum: BumpChartDatum } | null>(null);

  const club = CLUBS.find(({ key }) => key === picked);
  const column = active ? active.index : LEAGUE.length - 1;
  const rank = club ? RANKS[club.key]?.[column] : null;

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>League table</Frame.Title>
        <Frame.Action>{picked ? 'Press again to clear' : 'Press a name'}</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <BumpChart
          data={LEAGUE}
          xDataKey="week"
          highlight={picked}
          onHighlightChange={setPicked}
          onActiveIndexChange={(index, datum) => setActive(datum ? { index, datum } : null)}
        >
          <BumpChart.Header
            title={club ? club.label : 'No club picked'}
            value={rank ? `#${rank}` : 'None'}
            caption={LEAGUE[column]?.week}
          />
          <BumpChart.Grid />
          {CLUBS.map(({ key, label, color }) => (
            <BumpChart.Line key={key} dataKey={key} label={label} color={color} />
          ))}
          <BumpChart.YAxis />
          <BumpChart.XAxis />
          <BumpChart.Labels />
          <BumpChart.Tooltip />
        </BumpChart>
      </Frame.Panel>
    </Frame>
  );
}
```
