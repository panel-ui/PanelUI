# Chip

A pill that can be pressed: a filter turned on and off, or an added value with a × to take it out.

```tsx
import { Chip } from "@/components/panelui/chip"
```

From npm the path is `panelui-web/chip`. Install with `npx shadcn@latest add @panelui/chip`.

## When to use it

Use chips for a row of filters that each turn on and off, or for values someone has added, such as tags or recipients, that they can take out again.

A chip in a `Chip.Group` is a toggle, and the group holds the values that are on as one array. Given `onRemove`, a chip is a removable value instead, and it is not a toggle.

For a label that is never pressed, use [Badge](/docs/web/components/badge). For a choice of one from a few that applies at once, [Tabs](/docs/web/components/tabs) or a [Button Group](/docs/web/components/button-group) may read better.

## Usage

```tsx
<Chip.Group defaultValue={['open']} aria-label="Show">
  <Chip value="open">Open</Chip>
  <Chip value="merged">Merged</Chip>
</Chip.Group>

<Chip onRemove={() => remove('design')}>design</Chip>
```

## Parts

```tsx
<Chip.Group>
  <Chip />
</Chip.Group>
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ChipToggleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onRemove` | `undefined` | — | — |

#### `ChipRemovableProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onRemove` | `() => void` | **required** | Makes the chip a value that can be taken out: it shows a × that calls this. A removable chip is not a toggle. |
| `removeLabel` | `string` | — | What the × is called to a screen reader. Default `Remove <text>`, when the text is a string. |
| `disabled` | `boolean` | — | — |

#### `ChipGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

## Notes

#### Motion

When a chip turns on, a tick slides in at its start and the label moves over to make room for it. With reduced motion turned on, the tick appears in place.

#### Keyboard

Each chip is a button with `aria-pressed`. Tab moves between them, and Space or Enter turns one on or off.

## Example

```tsx
'use client';

import { Chip } from '@/components/panelui/chip';

export default function ChipOverview() {
  return (
    <Chip.Group defaultValue={['vegetarian', 'quick']} aria-label="Filter recipes">
      <Chip value="vegetarian">Vegetarian</Chip>
      <Chip value="quick">Under 30 minutes</Chip>
      <Chip value="one-pot">One pot</Chip>
      <Chip value="freezer">Freezes well</Chip>
    </Chip.Group>
  );
}
```
