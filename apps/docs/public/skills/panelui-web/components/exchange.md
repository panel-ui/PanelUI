# Exchange

An amount in one currency and what it comes to in another, in two cards that swap places with one press.

```tsx
import { Exchange } from "@/components/panelui/exchange"
```

From npm the path is `panelui-web/exchange`. Install with `npx shadcn@latest add @panelui/exchange`.

## When to use it

Use it where someone converts an amount between two currencies: sending money abroad, ordering travel money, or showing what a price comes to at home. Each side is a card with its label, the amount, the currency and the rate. The round button between them swaps the two cards, figures and all.

It fetches no rates. Pass `rates`, how many units of each currency one unit of a common base is worth, or `convert` for a rule of your own, such as a fee. The amount on the other side is rounded to that currency's minor unit.

Either card can be typed in. The one typed in holds its figure and the other follows, which is how someone asks for an exact amount to arrive.

## Usage

```tsx
<Exchange currencies={currencies} rates={rates} defaultValue={{ from: 'USD', to: 'EUR', amount: 100 }}>
  <Exchange.Field side="from" label="You pay" />
  <Exchange.Swap />
  <Exchange.Field side="to" label="You receive" />
</Exchange>
```

## Parts

```tsx
<Exchange>
  <Exchange.Field side="from" />
  <Exchange.Swap />
  <Exchange.Field side="to" />
</Exchange>
```

- `Exchange.Field` — One card: its `label`, the amount in large figures, the currency's pill and a quieter line under them. The line is the rate to the other currency unless `detail` says otherwise, and `detail={null}` removes it. Pressing the pill opens the currency list over both cards.
- `Exchange.Swap` — The round button on the seam. It swaps the two cards' places, so the figure each one showed moves with it, and its arrow turns half a turn each time.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ExchangeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `currencies` | `readonly ExchangeCurrency[]` | **required** | Every currency that can be chosen, in the order the list shows them. |
| `rates` | `Readonly<Record<string, number>>` | — | How many units of each currency one unit of a common base is worth, keyed by code: `{ USD: 1, EUR: 0.92, JPY: 151.4 }`. Any base works, since only the ratio between two entries is used. |
| `convert` | `(amount: number, from: string, to: string) => number` | — | Works out an amount in another currency, in place of `rates`: for a fee, a spread, or a rate you fetch per pair. Return `NaN` when there is no rate. |
| `value` | `ExchangeValue` | — | The currencies and the amount, when you hold them. |
| `defaultValue` | `ExchangeValue` | — | The currencies and the amount to start with, when the control holds them. |
| `onValueChange` | `(value: Required<ExchangeValue>) => void` | — | Called with every change: a figure typed, a currency chosen, a swap. |
| `locale` | `string` | `'en-US'` | The locale figures are written in. Default `en-US`. |
| `disabled` | `boolean` | `false` | Shows the figures but takes no input. |

#### `ExchangeFieldProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `side` | `ExchangeSide` | **required** | Which card this is. |
| `label` | `ReactNode` | **required** | What the card is, above its amount: "You pay", "They receive". |
| `placeholder` | `string` | — | Shown in an empty field. Default `0`. |
| `detail` | `ReactNode` | — | The quieter line under the amount. Defaults to the rate from this card's currency to the other one; pass `null` for none. |

## In a Server Component

`Exchange` is a client component. A Server Component cannot read `Exchange.Field` off the import, so import each part by name: `ExchangeField`, `ExchangeSwap`.

## Notes

#### Typing an amount

The field takes digits and one point, and no more decimals than the currency has. Grouping commas are added once the field is left and ignored while typing. Clearing the field leaves both sides empty.

#### Choosing a currency

The list takes over the whole control while it is open, and the cards are out of the tab order behind it. Choosing the currency already on the other side swaps the two. Escape or the close button shuts the list and puts focus back on the pill.

#### Rates

`rates` can use any base, because only the ratio between two entries is used. A pair with no rate shows no amount and no rate line. A rate is written to four significant figures, so a small one such as yen to dollars is not rounded to zero.

#### Figures

Figures are written in `locale`, `en-US` by default, so the digits are Western whatever the device's language. Pass another locale to change how a finished figure is grouped. While typing, the decimal mark is always a point.

#### Reduced motion

With reduced motion set, the cards change places without travelling, and the list opens without scaling.

## Example

```tsx
'use client';

import { Exchange, type ExchangeCurrency } from '@/components/panelui/exchange';

const CURRENCIES: ExchangeCurrency[] = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'GBP', name: 'Pound sterling', symbol: '£', color: 'chart-4' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', decimals: 0, color: 'chart-5' },
  { code: 'SAR', name: 'Saudi riyal', symbol: 'ر', color: 'chart-3' },
];

/** Units of each currency to one US dollar. Sample figures, not live rates. */
const RATES = { USD: 1, EUR: 0.866, GBP: 0.762, JPY: 153.2, SAR: 3.75 };

export default function ExchangeOverview() {
  return (
    <Exchange currencies={CURRENCIES} rates={RATES} defaultValue={{ from: 'USD', to: 'EUR', amount: 250 }}>
      <Exchange.Field side="from" label="You pay" />
      <Exchange.Swap />
      <Exchange.Field side="to" label="You receive" />
    </Exchange>
  );
}
```
