# Hex Chart

A whole broken into parts, counted out in hexagonal cells.

```tsx
import { HexChart } from "@/components/panelui/hex-chart"
```

From npm the path is `panelui-web/hex-chart`. Install with `npx shadcn@latest add @panelui/hex-chart`.

## When to use it

Use it to show how one total divides, in a form a reader can count: revenue by channel, seats by team. Each item in `data` has a `label` and a `value`, and takes a share of the cells in proportion.

Every cell is a whole unit, so a series worth less than a cell can disappear. It suits shares of a few percent and up. For a long tail, use a Bar Chart.

## Usage

```tsx
<HexChart data={attribution}>
  <HexChart.Cells />
  <HexChart.Tooltip />
  <HexChart.Legend />
</HexChart>
```

## Parts

```tsx
<HexChart data={…}>
  <HexChart.Header />
  <HexChart.Cells />
  <HexChart.Skeleton />
  <HexChart.Tooltip />
  <HexChart.Legend />
</HexChart>
```

- `HexChart.Header` — The strip above the field: `title`, `value` and `caption`, with a key or your own control on the trailing side.
- `HexChart.Cells` — The honeycomb: the unfilled field and the series over it. Without this part nothing is drawn.
- `HexChart.Skeleton` — The field with nothing divided up, tinted, while `status` is `loading`.
- `HexChart.Tooltip` — Makes the field readable by pointer and keyboard, and hangs a label above the series being read.
- `HexChart.Legend` — A swatch, a name and a share per series, under the field. Each is a button that selects its series.

## Props

`HexChart`, `HexChart.Header` and `HexChart.Legend` also take the props of the element they render, and a `className`. `HexChart.Tooltip` puts its `className` on the label. The other parts draw nothing themselves and take only the props listed.

#### `HexChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly HexDatum[]` | **required** | The slices of the whole. |
| `columns` | `number` | `21` | Cells across the field. Rows follow from the width, the height and this, and the size of one cell follows from all three. |
| `aspectRatio` | `number` | `1.6` | The field's width ÷ height. |
| `density` | `number` | `0.55` | How much of the field a `blob` fills, from 0 to 1. A `grid` always fills all of it. The rest is left as the unfilled cells around the shape. |
| `shape` | `HexShape` | `'blob'` | `blob` grows from the middle and shows the split at a glance. `grid` is reading order, for counting. |
| `cellGap` | `number` | `0.14` | Space between cells, as a share of a cell's radius. |
| `animationDuration` | `number` | `620` | Milliseconds for the series to fill in. `0` draws them at once. |
| `status` | `HexChartStatus` | `'ready'` | `loading` shows the field with nothing divided up yet. Add a `HexChart.Skeleton` to tint it. |
| `activeIndex` | `number` | — | The series being read, by index, or -1 for none. Leave unset to let the chart keep it. |
| `onActiveIndexChange` | `(index: number) => void` | — | The series being read, by index, and -1 when there is none. Reading needs `HexChart.Tooltip`. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(series: HexDatum, index: number) => string` | — | What a screen reader says for one series. Defaults to its name and share. |

#### `HexChartCellsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `emptyColor` | `string` | — | Colour of the cells no series took, a theme role or any CSS colour. Defaults to the muted surface. |
| `dimOpacity` | `number` | `0.25` | Opacity of the series that are not being read, once one is. |

#### `HexChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | A theme role or any CSS colour. Defaults to the muted surface. |

#### `HexChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, series: HexDatum) => string` | — | Format the series' value. Defaults to a compact number. |
| `showCells` | `boolean` | `false` | Show the count of cells beside the share. |
| `className` | `string` | — | Added to the readout's surface. |

#### `HexChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showValue` | `boolean` | `true` | Show each series' share of the whole beside its name. |

#### `HexChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a caveat. |
| `labels` | `Record<string, string>` | — | Prettier names for the series, keyed by their `label`. |
| `legend` | `boolean` | `false` | Draw a swatch and a name per series along the trailing edge. For two or three short names. Past that use `HexChart.Legend`, which runs across the full width. |

## In a Server Component

`HexChart` is a client component. A Server Component cannot read `HexChart.Header` off the import, so import each part by name: `HexChartHeader`, `HexChartCells`, `HexChartTooltip`, `HexChartLegend`, `HexChartSkeleton`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the field alone, so a header and a legend do not shrink it. Rows follow from the width, the height and `columns`.

#### Reading

A mouse reads the series under it. A tap or a click pins the reading, and pressing the same series again or an unfilled cell clears it. Once the field has focus, the arrow keys walk the series and Escape clears the reading. All of this comes from `HexChart.Tooltip`. Without it, only the legend selects.

#### Accessibility

The chart renders a list of its series for screen readers, and announces the series being read. `label` and `labelForDatum` set what it says. With reduced motion set, the series appear at once without the fill. `animationDuration={0}` draws them at once for everybody.

## Example

```tsx
'use client';

import { useState } from 'react';
import { HexChart } from '@/components/panelui/hex-chart';
import { Frame } from '@/components/panelui/frame';

const ATTRIBUTION = [
  { label: 'Organic', value: 2_880 },
  { label: 'Paid search', value: 1_740 },
  { label: 'Referral', value: 1_120 },
  { label: 'Email', value: 640 },
  { label: 'Social', value: 370 },
];

const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

const total = ATTRIBUTION.reduce((sum, { value }) => sum + value, 0);

export default function HexChartOverview() {
  const [active, setActive] = useState(-1);
  const series = ATTRIBUTION[active];
  return (
    <Frame className="w-full max-w-lg" variant="band">
      <Frame.Header>
        <Frame.Title>Attribution</Frame.Title>
        <Frame.Action>This quarter</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <HexChart data={ATTRIBUTION} label="Revenue by channel" onActiveIndexChange={setActive}>
          <HexChart.Header
            title={series ? series.label : 'Attributed revenue'}
            value={dollars(series ? series.value : total)}
            caption={series ? `${Math.round((series.value / total) * 100)}% of the total` : 'Across five channels'}
          />
          <HexChart.Cells />
          <HexChart.Tooltip formatValue={dollars} />
          <HexChart.Legend />
        </HexChart>
      </Frame.Panel>
    </Frame>
  );
}
```
