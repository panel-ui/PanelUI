# Lane Board

Lanes of cards that can be dragged within a lane and from one lane to another.

```tsx
import { LaneBoard, type LaneBoardLane } from "@/components/panelui/lane-board"
```

From npm the path is `panelui-web/lane-board`. Install with `npx shadcn@latest add @panelui/lane-board`.

## When to use it

Use it for things that move through a few stages: changes going into a release, tasks, orders. Each stage is a lane with its cards and a count, and a card is dragged to another place in its lane or into another lane.

The board does not keep the cards. You give it the lanes and it tells you what they should become when a card is set down, so the order on screen is always the order in your state.

The board has a fixed height. A lane with more cards than fit scrolls on its own, and on a narrow screen the lanes scroll sideways. For one list that only needs reordering, a sortable list is the simpler thing.

## Usage

```tsx
const [lanes, setLanes] = useState<LaneBoardLane<Change>[]>([
  { id: 'building', title: 'Building', cards: [{ id: 'REL-224', title: 'Faster search' }] },
  { id: 'shipped', title: 'Shipped', cards: [] },
])

<LaneBoard
  lanes={lanes}
  onLanesChange={setLanes}
  renderCard={(change) => (
    <>
      <LaneBoard.Title>{change.title}</LaneBoard.Title>
      <LaneBoard.Code>{change.id}</LaneBoard.Code>
    </>
  )}
/>
```

## Parts

```tsx
<LaneBoard
  lanes={…}
  renderCard={(card) => (
    <>
      <LaneBoard.Row>
        <LaneBoard.Title />
        <LaneBoard.Avatar />
      </LaneBoard.Row>
      <LaneBoard.Code />
      <LaneBoard.Row>
        <LaneBoard.Steps />
        <LaneBoard.Meta />
      </LaneBoard.Row>
    </>
  )}
/>
```

- `LaneBoard.Title` — A card's name.
- `LaneBoard.Code` — A card's reference, in a fixed-width face so a column of them lines up.
- `LaneBoard.Row` — A line of a card with something at each end. It is the last line unless you move it up, as with a title and an avatar.
- `LaneBoard.Steps` — How far along a card is: a row of dashes with `value` of `max` lit, in the theme colour named by `color`.
- `LaneBoard.Tag` — A word in a pill, for a card's state.
- `LaneBoard.Meta` — A short figure at the end of the row: a time, a count.
- `LaneBoard.Avatar` — Who a card belongs to, as initials in a small circle.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `LaneBoardProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `lanes` | `LaneBoardLane<T>[]` | — | The lanes and their cards, when the caller holds them. |
| `defaultLanes` | `LaneBoardLane<T>[]` | — | The lanes to begin with, when the caller does not hold them. |
| `onLanesChange` | `(lanes: LaneBoardLane<T>[]) => void` | — | Called with the lanes as they should now be, when a card is set down somewhere new. |
| `onMove` | `(move: LaneBoardMove<T>) => void` | — | Called with the one card that moved, and where from and to. |
| `renderCard` | `(card: T, state: { lane: LaneBoardLane<T>; carried: boolean }) => ReactNode` | **required** | Draws the inside of a card. |
| `renderLaneFooter` | `(lane: LaneBoardLane<T>) => ReactNode` | — | Draws something under a lane's cards, such as a button that adds one. |
| `cardName` | `(card: T) => string` | `(card) => card.id` | What a screen reader calls a card, where its id would not mean much. |
| `label` | `string` | `'Board'` | What a screen reader calls the board. |
| `height` | `number \| string` | `'28rem'` | How tall the board is: a number of pixels, or any CSS length. Lanes fill it, and one with more cards than fit scrolls. `'auto'` lets the board grow with its longest lane. |

#### `LaneBoardTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ className: laneBoardVariants().title({ className }) }, props),` | **required** | — |

#### `LaneBoardCodeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ className: laneBoardVariants().code({ className }) }, props),` | **required** | — |

#### `LaneBoardRowProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ className: laneBoardVariants().row({ className }) }, props),` | **required** | — |

#### `LaneBoardStepsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | **required** | How many steps are done. |
| `max` | `number` | `5` | How many steps there are. |
| `color` | `LaneBoardColor` | `'primary'` | Which of the theme's roles the done steps are drawn in. |
| `label` | `string` | `'Progress'` | What a screen reader calls it. |

#### `LaneBoardTagProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `LaneBoardColor` | `primary` | Which of the theme's roles the tag is drawn in. |

#### `LaneBoardMetaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps({ className: laneBoardVariants().meta({ className }) }, props),` | **required** | — |

#### `LaneBoardAvatarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

## In a Server Component

`LaneBoard` is a client component. A Server Component cannot read `LaneBoard.Title` off the import, so import each part by name: `LaneBoardTitle`, `LaneBoardCode`, `LaneBoardRow`, `LaneBoardSteps`, `LaneBoardTag`, `LaneBoardMeta`, `LaneBoardAvatar`.

## Notes

#### The data

`lanes` is a list of `{ id, title, cards }`, and a card is any object with an `id` of its own across the whole board. Everything else on a card is yours, and `renderCard` draws it. The parts above are there for the common pieces and none of them is required.

Pass `defaultLanes` in place of `lanes` and the board holds the order itself.

#### Lanes

Besides `id`, `title` and `cards`, a lane takes `color`, one of the theme's roles, and `limit`. The limit is advice: the count shows it and warns when the lane is over, and the board still lets a card in. To hold a lane to its limit, refuse the move in `onLanesChange`, as the second example refuses one.

`renderLaneFooter` is given the lane and draws under its cards. A button there is pressed as usual and does not start a drag.

#### Hearing about a move

`onLanesChange` is called with all the lanes as they should now be. `onMove` is called with the one card and where it went from and to, which is the shape a request to a server usually wants. Neither is called when a card is set down where it started.

#### Dragging

A press on a card becomes a drag once the pointer has moved a few pixels. On a touch screen a card is picked up by resting a finger on it for a moment, so a swipe still scrolls. A button, a link or a field inside a card works as usual and does not start a drag; put `data-no-drag` on anything else that should not.

The lane a carried card is over is drawn with a firmer border, and the place it would land is outlined. Near either end of the board, a carried card scrolls it. Escape puts the card back.

#### Keyboard

Every card is a Tab stop. Space or Enter picks one up; up and down move it within its lane, left and right into the lane beside; Space or Enter sets it down and Escape puts it back. Moving focus away also puts it back.

#### Screen readers

Picking up, each move and setting down are announced with the card's name, its lane and its place in it. `cardName` says what a card is called; without it, its `id` is used. A lane is named by its `title` when that is plain text.

#### Width

Lanes share the board's width and are never narrower than 12.5rem. When they do not fit, the board scrolls sideways and stops on a lane.

#### Height

The board is 28rem tall unless `height` says otherwise: a number of pixels or any CSS length. Every lane fills it. A lane with more cards than fit scrolls, with a thin bar that shows while the pointer is on the lane, and its cards fade out towards the edge they carry on past. Adding a card to a full lane therefore moves nothing else on the page.

A card carried near the top or bottom of a lane scrolls it, so a card can be set down anywhere in a long lane. What `renderLaneFooter` draws stays under the lane and does not scroll away.

`height="auto"` lets the board grow with its longest lane. It then keeps the greatest height it has had and does not shrink when cards leave that lane, so nothing moves under the pointer during a drag.

#### Motion

Cards slide to their new places as one is carried over them, and a card that is let go flies the last of the way into its place. A card moved to another lane with the keyboard appears there without sliding. With reduced motion on, they move at once.

## Example

```tsx
'use client';

import { useState } from 'react';
import { LaneBoard, type LaneBoardLane } from '@/components/panelui/lane-board';

interface Change {
  id: string;
  title: string;
  /** How many of the five checks have passed. */
  checks: number;
  /** How long it has been in its lane. */
  waiting: string;
}

/** The changes going into one release, by how far along each is. */
const START: LaneBoardLane<Change>[] = [
  {
    id: 'queued',
    title: 'Queued',
    cards: [
      { id: 'REL-231', title: 'Offline drafts', checks: 0, waiting: '2d' },
      { id: 'REL-238', title: 'Export to CSV', checks: 1, waiting: '5h' },
    ],
  },
  {
    id: 'building',
    title: 'Building',
    cards: [
      { id: 'REL-224', title: 'Faster search', checks: 2, waiting: '1d' },
      { id: 'REL-229', title: 'Invite by link', checks: 3, waiting: '3h' },
      { id: 'REL-233', title: 'Keyboard shortcuts', checks: 2, waiting: '40m' },
      { id: 'REL-236', title: 'Saved filters', checks: 1, waiting: '25m' },
      { id: 'REL-240', title: 'Bulk archive', checks: 0, waiting: '10m' },
    ],
  },
  {
    id: 'review',
    title: 'In review',
    cards: [{ id: 'REL-219', title: 'Audit log', checks: 4, waiting: '6h' }],
  },
  {
    id: 'shipped',
    title: 'Shipped',
    cards: [
      { id: 'REL-207', title: 'Two-step sign in', checks: 5, waiting: '' },
      { id: 'REL-212', title: 'Dark charts', checks: 5, waiting: '' },
    ],
  },
];

export default function LaneBoardRelease() {
  const [lanes, setLanes] = useState(START);

  return (
    <LaneBoard
      lanes={lanes}
      onLanesChange={setLanes}
      label="Release 4.2"
      height="30rem"
      cardName={(change) => change.title}
      renderCard={(change, { lane }) => (
        <>
          <LaneBoard.Title>{change.title}</LaneBoard.Title>
          <LaneBoard.Code>{change.id}</LaneBoard.Code>
          <LaneBoard.Row>
            <LaneBoard.Steps value={change.checks} color="info" label="Checks passed" />
            {lane.id === 'shipped' ? (
              <LaneBoard.Tag color="success">Live</LaneBoard.Tag>
            ) : (
              <LaneBoard.Meta>{change.waiting}</LaneBoard.Meta>
            )}
          </LaneBoard.Row>
        </>
      )}
    />
  );
}
```
