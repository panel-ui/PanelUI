# Tap Menu

A button that opens a few actions as cards over a blurred screen.

```tsx
import { TapMenu } from "@/components/panelui/tap-menu"
```

From npm the path is `panelui-web/tap-menu`. Install with `npx shadcn@latest add @panelui/tap-menu`.

## When to use it

Use it for the three to six things somebody starts most often from a screen: a new booking, a new note, an upload. One button holds them, and pressing it opens each action as a card big enough to tap, while the screen behind blurs.

It is a menu underneath. The arrow keys move between the cards, Enter picks one, and Escape closes it and returns focus to the button.

For a longer list, or actions with checks and submenus, use [Menu](/docs/web/components/menu). For a search over every command, use [Command](/docs/web/components/command).

## Usage

```tsx
<TapMenu>
  <TapMenu.Trigger aria-label="Create" />
  <TapMenu.Content>
    <TapMenu.Item icon={<CalendarPlusIcon />} onClick={book}>
      Book a session
    </TapMenu.Item>
    <TapMenu.Item icon={<FileTextIcon />} onClick={quote}>
      Send a quote
    </TapMenu.Item>
  </TapMenu.Content>
</TapMenu>
```

## Parts

```tsx
<TapMenu>
  <TapMenu.Trigger />
  <TapMenu.Content>
    <TapMenu.Heading />
    <TapMenu.Item />
  </TapMenu.Content>
</TapMenu>
```

- `TapMenu.Trigger` — The round button. It shows a plus that turns into a cross while the menu is open, and the blur leaves a hole over it so it stays sharp. Give it an `aria-label`.
- `TapMenu.Content` — The cards and the blurred backdrop. `container` keeps both inside an element instead of the whole page.
- `TapMenu.Heading` — A small heading over the cards. Use it with `spotlight`, where the sheet opens away from the button.
- `TapMenu.Item` — One action. `icon` goes in the card's top corner and the name in its bottom one. `shortcut` adds a key at the end of a `stack` row. Pressing it closes the menu.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `TapMenuProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `TapMenuVariant` | — | How the cards are laid out and arrive: `tiles`, `fan`, `stack` or `spotlight`. Default `tiles`. |

#### `TapMenuTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `TapMenuContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `container` | `HTMLElement \| null \| { current: HTMLElement \| null }` | — | The element the cards and the blur are put in. The blur stops at its edges; give it `position: relative`. Default the page, with the blur over the whole viewport. |
| `backdrop` | `boolean` | `true` | Whether the screen behind is blurred. Default `true`. |
| `side` | `BaseMenu.Positioner.Props['side']` | — | Which side of the trigger the cards open on, for `tiles` and `stack`. Default `bottom` for tiles, `top` for stack. |
| `align` | `BaseMenu.Positioner.Props['align']` | — | How they line up with the trigger, for `tiles` and `stack`. Default `start` for tiles, `end` for stack. |
| `sideOffset` | `number` | `10` | The gap between the trigger and the cards, in pixels. Default `10`. |
| `arc` | `[number, number]` | — | For `fan`: the arc the cards are spread over, in degrees, where 0 points right and -90 points up. Default `[-180, -90]`, from left round to up, for a button in the bottom trailing corner. |
| `radius` | `number` | `148` | For `fan`: how far the cards' centres are from the trigger's, in pixels. Default `148`. |
| `className` | `string` | — | — |

#### `TapMenuItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | — | The glyph in the card's top corner. |
| `description` | `ReactNode` | — | A line under the name, for `stack` and `spotlight`. |
| `shortcut` | `ReactNode` | — | A key or chord at the row's end, for `stack`: "⌘N". |
| `className` | `string` | — | — |
| `style` | `CSSProperties` | — | — |

## In a Server Component

`TapMenu` is a client component. A Server Component cannot read `TapMenu.Trigger` off the import, so import each part by name: `TapMenuTrigger`, `TapMenuContent`, `TapMenuItem`, `TapMenuHeading`.

## Notes

#### Where the blur goes

Without `container`, the backdrop covers the viewport. Pass an element or a ref as `container` to keep the cards and the blur inside it. That element needs `position: relative`, and usually `overflow: hidden` and `isolation: isolate`.

The backdrop leaves a round hole over the trigger, so the trigger stays sharp wherever it sits, and pressing it closes the menu. The hole is measured when the menu opens.

#### Placement

`tiles` opens below the button and `stack` above it. Both take `side`, `align` and `sideOffset`, and move to the other side when there is no room. `fan` is always centred on the button. `spotlight` ignores where the button is.

#### Motion

The cards arrive one after another, 35 ms apart, and all leave together in 150 ms. With reduced motion they appear and go without moving.

#### Screen readers

The button is announced as a menu button and each card as a menu item named by its text. A card with only an icon needs an `aria-label`.

## Example

```tsx
import { CalendarAdd01Icon, FileEditIcon, SparklesIcon, UserAdd01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { TapMenu } from '@/components/panelui/tap-menu';

export default function TapMenuOverview() {
  return (
    <TapMenu>
      <TapMenu.Trigger aria-label="Create" />
      <TapMenu.Content align="center">
        <TapMenu.Item icon={<HugeiconsIcon icon={CalendarAdd01Icon} />}>Book a session</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={FileEditIcon} />}>Send a quote</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={UserAdd01Icon} />}>Add a client</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={SparklesIcon} />}>Plan with AI</TapMenu.Item>
      </TapMenu.Content>
    </TapMenu>
  );
}
```
