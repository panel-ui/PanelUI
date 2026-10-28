# Choice Cards

One option chosen from a few, each shown as a picture of what it does.

```tsx
import { ChoiceCards } from "@/components/panelui/choice-cards"
```

From npm the path is `panelui-web/choice-cards`. Install with `npx shadcn@latest add @panelui/choice-cards`.

## When to use it

Use it to choose one of a few options that are easier to see than to name: a pointer style, a canvas size, a background, an export quality. Each card leads with a picture of the option and its name sits under it.

It suits two to six options. Past that the pictures get too small to compare; use a [Select](/docs/web/components/select) with icons instead. For options that are only words, use [Tabs](/docs/web/components/tabs) or a radio group.

Give the group an `aria-label`, or point `aria-labelledby` at its heading, so a screen reader says what is being chosen.

## Usage

```tsx
<ChoiceCards defaultValue="square" aria-label="Canvas size">
  <ChoiceCards.Item value="square">
    <ChoiceCards.Media>
      <SquareIcon />
    </ChoiceCards.Media>
    <ChoiceCards.Label>Square</ChoiceCards.Label>
    <ChoiceCards.Description>1080 × 1080</ChoiceCards.Description>
  </ChoiceCards.Item>
</ChoiceCards>
```

## Parts

```tsx
<ChoiceCards>
  <ChoiceCards.Item>
    <ChoiceCards.Media />
    <ChoiceCards.Label />
    <ChoiceCards.Description />
  </ChoiceCards.Item>
</ChoiceCards>
```

- `ChoiceCards.Item` — One option. Its `value` is what the group is set to when it is chosen. The chosen card is ringed in the group's colour and a check appears in its corner.
- `ChoiceCards.Media` — The picture of the option: a drawing, an icon or an image, centred in a rounded frame at the group's `aspect`. An image fills it edge to edge. On the chosen card it grows slightly.
- `ChoiceCards.Label` — The option's name, under the picture. It is also what a screen reader calls the card.
- `ChoiceCards.Description` — A line under the name: what the option costs or what it is for. A screen reader reads it after the name.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ChoiceCardsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `columns` | `number` | — | How many cards stand in a row. Default: one per item, up to four. |
| `aspect` | `string` | `'4 / 3'` | The shape of every card's picture, as a CSS aspect ratio. Default `4 / 3`. |
| `color` | `ChoiceCardsColor` | `primary` | The colour of the ring and the check on the chosen card. Default `primary`. |
| `className` | `string` | — | — |
| `style` | `CSSProperties` | — | — |

#### `ChoiceCardsItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | **required** | What choosing this card sets the group's value to. |
| `className` | `string` | — | — |

## In a Server Component

`ChoiceCards` is a client component. A Server Component cannot read `ChoiceCards.Item` off the import, so import each part by name: `ChoiceCardsItem`, `ChoiceCardsMedia`, `ChoiceCardsLabel`, `ChoiceCardsDescription`.

## Notes

#### Keyboard

The group is one stop in the tab order. The arrow keys move the choice from card to card, and Space chooses the focused one.

#### Columns

Without `columns`, the cards share one row, up to four of them. Set `columns` for a grid, and use a narrower count on a small screen by passing it from your own breakpoint.

#### Forms

Give it a `name` and it submits the chosen `value` with the form it is in. `required` stops the form being sent before a card is chosen.

With reduced motion turned on, the check and the picture change without moving.

## Example

```tsx
'use client';

import { ChoiceCards } from '@/components/panelui/choice-cards';

/** Four pointer styles, drawn at the size a recording would show them. */
const POINTERS = [
  {
    value: 'arrow',
    label: 'Arrow',
    drawing: <path d="M14 10v26l7-6.5 4.5 10 4.5-2-4.5-9.5H35Z" />,
  },
  { value: 'dot', label: 'Dot', drawing: <circle cx="24" cy="24" r="7" /> },
  {
    value: 'halo',
    label: 'Halo',
    drawing: (
      <>
        <circle cx="24" cy="24" r="15" fillOpacity={0.22} stroke="none" />
        <circle cx="24" cy="24" r="6" />
      </>
    ),
  },
  {
    value: 'ring',
    label: 'Ring',
    drawing: (
      <>
        <circle cx="24" cy="24" r="11" fill="none" strokeWidth={3} className="stroke-current" />
        <circle cx="24" cy="24" r="2.5" />
      </>
    ),
  },
];

export default function ChoiceCardsOverview() {
  return (
    <ChoiceCards defaultValue="halo" aria-label="Pointer" className="max-w-md">
      {POINTERS.map(({ value, label, drawing }) => (
        <ChoiceCards.Item key={value} value={value}>
          <ChoiceCards.Media>
            <svg viewBox="0 0 48 48" className="size-12 fill-current stroke-background" strokeWidth={2}>
              {drawing}
            </svg>
          </ChoiceCards.Media>
          <ChoiceCards.Label>{label}</ChoiceCards.Label>
        </ChoiceCards.Item>
      ))}
    </ChoiceCards>
  );
}
```
