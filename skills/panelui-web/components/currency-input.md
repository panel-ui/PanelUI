# CurrencyInput

An amount in the currency it is counted in, in one card: the figure, the currency's pill and a list to choose from.

```tsx
import { CurrencyInput } from "@/components/panelui/currency-input"
```

From npm the path is `panelui-web/currency-input`. Install with `npx shadcn@latest add @panelui/currency-input`.

## When to use it

Use it where a form asks for one amount and one currency: a budget, a price, an expense on a trip. The card carries its label, the amount in large figures, the currency's pill and a quieter line under them. Pressing the pill opens the currency list over the card.

It knows nothing about rates. The figure means what the chosen currency says it means, so changing the currency keeps the figure and rounds it to the new currency's minor unit. For two currencies at once — what one amount comes to in the other — use the [Exchange](/docs/web/components/exchange).

Figures are written in `locale`, `en-US` by default. While a figure is being typed it is shown as typed; grouped once the field is left.

## Usage

```tsx
<CurrencyInput currencies={currencies} label="Amount" defaultValue={{ code: 'USD', amount: 250 }} />
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `CurrencyInputProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `currencies` | `readonly CurrencyOption[]` | **required** | Every currency that can be chosen, in the order the list shows them. |
| `label` | `ReactNode` | — | What the card is, above its amount: "Budget", "You pay". |
| `value` | `CurrencyValue` | — | The currency and the amount, when you hold them. |
| `defaultValue` | `CurrencyValue` | — | The currency and the amount to start with, when the control holds them. |
| `onValueChange` | `(value: Required<CurrencyValue>) => void` | — | Called with every change: a figure typed or cleared, a currency chosen. |
| `placeholder` | `string` | `'0'` | Shown in an empty field. Default `0`. |
| `detail` | `ReactNode` | — | The quieter line under the amount: a balance, what the amount covers. |
| `locale` | `string` | `'en-US'` | The locale figures are written in. Default `en-US`. |
| `disabled` | `boolean` | `false` | Shows the figures but takes no input. |

## Notes

#### Typing an amount

The field takes digits and one point, and no more decimals than the currency has. Grouping commas are added once the field is left and ignored while typing. Clearing the field reports `amount: null`.

#### Choosing a currency

The list takes over the card while it is open, and the card is out of the tab order behind it. Its header is the card's own label, so an open list is never unclear about which field it is choosing for. Choosing a currency keeps the amount and rounds it to that currency's minor unit — `10.555` becomes `11` in yen. Escape or the close button shuts the list and puts focus back on the pill.

#### A short viewport

The list opens towards whichever side of the container it sits in has room: over the card where it is deep enough, upwards from it where a phone's keyboard has taken the space below. The container is the nearest ancestor that clips — a card, a dialog, a scroll — or the viewport where nothing does, so the rows stop at the edge that would actually cut them off rather than running past it. The list measures again while it is open, so turning the phone or closing the keyboard refits it.

#### Figures

Figures are written in `locale`, `en-US` by default, so the digits are Western whatever the device's language. Pass another locale to change how a finished figure is grouped. While typing, the decimal mark is always a point.

#### Reduced motion

With reduced motion set, the list opens without scaling.

## Example

```tsx
'use client';

import { CurrencyInput, type CurrencyOption } from '@/components/panelui/currency-input';

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'GBP', name: 'Pound sterling', symbol: '£', color: 'chart-4' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', decimals: 0, color: 'chart-5' },
];

export default function CurrencyInputOverview() {
  return <CurrencyInput currencies={CURRENCIES} label="Amount" defaultValue={{ code: 'USD', amount: 250 }} />;
}
```
