# KPI

One number and what it is doing: its change, its shape over time, its progress to a target.

```tsx
import { Kpi } from "@/components/panelui/kpi"
```

From npm the path is `panelui-web/kpi`. Install with `npx shadcn@latest add @panelui/kpi`.

## When to use it

Use it for a number someone checks, with whatever says how it is doing: the change since last time, the shape of it over a period, how far it is towards a target. It has the same parts as the app library's KPI, so a metric reads the same on both.

The number comes first. The trend, the chart and the bar are all small on purpose, and none of them can be read to a value.

For a chart someone needs to read values from, use a chart with an axis. For one bare figure with a label, a `Kpi.Title` and a `Kpi.Value` are enough.

## Usage

```tsx
<Kpi>
  <Kpi.Title>Subscribers</Kpi.Title>
  <Kpi.Value>18,240</Kpi.Value>
  <Kpi.Trend value={6.4} caption="this month" />
</Kpi>
```

## Parts

```tsx
<Kpi>
  <Kpi.Header>
    <Kpi.Icon />
    <Kpi.Title />
    <Kpi.Actions />
  </Kpi.Header>
  <Kpi.Content>
    <Kpi.Stat>
      <Kpi.Value />
      <Kpi.Trend />
    </Kpi.Stat>
    <Kpi.Chart />
  </Kpi.Content>
  <Kpi.Progress />
  <Kpi.Footer />
</Kpi>
```

- `Kpi.Header` — The row over the number. A title in it takes the room between the icon and the actions.
- `Kpi.Icon` — A small tile for an icon. `tone` colours it as good or bad news.
- `Kpi.Title` — What the number measures.
- `Kpi.Actions` — Whatever belongs at the end of the header: a period, a trend badge, a button.
- `Kpi.Content` — The row the number is in. `layout="inline"` is for a chart beside it.
- `Kpi.Stat` — Title, value and trend stacked as one block, for a row with a chart at its other end.
- `Kpi.Value` — The number.
- `Kpi.Trend` — The change, given as a number. It writes the sign and picks the colour.
- `Kpi.Chart` — A sparkline of a list of numbers. `inline` gives it a fixed box, `filled` a wash under the line.
- `Kpi.Progress` — A bar towards a target, with a label and the percentage over it.
- `Kpi.Footer` — A quiet line under everything.
- `Kpi.Separator` — A rule between two parts of one card.
- `Kpi.Group` — Several metrics as one panel, side by side or stacked, with a rule between each and the next. `surface` draws it as a card of its own.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `KpiProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `surface` | `boolean` | `false` | Draws the metric as a card of its own. Leave it off inside a frame or a group. |

#### `KpiHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ className: kpiVariants().header({ className }) }, props),` | **required** | — |

#### `KpiIconProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `tone` | `KpiTone` | `neutral` | How the tile is coloured: by good or bad news, or left neutral. |

#### `KpiTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-kpi-title': '', className: kpiVariants().title({ className }) }, props),` | **required** | — |

#### `KpiActionsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ className: kpiVariants().actions({ className }) }, props),` | **required** | — |

#### `KpiContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `layout` | `'below' \| 'inline'` | `below` | `inline` puts a chart beside the number in a fixed box; `below` leaves it under everything. |

#### `KpiStatProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ className: kpiVariants().stat({ className }) }, props),` | **required** | — |

#### `KpiValueProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ className: kpiVariants().value({ className }) }, props),` | **required** | — |

#### `KpiTrendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | **required** | The change. Its sign decides the direction. |
| `format` | `(value: number) => string` | — | Writes the change. Defaults to a signed percentage with one decimal: "+7.8%". |
| `goodDirection` | `KpiGoodDirection` | `'up'` | Which direction is the good news. `down` for churn, latency, cost; `none` for no colour. |
| `variant` | `'text' \| 'badge'` | `'text'` | `text` is a line of colour; `badge` puts a pill and an arrow round it. |
| `caption` | `string` | — | Quiet words after the change: "this month". |
| `threshold` | `number` | `0` | A change this small or smaller is drawn as no change. |

#### `KpiChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `number[]` | **required** | The values, oldest first. |
| `color` | `KpiColor` | `'primary'` | Which of the theme's roles the line is drawn in. |
| `filled` | `boolean` | `false` | Fills under the line with a wash of the same colour. |
| `height` | `number` | — | How tall the chart is, in pixels. |
| `inline` | `boolean` | `false` | A fixed box for the end of a `layout="inline"` row. Charts beside numbers of different lengths are then all one width, and line up down a column. |
| `strokeWidth` | `number` | `2` | How thick the line is, in pixels. |

#### `KpiProgressProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | **required** | How far along. |
| `maxValue` | `number` | `100` | What `value` is out of. |
| `label` | `ReactNode` | — | Words at the start of the row over the bar: "of 5,000". |
| `showValueLabel` | `boolean` | `false` | Writes the percentage at the end of the row over the bar. |
| `color` | `KpiColor` | `'primary'` | Which of the theme's roles the bar is drawn in. |

#### `KpiFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ className: kpiVariants().footer({ className }) }, props),` | **required** | — |

#### `KpiSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ role: 'separator', className: kpiVariants().separator({ className }) }, props),` | **required** | — |

#### `KpiGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Side by side with upright rules, or stacked with level ones. |
| `surface` | `boolean` | `false` | Draws the group as a card of its own, for a group not already inside one. |

## In a Server Component

`Kpi` is a client component. A Server Component cannot read `Kpi.Header` off the import, so import each part by name: `KpiHeader`, `KpiIcon`, `KpiTitle`, `KpiActions`, `KpiContent`, `KpiStat`, `KpiValue`, `KpiTrend`, `KpiChart`, `KpiProgress`, `KpiFooter`, `KpiSeparator`, `KpiGroup`.

## Notes

#### Trend colours

`Kpi.Trend` is drawn in the success colour when the number moved the good way, in the destructive colour when it moved the bad way, and in the muted colour when it did not move. Up is good unless you say otherwise: pass `goodDirection="down"` for a metric where less is better, or `"none"` for one where neither is.

`threshold` is the size of change that still counts as none. With `threshold={0.5}`, a change of 0.3 is drawn flat.

#### Writing the change

The change is written as a signed percentage with one decimal. `format` is given the value and returns the text, for a change in another unit. `caption` adds quiet words after it and is read out with it.

#### The chart

`data` is a list of numbers, oldest first. The line is scaled between the lowest and highest of them, so it shows the shape of the change and says nothing about its size. That is why it has no axis.

`inline` fixes the chart at 128 by 56 pixels. In a column of cards with titles of different lengths, the charts are then all one width and line up down the right-hand edge.

#### Colour

`color` on `Kpi.Chart` and `Kpi.Progress` names one of the theme's roles and defaults to `primary`.

#### In a group

`Kpi.Group` pads its children on the sides that face a rule. Put `Kpi` elements straight inside it. In a horizontal group the metrics share the width equally, so keep titles to a word or two, or stack them with `orientation="vertical"`.

#### Server Components

KPI holds no state, so it is not a client module. It can be rendered from a Server Component as written, and it adds no JavaScript to the page.

## Example

```tsx
import { Kpi } from '@/components/panelui/kpi';
import { Frame } from '@/components/panelui/frame';

/** Each figure over the last thirty days, oldest first. */
const SUBSCRIBERS = [152, 154, 153, 157, 161, 160, 164, 169, 168, 172, 176, 175, 179, 182];
const UNSUBSCRIBES = [14, 13, 13, 12, 12, 11, 12, 10, 10, 9, 9, 8, 8, 7];
const OPENS = [41, 42, 44, 43, 45, 44, 46, 45, 47, 46, 46, 48, 47, 47];

export default function KpiOverview() {
  return (
    <Frame variant="band" className="w-full max-w-md">
      <Frame.Header>
        <Frame.Title>Newsletter</Frame.Title>
        <Frame.Action>Last 30 days</Frame.Action>
      </Frame.Header>

      <Frame.Panel className="p-5">
        <Kpi.Group orientation="vertical">
          <Kpi>
            <Kpi.Content layout="inline">
              <Kpi.Stat>
                <Kpi.Title>Subscribers</Kpi.Title>
                <Kpi.Value>18,240</Kpi.Value>
                <Kpi.Trend value={6.4} caption="this month" />
              </Kpi.Stat>
              <Kpi.Chart data={SUBSCRIBERS} inline />
            </Kpi.Content>
          </Kpi>
          <Kpi>
            <Kpi.Content layout="inline">
              <Kpi.Stat>
                <Kpi.Title>Unsubscribe rate</Kpi.Title>
                <Kpi.Value>0.8%</Kpi.Value>
                <Kpi.Trend value={-12.5} goodDirection="down" caption="on last month" />
              </Kpi.Stat>
              <Kpi.Chart data={UNSUBSCRIBES} color="success" inline />
            </Kpi.Content>
          </Kpi>
          <Kpi>
            <Kpi.Content layout="inline">
              <Kpi.Stat>
                <Kpi.Title>Open rate</Kpi.Title>
                <Kpi.Value>47.3%</Kpi.Value>
                <Kpi.Trend value={1.9} caption="last 7 issues" />
              </Kpi.Stat>
              <Kpi.Chart data={OPENS} color="info" inline />
            </Kpi.Content>
          </Kpi>
        </Kpi.Group>
      </Frame.Panel>
    </Frame>
  );
}
```
