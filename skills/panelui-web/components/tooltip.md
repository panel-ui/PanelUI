# Tooltip

A short hint about a control while it is hovered or focused: a pill, a card, its keys or a status.

```tsx
import { Tooltip } from "@/components/panelui/tooltip"
```

From npm the path is `panelui-web/tooltip`. Install with `npx shadcn@latest add @panelui/tooltip`.

## When to use it

Use it to name an icon button, to show the keys for an action, or to add a line about a control that its label has no room for.

A tooltip only appears to a pointer or to keyboard focus. It cannot be opened on a touch screen, so put nothing in it that somebody needs in order to use the page, and nothing that can be pressed. For content with links or buttons, use a popover; for a message that must be read, an [Alert](/docs/web/components/alert).

Put one `Tooltip.Provider` round a group of tooltips, or round the whole app. The first tooltip waits half a second, so passing over a toolbar does not flash one at every button. Once one is open, the next opens at once and without animating, so reading along a row of icons is quick.

## Usage

```tsx
<Tooltip.Provider>
  <Tooltip>
    <Tooltip.Trigger render={<Button variant="ghost" size="icon" aria-label="Settings" />}>
      <SettingsIcon />
    </Tooltip.Trigger>
    <Tooltip.Content>Settings</Tooltip.Content>
  </Tooltip>
</Tooltip.Provider>
```

## Parts

```tsx
<Tooltip.Provider>
  <Tooltip>
    <Tooltip.Trigger />
    <Tooltip.Content>
      <Tooltip.Title />
      <Tooltip.Description />
      <Tooltip.Shortcut />
    </Tooltip.Content>
  </Tooltip>
</Tooltip.Provider>
```

- `Tooltip.Provider` — Shares the timing between the tooltips inside it: `delay` before the first opens, 500ms by default, and none for the next while one is showing.
- `Tooltip.Trigger` — What the tooltip is about. It is a button unless `render` draws it as something else, such as a `Button`.
- `Tooltip.Content` — The hint, in a layer over the page. `variant` picks the look and `side` the side of the trigger it opens on; it moves to the other side where there is no room. `arrow={false}` takes the arrow off.
- `Tooltip.Title` — A heavier first line, for the `rich` look.
- `Tooltip.Description` — Quieter words under the title.
- `Tooltip.Shortcut` — The keys for the action, as key caps at the end of the line. It only shows them; handle the keys where the action lives.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `TooltipTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `TooltipContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `TooltipVariant` | `'solid'` | Its look: `solid`, `outline`, `shortcut`, `rich` or `tone`. Default `solid`. |
| `tone` | `TooltipTone` | `info` | The status colour of a `tone` tooltip. Default `info`. |
| `side` | `BaseTooltip.Positioner.Props['side']` | `'top'` | Which side of the trigger it opens on. It moves to the other side where there is no room. Default `top`. |
| `align` | `BaseTooltip.Positioner.Props['align']` | `'center'` | How it lines up with the trigger along that side. Default `center`. |
| `sideOffset` | `number` | — | The gap between the trigger and the tooltip, in pixels. Default `8`, or `6` without an arrow. |
| `arrow` | `boolean` | `true` | Whether a small arrow points at the trigger. The `shortcut` look never has one. Default `true`. |
| `container` | `BaseTooltip.Portal.Props['container']` | — | Where in the document it is put. Default `document.body`. |
| `className` | `string` | — | — |

#### `TooltipShortcutProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `keys` | `readonly string[]` | **required** | The keys, each drawn as a key cap: `['⌘', 'K']`. |

## In a Server Component

`Tooltip` is a client component. A Server Component cannot read `Tooltip.Provider` off the import, so import each part by name: `TooltipProvider`, `TooltipTrigger`, `TooltipContent`, `TooltipTitle`, `TooltipDescription`, `TooltipShortcut`.

## Notes

#### Accessibility

A tooltip is for people who can see it. A screen reader does not read it, so the trigger must carry the same words in its own name: give an icon button an `aria-label` that matches its tooltip, as every example here does.

The tooltip opens when the trigger is focused from the keyboard and closes on Escape.

#### Reduced motion

With reduced motion turned on, it appears and goes without growing or fading.

## Example

```tsx
'use client';

import { Button } from '@/components/panelui/button';
import { Tooltip } from '@/components/panelui/tooltip';
import { BellIcon, InboxIcon, SettingsIcon, UserRoundIcon } from 'lucide-react';

const ACTIONS = [
  { label: 'Inbox', icon: <InboxIcon /> },
  { label: 'Notifications', icon: <BellIcon /> },
  { label: 'Profile', icon: <UserRoundIcon /> },
  { label: 'Settings', icon: <SettingsIcon /> },
];

export default function TooltipOverview() {
  return (
    <Tooltip.Provider>
      <div className="flex items-center gap-1">
        {ACTIONS.map((action, index) => (
          <Tooltip key={action.label} defaultOpen={index === 1}>
            <Tooltip.Trigger render={<Button variant="ghost" size="icon" aria-label={action.label} />}>
              {action.icon}
            </Tooltip.Trigger>
            <Tooltip.Content>{action.label}</Tooltip.Content>
          </Tooltip>
        ))}
      </div>
    </Tooltip.Provider>
  );
}
```
