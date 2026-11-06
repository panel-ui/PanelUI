# Bubble Chart

One labelled circle per row, on two measured axes, with a third quantity on each circle's area.

```tsx
import { BubbleChart } from "@/components/panelui/bubble-chart"
```

From npm the path is `panelui-web/bubble-chart`. Install with `npx shadcn@latest add @panelui/bubble-chart`.

## When to use it

Use it to compare named things on three measures at once: growth, margin and revenue for a set of products. Each row of `data` is one circle. `xDataKey` and `yDataKey` place it, `sizeKey` sets its area and `labelKey` names it. Colour cycles by row, or comes from `colorKey`.

Area is hard to judge exactly, and overlapping circles hide each other, so it suits a dozen or two named rows. For many unnamed rows, use a [Scatter Chart](/docs/web/charts/scatter-chart).

## Usage

```tsx
<BubbleChart data={products} xDataKey="growth" yDataKey="margin" sizeKey="revenue" labelKey="code">
  <BubbleChart.Grid />
  <BubbleChart.Bubbles />
  <BubbleChart.Labels />
  <BubbleChart.XAxis />
  <BubbleChart.YAxis />
  <BubbleChart.Tooltip />
</BubbleChart>
```

## Parts

```tsx
<BubbleChart data={…}>
  <BubbleChart.Header />
  <BubbleChart.Grid />
  <BubbleChart.Quadrants />
  <BubbleChart.Trend />
  <BubbleChart.Bubbles />
  <BubbleChart.Labels />
  <BubbleChart.SizeKey />
  <BubbleChart.Skeleton />
  <BubbleChart.XAxis />
  <BubbleChart.YAxis />
  <BubbleChart.Tooltip />
  <BubbleChart.Legend />
</BubbleChart>
```

- `BubbleChart.Header` — The strip above the plot: `title`, `value` and `caption`, with your own control on the trailing side.
- `BubbleChart.Grid` — Lines both ways, in the theme's border colour. `rows` and `columns` are roughly how many: the axes pick round numbers near them.
- `BubbleChart.Quadrants` — A crosshair splitting the plot into four, with an optional word for each corner. It stands at the mean of each axis unless `x` and `y` pin it.
- `BubbleChart.Trend` — The straight line that fits the cloud best, dashed and under the circles. `onFit` gives you the slope, the intercept and how tight the fit is.
- `BubbleChart.Bubbles` — The circles. Without this part nothing is drawn or readable.
- `BubbleChart.Labels` — The names, inside the circles. A bubble under `minRadius` goes without, and a name longer than its circle is cut.
- `BubbleChart.SizeKey` — Three nested circles saying what an area is worth, over a corner of the plot. It needs `sizeKey` on the chart.
- `BubbleChart.Skeleton` — A still field of muted circles, drawn only while `status` is `loading`.
- `BubbleChart.XAxis` — Value labels under the plot, in round numbers. `label` names the axis.
- `BubbleChart.YAxis` — Value labels down the side, in round numbers. `label` names the axis.
- `BubbleChart.Tooltip` — Makes the field readable by pointer and keyboard, and floats a readout beside what is being read. `showLabel={false}` keeps the reading without the readout. `labels` names the keys in it.
- `BubbleChart.Legend` — A swatch and a name per row, under the plot, up to `limit`.

## Props

`BubbleChart`, `BubbleChart.Header`, `BubbleChart.SizeKey` and `BubbleChart.Legend` also take the props of the element they render, and a `className`. `BubbleChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `BubbleChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly BubbleChartDatum[]` | **required** | The rows. One bubble each. |
| `xDataKey` | `string` | `'x'` | Key holding the horizontal value. |
| `yDataKey` | `string` | `'y'` | Key holding the vertical value. |
| `sizeKey` | `string` | — | Key holding the third quantity, spaced by each bubble's area. The lowest value takes the smallest radius in `sizeRange` and the highest the largest, so sizes compare rows without giving their exact ratio. Without it every bubble is drawn at the middle of `sizeRange`. |
| `labelKey` | `string` | — | Key holding the name written inside the circle. |
| `colorKey` | `string` | — | Key holding a colour for the row: a theme role, a CSS colour, or a number from 1 to 5 naming a chart colour. Without it the ramp cycles by row. |
| `sizeRange` | `[number, number]` | `[10, 28]` | Smallest and largest radius `sizeKey` maps onto, in pixels. The largest is also what the plot holds back at every edge, so raising it costs room. |
| `status` | `BubbleChartStatus` | `'ready'` | `loading` holds the bubbles back and grows them in when it turns `ready`. Add a `BubbleChart.Skeleton` for something to stand in the plot meanwhile. |
| `aspectRatio` | `number` | `1` | The plot's width ÷ height. `1` is the square shape a bubble field reads best in. |
| `animationDuration` | `number` | `800` | Milliseconds for the bubbles to grow in. `0` draws them at once. |
| `domainDuration` | `number` | `500` | Milliseconds for the bubbles and the axes to settle after the data changes. |
| `xDomain` | `[number, number]` | — | Fix the horizontal axis instead of deriving it. |
| `yDomain` | `[number, number]` | — | Fix the vertical axis instead of deriving it. |
| `onActivePointChange` | `(point: BubbleChartPoint \| null) => void` | — | The bubble being read, and `null` when there is none. Fires when it changes, not per frame. Reading needs `BubbleChart.Tooltip`; `showLabel={false}` keeps it without the label. |
| `compact` | `boolean` | `false` | Drop the axis padding so the field reaches the edges, for a thumbnail. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: BubbleChartDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its name and values. |

#### `BubbleChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `8` | Roughly how many lines to draw across the plot. With a y-axis, the lines follow its `ticks` instead. |
| `columns` | `number` | `8` | Roughly how many lines to draw up it. With an x-axis, the lines follow its `ticks` instead. |
| `dashArray` | `string` | `'4 6'` | The stroke's dash pattern. |
| `opacity` | `number` | `1` | Opacity of the lines. |

#### `BubbleChartTrendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onFit` | `(fit: BubbleFit) => void` | — | The line's slope and intercept, and how tightly the cloud sits on it. `r` runs 0 to 1: 1 is every bubble on the line, 0 is a cloud with no direction. Fires when the numbers change, so putting the fit straight into state is safe. It does not fire when fewer than two bubbles with different x values remain, so clear a stored fit with the data. |
| `color` | `string` | — | A theme role or any CSS colour. Defaults to the muted foreground. |
| `strokeWidth` | `number` | `1.5` | Thickness of the line, in pixels. |
| `dashArray` | `string` | `'6 5'` | Dash pattern. Dashed by default: the line is a reading, not a measurement. |
| `opacity` | `number` | `0.7` | Opacity of the line. |

#### `BubbleChartBubblesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `opacity` | `number` | `0.9` | Fill opacity. Below 1 by default, so overlapping bubbles read as denser. |
| `color` | `string` | — | One colour for every bubble, a theme role or any CSS colour, over the per-row ramp. |

#### `BubbleChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `count` | `number` | `7` | How many placeholder circles to scatter. |
| `color` | `string` | — | A theme role or any CSS colour. Defaults to the muted surface. |

#### `BubbleChartLabelsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `minRadius` | `number` | `10` | Smallest radius a bubble may have and still be given its name. |
| `format` | `(point: BubbleChartPoint) => string` | — | Turn a bubble into its name. Defaults to the value at `labelKey`. |

#### `BubbleChartQuadrantsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `x` | `number` | — | Where the vertical rule stands. Defaults to the mean of the x values. |
| `y` | `number` | — | Where the horizontal rule lies. Defaults to the mean of the y values. |
| `labels` | `{ topLeft?: string; topRight?: string; bottomLeft?: string; bottomRight?: string }` | — | A word for each corner, written in the corner it belongs to. |
| `tint` | `boolean` | `true` | Tint the high-high and low-low corners. |
| `color` | `string` | — | Colour of the rules, a theme role or any CSS colour. Defaults to the muted foreground. |

#### `BubbleChartSizeKeyProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `placement` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` | Which corner of the plot it sits in. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `label` | `string` | — | A word for what the area means: "people", "revenue". |

#### `BubbleChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | Roughly how many labels to show. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `label` | `string` | — | The axis's own name: what is being measured. |

#### `BubbleChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | Roughly how many labels to show. |
| `format` | `(value: number) => string` | — | Turn a value into its label. Defaults to a compact number. |
| `label` | `string` | — | The axis's own name: what is being measured. |

#### `BubbleChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showLabel` | `boolean` | `true` | Float a small readout beside the bubble. Without it the bubble still swells and reports. |
| `formatX` | `(value: number) => string` | — | Format the x value for the readout. Defaults to a compact number. |
| `formatY` | `(value: number) => string` | — | Format the y value for the readout. Defaults to a compact number. |
| `formatSize` | `(value: number) => string` | — | Format the size value for the readout. Defaults to a compact number. |
| `labels` | `Record<string, string>` | — | Prettier names for the x, y and size keys. |
| `hitRadius` | `number` | `22` | How far from a bubble's centre the pointer still reads it, at the least, in pixels. |
| `className` | `string` | — | Added to the readout's surface. |

#### `BubbleChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `limit` | `number` | `8` | How many rows to list before stopping. |

#### `BubbleChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: what the area means, usually. |

## In a Server Component

`BubbleChart` is a client component. A Server Component cannot read `BubbleChart.Header` off the import, so import each part by name: `BubbleChartHeader`, `BubbleChartGrid`, `BubbleChartQuadrants`, `BubbleChartTrend`, `BubbleChartBubbles`, `BubbleChartLabels`, `BubbleChartSizeKey`, `BubbleChartSkeleton`, `BubbleChartXAxis`, `BubbleChartYAxis`, `BubbleChartTooltip`, `BubbleChartLegend`.

## Notes

#### Rows

A row with no finite number at `xDataKey` or `yDataKey` draws no bubble, and a numeric string does not count as a number. Convert strings before passing the data.

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone, so a header does not shrink it. The default of `1` suits a bubble field.

Every edge of the plot holds back the largest radius in `sizeRange`, so raising it costs room. On a narrow screen, lower `sizeRange` before lowering anything else.

#### Domains

Each axis is the data's extent widened to round numbers, and neither is floored at zero. `xDomain` and `yDomain` fix one instead, which also keeps the frame still when the data changes.

#### Reading

A mouse reads the nearest bubble as it moves. A tap reads one, and a sideways drag reads the bubbles it passes. A click or a tap pins the reading until the next press elsewhere or Escape. The arrow keys walk the bubbles once the chart has focus. `onActivePointChange` gives you the bubble being read, for a readout outside the chart.

#### Accessibility

The chart renders a list of its rows for screen readers, and `label` and `labelForDatum` set what it says. With reduced motion set, the bubbles appear at their final size without the entrance, and data changes jump to their new places. `animationDuration={0}` draws the bubbles at once for everybody.

## Example

```tsx
'use client';

import { useState } from 'react';
import { BubbleChart, type BubbleChartPoint } from '@/components/panelui/bubble-chart';
import { Frame } from '@/components/panelui/frame';

const PRODUCTS = [
  { name: 'Atlas', code: 'AT', growth: 42, margin: 31, revenue: 840 },
  { name: 'Beacon', code: 'BE', growth: 18, margin: 44, revenue: 1_260 },
  { name: 'Cinder', code: 'CI', growth: 7, margin: 12, revenue: 310 },
  { name: 'Drift', code: 'DR', growth: 33, margin: 22, revenue: 520 },
  { name: 'Ember', code: 'EM', growth: 12, margin: 28, revenue: 690 },
  { name: 'Fathom', code: 'FA', growth: 54, margin: 38, revenue: 980 },
  { name: 'Gale', code: 'GA', growth: 25, margin: 16, revenue: 180 },
  { name: 'Harbor', code: 'HA', growth: 38, margin: 47, revenue: 1_480 },
  { name: 'Isle', code: 'IS', growth: 4, margin: 35, revenue: 430 },
  { name: 'Juno', code: 'JU', growth: 47, margin: 18, revenue: 260 },
];

const percent = (value: number) => `${value}%`;
const thousands = (value: number) => `$${value.toLocaleString('en-US')}k`;

const total = PRODUCTS.reduce((sum, { revenue }) => sum + revenue, 0);

export default function BubbleChartOverview() {
  const [active, setActive] = useState<BubbleChartPoint | null>(null);
  return (
    <Frame className="w-full max-w-lg" variant="band">
      <Frame.Header>
        <Frame.Title>Product portfolio</Frame.Title>
        <Frame.Action>{PRODUCTS.length} products</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <BubbleChart
          data={PRODUCTS}
          xDataKey="growth"
          yDataKey="margin"
          sizeKey="revenue"
          labelKey="code"
          aspectRatio={1.2}
          label="Products by growth, margin and revenue"
          labelForDatum={(datum) => `${datum.name}: ${datum.growth}% growth, ${datum.margin}% margin, ${thousands(Number(datum.revenue))} revenue`}
          onActivePointChange={setActive}
        >
          <BubbleChart.Header
            title={active ? String(active.datum.name) : 'Revenue'}
            value={thousands(active?.size ?? total)}
            caption={active ? `${active.x}% growth, ${active.y}% margin` : 'Area shows revenue'}
          />
          <BubbleChart.Grid />
          <BubbleChart.Bubbles />
          <BubbleChart.Labels />
          <BubbleChart.XAxis format={percent} />
          <BubbleChart.YAxis format={percent} />
          <BubbleChart.Tooltip
            formatX={percent}
            formatY={percent}
            formatSize={thousands}
            labels={{ growth: 'Growth', margin: 'Margin', revenue: 'Revenue' }}
          />
        </BubbleChart>
      </Frame.Panel>
    </Frame>
  );
}
```
