# StackCard

A pile of cards, taken one at a time by throwing the top one off.

```tsx
import { StackCard } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { StackCard } from '@/components/ui/stack-card';
```

### Anatomy

```tsx
<StackCard>
  <StackCard.Stamp direction="right" />
  <StackCard.Stamp direction="left" />

  <StackCard.Card />
  <StackCard.Card />

  <StackCard.Empty />

  <StackCard.Actions>
    <StackCard.Action action="left" />
    <StackCard.Action action="undo" />
    <StackCard.Action action="right" />
  </StackCard.Actions>
</StackCard>
```

### Variants

- **color** — `default` *(default)*, `primary`, `success`, `warning`, `info`, `destructive`
- **direction** — `left`, `right` *(default)*, `up`, `down`

### Parts

- `StackCard.Card`
- `StackCard.Stamp`
- `StackCard.Empty`
- `StackCard.Actions`
- `StackCard.Action`

### Props

#### `StackCardProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | A `StackCard.Card` for each card, plus any of `StackCard.Stamp`, `StackCard.Empty` and `StackCard.Actions`, in any order. Anything else is laid out under the pile. |
| `index` | `number` | — | Which card is on top, when the caller holds it. Leave unset to let the deck keep its own. A controlled deck that declines a request stays where it is, so this is also how a decision is confirmed before it is taken. |
| `defaultIndex` | `number` | `0` | Which card an uncontrolled deck starts on. |
| `onIndexChange` | `(index: number) => void` | — | Fires whenever the deck asks to move, with the index it is asking for. |
| `onSwipe` | `(direction: StackCardDirection, index: number) => void` | — | Fires when a card leaves, with the way it went and the index it was at. Not called by `undo` — the index going back is what reports that. |
| `onEmpty` | `() => void` | — | Fires once when the last card leaves. |
| `directions` | `readonly StackCardDirection[]` | — | Which ways a card may be thrown. Left and right by default. A direction left out still follows the finger a little and then comes back, rather than refusing to move at all — a card that does not budge reads as a frozen screen. |
| `layout` | `StackCardLayout` | `stack` | How the cards behind the top one are arranged. `stack` steps them down and back; `fan` turns them alternately, like a hand of cards; `flat` hides them entirely, for full-bleed cards where a peeking edge is only clutter. |
| `depth` | `number` | `2` | How many cards are drawn behind the top one. Two is a pile; five is a mess. |
| `threshold` | `number` | `0.3` | How far a card has to be taken for a release to send it away, as a fraction of the card. Momentum counts toward it, so a flick clears it without travelling. |
| `disabled` | `boolean` | `false` | Stop the deck taking a gesture, without changing how it looks. |
| `haptics` | `boolean` | `true` | A tick when a drag first reaches the point of no return, and a knock as the card goes. |
| `directionLabels` | `Partial<Record<StackCardDirection, string>>` | — | What a screen reader is offered for each direction, in place of "Swipe left". Name the decision — `{ left: 'Skip', right: 'Save' }`. |
| `className` | `string` | — | Classes for the whole control. Give it a height; the pile fills what is left. |
| `pileClassName` | `string` | — | Classes for the box the cards are laid out in. |

#### `StackCardCardProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `StackCardStampProps`

Extends `Omit<ViewProps, 'children'>, VariantProps<typeof stampVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | The word, or anything else to draw on the stamp. |
| `direction` | `StackCardDirection` | `right` | Which direction the stamp answers for. Also where on the card it goes. |
| `labelClassName` | `string` | — | Extra classes for the label, when the stamp is given a string. |

#### `StackCardEmptyProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `StackCardActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `StackCardActionProps`

Extends `Omit<ViewProps, 'children'>, VariantProps<typeof actionVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `action` | `StackCardDirection \| 'undo'` | **required** | What pressing it does: send the top card that way, or bring the last one back. |
| `icon` | `ReactNode` | — | The glyph. Sized and tinted by the button — pass neither. |
| `label` | `string` | — | What a screen reader is offered. Falls back to "Undo", or to the plain name of the direction. |
| `onPress` | `() => void` | — | Run after the deck has been told, for a sound or a log. |

### Example — How the pile is arranged

`layout` decides what the cards behind the top one do. `stack` steps them down and shrinks them; `fan` turns them alternately and splays them sideways; `flat` hides them entirely.

All three keep the same rule underneath: a card behind climbs toward the top position as the card in front of it is carried away, so by the time the top card commits the next one has already arrived. That is why advancing the deck moves nothing on the screen.

```tsx
{(['stack', 'fan', 'flat']).map((layout) => (
  <StackCard key={layout} className="h-[140px]" layout={layout}>
    {places.map((place) => (
      <StackCard.Card key={place.name} className="justify-center gap-1 p-4">
        <Text weight="semibold">{place.name}</Text>
        <Text size="sm" muted>{place.detail}</Text>
      </StackCard.Card>
    ))}
  </StackCard>
))}
```

### Notes

### The drag is one value, and everything reads it

The top card's offset is the only thing a gesture writes. The stamps fade in on how far it has carried the card toward each direction, and the cards behind climb toward the top position on the furthest of those. Nothing re-renders while a card is being dragged — the only React work in a throw is the callback at the end of it.

That derivation is also why a dismissal is seamless. By the time the top card has been carried far enough to leave, the second card is already exactly where the top card sits, so advancing the deck moves nothing.

### What stays mounted

The pile keeps one card behind the depth it shows, so the next one fades in as it takes the last visible place rather than appearing out of nothing, and one card ahead of the top so `undo` has something to fly back in. Everything else is unmounted, which is what makes a deck of five hundred cost what a deck of five costs.

### Reaching a deck without a gesture

A throw is not available to a screen reader, and neither is a card that can only be answered by throwing it. The top card publishes an accessibility action for every direction the deck accepts — name them with `directionLabels`, because "Swipe left" describes the movement and not the decision — and `StackCard.Action` renders the same decisions as ordinary buttons.

Every card but the top one is out of the reading order. A pile is one card as far as a reader is concerned, and the rest of it is shadow.

### Under reduce motion

The card still goes, and it goes by fading rather than by flying. The throw is the part that moves and moving is what the setting is about; which card is on top is the information, and it is kept. The pile behind stops stepping and simply swaps.

### Inside a scrolling screen

A deck that accepts only left and right declares the horizontal axis to the gesture system, so a vertical scroll starting on the card scrolls the page instead of dragging the card. A deck that accepts all four directions has nothing to give up and takes both axes — so do not put one inside a scroller.

---

Full page, with every example: https://panelui.dev/docs/components/stack-card
