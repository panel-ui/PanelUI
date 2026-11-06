# Candlestick Chart

Open, high, low and close for a period, drawn as one mark.

```tsx
import { CandlestickChart } from "@/components/panelui/candlestick-chart"
```

From npm the path is `panelui-web/candlestick-chart`. Install with `npx shadcn@latest add @panelui/candlestick-chart`.

## When to use it

Use it to show how a price moved within each period: a trading day, an hour, a month. Each row of `data` holds an open, a high, a low and a close.

The body spans open to close, and the wick behind it spans low to high. A period that closed at or above its open is drawn in the rising colour, and one that closed below it in the falling colour.

The price axis does not reach zero, so candles stay readable when the prices sit far from it. For a single value per period, use a line chart instead.

## Usage

```tsx
<CandlestickChart data={sessions} xDataKey="day">
  <CandlestickChart.Grid />
  <CandlestickChart.Candles />
  <CandlestickChart.YAxis />
  <CandlestickChart.XAxis />
  <CandlestickChart.Tooltip />
</CandlestickChart>
```

## Parts

```tsx
<CandlestickChart data={…}>
  <CandlestickChart.Header />
  <CandlestickChart.Grid />
  <CandlestickChart.Candles />
  <CandlestickChart.XAxis />
  <CandlestickChart.YAxis />
  <CandlestickChart.Legend />
  <CandlestickChart.Tooltip />
</CandlestickChart>
```

- `CandlestickChart.Header` — The strip above the plot: `title`, `value` and `caption`, with the two colours or your own control on the trailing side.
- `CandlestickChart.Grid` — Lines across the price axis, in the theme's border colour. `rows` is how many intervals to draw. With a `YAxis` in the chart, its `ticks` sets the count, so every label has a line.
- `CandlestickChart.Candles` — The marks. Without this part the chart draws no candles. `risingColor` and `fallingColor` name theme roles.
- `CandlestickChart.XAxis` — Period labels under the candles. It keeps every nth label, as many as the width allows. `ticks` asks for a count.
- `CandlestickChart.YAxis` — Price labels on the grid lines, with room made for them. `format` writes a price.
- `CandlestickChart.Legend` — The two colours and what they mean, over the top corner of the plot. On a chart with a header, use the header's `legend` prop instead.
- `CandlestickChart.Tooltip` — The readout, and what drives it: the four prices and the change from open to close. It covers the plot, so the pointer does not have to land on a candle.

## Props

`CandlestickChart`, `CandlestickChart.Header` and `CandlestickChart.Legend` also take the props of the element they render, and a `className`. `CandlestickChart.Tooltip` puts its `className` on the readout. The other parts draw nothing themselves and take only the props listed.

#### `CandlestickChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly CandlestickChartDatum[]` | **required** | The rows. Each one is a period along the x-axis. |
| `xDataKey` | `string` | `'date'` | Key holding the period label. Used by the axis and the readout. |
| `openDataKey` | `string` | `'open'` | Key holding the opening price. |
| `highDataKey` | `string` | `'high'` | Key holding the period's high. |
| `lowDataKey` | `string` | `'low'` | Key holding the period's low. |
| `closeDataKey` | `string` | `'close'` | Key holding the closing price. |
| `status` | `CandlestickChartStatus` | `'ready'` | `loading` leaves the plot empty: the grid and the header stay, and no candles are drawn. Turning `ready` grows them in from the left. Nothing stands in for the candles, because a placeholder candle would be four made-up prices. |
| `aspectRatio` | `number` | `1.6` | The plot's width ÷ height. `1.6` suits a chart this dense better than `2`. |
| `animationDuration` | `number` | `700` | Milliseconds for the candles to grow in. |
| `domainDuration` | `number` | `500` | Milliseconds for the candles and the axis to settle after the data changes. |
| `yDomain` | `[number, number]` | — | Fix the price axis instead of deriving it from the lows and highs. |
| `candleGap` | `number` | `0.3` | Fraction of each period's slice left empty, `0` to `1`. |
| `candleWidth` | `number` | — | Fixed body width in pixels, instead of deriving it from `candleGap`. One pixel always stays between bodies. |
| `fadedOpacity` | `number` | `0.3` | Opacity of the candles that are not being read. |
| `onActiveIndexChange` | `(index: number, datum: CandlestickChartDatum \| null) => void` | — | The period being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. |
| `compact` | `boolean` | `false` | Drop the axis padding, for a dense strip with no axis or readout. |
| `label` | `string` | — | What a screen reader calls the chart. |
| `labelForDatum` | `(datum: CandlestickChartDatum, index: number) => string` | — | What a screen reader says for one row. Defaults to its keys and values. |

#### `CandlestickChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | — | How many intervals to divide the price axis into. Yields `rows + 1` lines. A `YAxis` beside it sets the count instead. |
| `dashArray` | `string` | — | The stroke's dash pattern. |
| `opacity` | `number` | — | Opacity of the lines. |

#### `CandlestickChartCandlesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `risingColor` | `CandlestickChartColor` | `'success'` | The theme role of a period that closed at or above its open. |
| `fallingColor` | `CandlestickChartColor` | `'destructive'` | The theme role of a period that closed below its open. |
| `cornerRadius` | `number` | `1.5` | Corner radius on a body. |

#### `CandlestickChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels to show. Derived from the room available when omitted. |
| `format` | `(datum: CandlestickChartDatum, index: number) => string` | — | Format a row's label. Defaults to the value at `xDataKey`. |

#### `CandlestickChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many intervals to divide the price axis into. Yields `ticks + 1` labels. |
| `format` | `(value: number) => string` | — | Format a price for its label. Defaults to a compact number. |

#### `CandlestickChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number, field: TooltipField) => string` | — | Format one of the four prices. Defaults to a compact number. |
| `formatX` | `(datum: CandlestickChartDatum) => string` | — | Format the readout's heading from the row. Defaults to the value at xDataKey. |
| `showChange` | `boolean` | — | Show the period's change from open to close under the four prices. |
| `className` | `string` | — | Added to the readout's surface. |

#### `CandlestickChartLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `risingLabel` | `string` | `'Up'` | What the rising colour is called. |
| `fallingLabel` | `string` | `'Down'` | What the falling colour is called. |

#### `CandlestickChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Small line above the value: what the chart is of. |
| `value` | `ReactNode` | — | The readout. The largest thing on the card, and the first thing read. |
| `caption` | `ReactNode` | — | One muted line under the value: a period, a comparison, a change. |
| `legend` | `boolean` | `false` | Name the two colours along the trailing edge. |
| `risingLabel` | `string` | `'Up'` | What the rising colour is called. |
| `fallingLabel` | `string` | `'Down'` | What the falling colour is called. |

## In a Server Component

`CandlestickChart` is a client component. A Server Component cannot read `CandlestickChart.Header` off the import, so import each part by name: `CandlestickChartHeader`, `CandlestickChartGrid`, `CandlestickChartCandles`, `CandlestickChartXAxis`, `CandlestickChartYAxis`, `CandlestickChartTooltip`, `CandlestickChartLegend`.

## Notes

#### The price axis

The axis runs from the lowest low to the highest high, with a tenth of the span as margin at each end. It does not include zero, because a share moving between 178 and 183 would otherwise flatten into a band of dashes. `yDomain` fixes both ends.

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone, so a header does not shrink it. The plot draws in the browser after it has been measured, and the space is reserved until then, so it is not in server-rendered HTML.

#### Bundle size

The chart adds about 60 KB of gzipped JavaScript to a page that uses it. A page that does not import it pays nothing, including one that imports other components from the package root.

#### Missing and flat periods

A row missing any of its four prices draws nothing and keeps its place along the axis. A period that closed where it opened draws a thin flat body, in the rising colour.

#### Reading a period

With a `Tooltip`, hovering a period reads it. A click or a tap pins the reading until the next press elsewhere, or Escape. On a touch screen a sideways drag reads the periods it crosses, and a vertical drag scrolls the page.

`onActiveIndexChange` fires when the period changes, not on every frame, so it can drive a readout outside the chart, as the first example does. Inside the chart, `useCandlestickChart` gives the same period.

A readout that sets state re-renders the chart, so keep `data` the same array between renders: a new array redraws the chart and drops the reading. Build it with `useMemo`, or outside the component.

#### Keyboard

With a `Tooltip`, the plot takes focus. The arrow keys move between periods, Home and End go to the first and last, Enter or Space pins the reading, and Escape clears it.

#### Screen readers

Each row is given as text beside the drawing. `label` names the chart and `labelForDatum` writes a row, for values with a unit. Without them a row is read as its keys and values.

The readout's change carries a plus or minus sign, so direction is not told by colour alone.

#### Reduced motion

With reduced motion set, the candles and the axis appear at their final values.

## Example

```tsx
'use client';

import { useState } from 'react';
import { CandlestickChart, type CandlestickChartDatum } from '@/components/panelui/candlestick-chart';
import { Frame } from '@/components/panelui/frame';

const SESSIONS = [
  { day: '1 Sep', open: 182.4, high: 185.1, low: 181.2, close: 184.6 },
  { day: '2 Sep', open: 184.6, high: 186.0, low: 182.9, close: 183.1 },
  { day: '3 Sep', open: 183.1, high: 184.4, low: 180.7, close: 181.5 },
  { day: '4 Sep', open: 181.5, high: 183.9, low: 180.9, close: 183.4 },
  { day: '5 Sep', open: 183.4, high: 187.2, low: 183.0, close: 186.8 },
  { day: '8 Sep', open: 186.8, high: 188.3, low: 185.6, close: 187.9 },
  { day: '9 Sep', open: 187.9, high: 189.0, low: 186.1, close: 186.6 },
  { day: '10 Sep', open: 186.6, high: 187.4, low: 183.8, close: 184.2 },
  { day: '11 Sep', open: 184.2, high: 184.9, low: 181.3, close: 182.0 },
  { day: '12 Sep', open: 182.0, high: 183.2, low: 179.6, close: 180.4 },
  { day: '15 Sep', open: 180.4, high: 182.7, low: 179.9, close: 182.3 },
  { day: '16 Sep', open: 182.3, high: 185.5, low: 182.0, close: 185.0 },
  { day: '17 Sep', open: 185.0, high: 186.4, low: 184.1, close: 185.0 },
  { day: '18 Sep', open: 185.0, high: 188.8, low: 184.7, close: 188.2 },
  { day: '19 Sep', open: 188.2, high: 191.3, low: 187.6, close: 190.7 },
  { day: '22 Sep', open: 190.7, high: 192.1, low: 189.2, close: 189.8 },
  { day: '23 Sep', open: 189.8, high: 190.6, low: 186.9, close: 187.4 },
  { day: '24 Sep', open: 187.4, high: 189.5, low: 186.8, close: 189.1 },
  { day: '25 Sep', open: 189.1, high: 193.0, low: 188.7, close: 192.4 },
  { day: '26 Sep', open: 192.4, high: 194.6, low: 191.5, close: 193.9 },
  { day: '29 Sep', open: 193.9, high: 195.2, low: 191.8, close: 192.3 },
  { day: '30 Sep', open: 192.3, high: 193.1, low: 189.4, close: 190.0 },
  { day: '1 Oct', open: 190.0, high: 191.7, low: 188.2, close: 191.2 },
  { day: '2 Oct', open: 191.2, high: 194.3, low: 190.8, close: 193.8 },
  { day: '3 Oct', open: 193.8, high: 197.0, low: 193.2, close: 196.4 },
  { day: '6 Oct', open: 196.4, high: 198.1, low: 195.0, close: 195.6 },
  { day: '7 Oct', open: 195.6, high: 196.2, low: 192.7, close: 193.3 },
  { day: '8 Oct', open: 193.3, high: 195.8, low: 192.9, close: 195.2 },
  { day: '9 Oct', open: 195.2, high: 198.9, low: 194.8, close: 198.3 },
  { day: '10 Oct', open: 198.3, high: 200.4, low: 197.1, close: 199.6 },
];

const last = SESSIONS[SESSIONS.length - 1];
const price = (value: number) => `$${value.toFixed(2)}`;

export default function CandlestickChartOverview() {
  const [active, setActive] = useState<CandlestickChartDatum | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>NWM</Frame.Title>
        <Frame.Action>Daily</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <CandlestickChart
          data={SESSIONS}
          xDataKey="day"
          aspectRatio={1.5}
          label="NWM daily prices, 1 September to 10 October"
          onActiveIndexChange={(_index, datum) => setActive(datum)}
        >
          <CandlestickChart.Header
            title={active ? String(active.day) : 'Last close'}
            value={price(active ? Number(active.close) : last.close)}
            legend
          />
          <CandlestickChart.Grid />
          <CandlestickChart.Candles />
          <CandlestickChart.YAxis format={(value) => value.toFixed(0)} />
          <CandlestickChart.XAxis />
          <CandlestickChart.Tooltip formatValue={price} />
        </CandlestickChart>
      </Frame.Panel>
    </Frame>
  );
}
```
