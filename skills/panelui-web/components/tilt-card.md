# Tilt Card

A card that leans towards the pointer, with layers inside it that move by their depth.

```tsx
import { TiltCard } from "@/components/panelui/tilt-card"
```

From npm the path is `panelui-web/tilt-card`. Install with `npx shadcn@latest add @panelui/tilt-card`.

## When to use it

Use it where a card is there to be looked at more than read: a feature on a landing page, a plan, something collectable. The card leans a few degrees towards the pointer and a soft light sits under it. Layers inside the card are lifted off it and move against it as it leans, which gives a flat drawing a front and a back.

The lean is decoration. It does nothing on a touch screen and holds still under reduced motion, so anything the card has to say goes in its contents.

For cards in a dense grid that someone works through, such as a list of records, use a plain card. A screen where everything leans is tiring to use.

## Usage

```tsx
<TiltCard color="info" cardClassName="p-5">
  <TiltCard.Layer depth={24}>{figure}</TiltCard.Layer>
  <TiltCard.Layer depth={8}>
    <TiltCard.Title>Sync</TiltCard.Title>
    <TiltCard.Description>Changes reach your other devices in seconds.</TiltCard.Description>
  </TiltCard.Layer>
</TiltCard>
```

## Parts

```tsx
<TiltCard>
  <TiltCard.Layer depth={…}>…</TiltCard.Layer>
  <TiltCard.Layer depth={…}>
    <TiltCard.Title />
    <TiltCard.Description />
  </TiltCard.Layer>
</TiltCard>
```

- `TiltCard.Layer` — Something lifted off the card by `depth`, in pixels. The further out, the further it moves as the card leans.
- `TiltCard.Title` — What the card is about. A heading, `h3` unless `as` says otherwise.
- `TiltCard.Description` — A line or two of body text under the title.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `TiltCardProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `tilt` | `number` | `8` | The furthest the card leans, in degrees. |
| `color` | `TiltCardColor` | `'primary'` | Which of the theme's roles the light under the pointer is drawn in. |
| `glare` | `boolean` | `true` | Set to `false` for a card with no light under the pointer. |
| `cardClassName` | `string` | — | Extra classes for the card itself. `className` goes on the box round it. |

#### `TiltCardLayerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `depth` | `number` | — | How far off the card it is lifted, in pixels. Further out moves further as the card leans. |

#### `TiltCardTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `as` | `'h2' \| 'h3' \| 'h4' \| 'p'` | — | The heading level, to fit the page around the card. Default `h3`. |

#### `TiltCardDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

## In a Server Component

`TiltCard` is a client component. A Server Component cannot read `TiltCard.Layer` off the import, so import each part by name: `TiltCardLayer`, `TiltCardTitle`, `TiltCardDescription`.

## Notes

#### Two boxes

The component is a box that sets the viewpoint, with the card inside it. `className` goes on the outer box, which is where a width belongs. `cardClassName` goes on the card, which is where padding and layout belong.

#### Depth

A layer's `depth` is how many pixels it stands off the card. At the edge of the card a layer moves by about that many pixels, so depths between 6 and 36 read well, and anything over 50 starts to come apart from the card. Text reads best at 12 or under.

Layers can be positioned however you like, absolutely included. A layer's own transform is used for the movement, so put any transform of your own on an element inside it.

#### Colour

`color` names one of the theme's roles and tints the light under the pointer. It defaults to `primary`.

#### What it is clipped by

The card clips its contents to its rounded corners, so a layer that moves past the edge is cut off there. Leave a layer room to move.

#### Touch and reduced motion

The card does not lean under a finger, and does not lean at all for anyone who has asked their system for reduced motion. It is then a card.

## Example

```tsx
'use client';

import type { ReactNode } from 'react';
import { TiltCard, type TiltCardColor } from '@/components/panelui/tilt-card';

/** Three sheets, one over the other, each lifted further off the card. */
function Sheets() {
  return (
    <div className="relative h-24 w-28">
      <TiltCard.Layer depth={6} className="absolute inset-x-4 top-8 h-14 rounded-xl border bg-muted" />
      <TiltCard.Layer depth={18} className="absolute inset-x-2 top-4 h-14 rounded-xl border bg-card shadow-sm" />
      <TiltCard.Layer
        depth={32}
        className="absolute inset-x-0 top-0 flex h-14 items-center gap-2 rounded-xl border bg-card px-3 shadow-md"
      >
        <span className="size-2 rounded-full bg-(--success)" />
        <span className="h-1.5 w-12 rounded-full bg-muted-foreground/40" />
      </TiltCard.Layer>
    </div>
  );
}

/** Two rings and a body on the outer one. */
function Orbit() {
  return (
    <div className="relative size-24">
      <TiltCard.Layer depth={6} className="absolute inset-0 rounded-full border border-dashed border-muted-foreground/40" />
      <TiltCard.Layer depth={16} className="absolute inset-5 rounded-full border border-muted-foreground/50" />
      <TiltCard.Layer depth={28} className="absolute inset-9 rounded-full bg-foreground" />
      <TiltCard.Layer depth={36} className="absolute -top-1 left-1/2 size-3 -translate-x-1/2 rounded-full bg-(--info)" />
    </div>
  );
}

/** A field of marks, with one of them picked out and nearer. */
function Field() {
  return (
    <div className="relative grid size-24 grid-cols-4 gap-2.5">
      {Array.from({ length: 16 }, (_, index) =>
        index === 6 ? (
          <TiltCard.Layer key={index} depth={34} className="rounded-md bg-(--warning) shadow-md" />
        ) : (
          <TiltCard.Layer key={index} depth={index % 3 === 0 ? 14 : 6} className="rounded-md bg-muted-foreground/25" />
        )
      )}
    </div>
  );
}

const CARDS: { title: string; body: string; color: TiltCardColor; figure: ReactNode }[] = [
  { title: 'Versions', body: 'Every save is kept, and any of them can be brought back.', color: 'success', figure: <Sheets /> },
  { title: 'Sync', body: 'Changes reach your other devices within a few seconds.', color: 'info', figure: <Orbit /> },
  { title: 'Search', body: 'One box finds a word in any note, however old.', color: 'warning', figure: <Field /> },
];

export default function TiltCardFigures() {
  return (
    <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
      {CARDS.map((card) => (
        <TiltCard key={card.title} color={card.color} cardClassName="flex h-full flex-col gap-6 p-5">
          <div className="flex h-32 items-center justify-center">{card.figure}</div>
          <TiltCard.Layer depth={10} className="flex flex-col gap-1">
            <TiltCard.Title>{card.title}</TiltCard.Title>
            <TiltCard.Description>{card.body}</TiltCard.Description>
          </TiltCard.Layer>
        </TiltCard>
      ))}
    </div>
  );
}
```
