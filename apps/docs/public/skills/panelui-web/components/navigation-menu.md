# Navigation Menu

A site's top-level destinations in a bar, with panels that grow out of it for the destinations that hold more.

```tsx
import { NavigationMenu } from "@/components/panelui/navigation-menu"
```

From npm the path is `panelui-web/navigation-menu`. Install with `npx shadcn@latest add @panelui/navigation-menu`.

## When to use it

Use it for a site's or an app's top-level destinations, where some of them open a panel of further links: a docs header, a product site, an app's launcher.

In `island` the panel is the bar grown larger rather than a box that appears under it, and its contents fade in once it has room. `bar` is a full-width header whose panel hangs below the triggers and moves between them. `dock` is an island at the foot of the window, with icon rows whose labels appear when pointed at.

For a sidebar of destinations beside the page, use [Nav Rail](/docs/web/components/nav-rail). For a list of actions rather than places, use [Menu](/docs/web/components/menu).

## Usage

```tsx
<NavigationMenu aria-label="Main">
  <NavigationMenu.List>
    <NavigationMenu.Item>
      <NavigationMenu.Link href="/docs" active>Docs</NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item value="more">
      <NavigationMenu.Trigger>More</NavigationMenu.Trigger>
      <NavigationMenu.Content>
        <NavigationMenu.Card href="/install" tone="success" eyebrow="Start here">Install</NavigationMenu.Card>
        <NavigationMenu.Pills>
          <NavigationMenu.Pill href="https://github.com" external>GitHub</NavigationMenu.Pill>
        </NavigationMenu.Pills>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  </NavigationMenu.List>
</NavigationMenu>
```

## Parts

```tsx
<NavigationMenu>
  <NavigationMenu.Brand />
  <NavigationMenu.List>
    <NavigationMenu.Item>
      <NavigationMenu.Link />
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Trigger />
      <NavigationMenu.Content>
        <NavigationMenu.Profile />
        <NavigationMenu.Card />
        <NavigationMenu.Value />
        <NavigationMenu.Pills>
          <NavigationMenu.Pill />
        </NavigationMenu.Pills>
        <NavigationMenu.Group>
          <NavigationMenu.Link />
        </NavigationMenu.Group>
        <NavigationMenu.Separator />
        <NavigationMenu.Setting>
          <NavigationMenu.Options>
            <NavigationMenu.Option />
          </NavigationMenu.Options>
        </NavigationMenu.Setting>
        <NavigationMenu.Footer>
          <NavigationMenu.Hint />
        </NavigationMenu.Footer>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  </NavigationMenu.List>
  <NavigationMenu.Actions />
  <NavigationMenu.Status />
</NavigationMenu>
```

- `NavigationMenu.NavigationMenu` — The menu: the bar, and the panel its triggers open. `variant` chooses island, bar or dock, `side` which way the panel opens, and `openOn` whether a trigger opens on a press only or also under the pointer. Pass `value` and `onValueChange` to open a panel yourself, for a keyboard shortcut.
- `NavigationMenu.Brand` — The mark at the start of the bar, drawn in a round tile: an avatar or a logo. With `href` it is a link home; without children it is the mark alone and needs an `aria-label`.
- `NavigationMenu.List` — The destinations and triggers, every one at full strength. A highlight appears under the one the pointer or the keyboard is on, travels between them, and is put away when neither is on the list.
- `NavigationMenu.Item` — One entry in the list. Give it a `value` when it holds a trigger you want to open from outside.
- `NavigationMenu.Link` — A destination. In the bar it is a pill; mark the current page with `active`. Inside a panel it is a row, with an optional `icon` in a square of its own and a `description` under the label.
- `NavigationMenu.Trigger` — Opens its item's content. In an island it keeps a fill of its own, so it reads as a control rather than a destination. Pass `icon` to draw one before the label, and `hideChevron` to drop the chevron after it.
- `NavigationMenu.Content` — What a trigger opens. `className` lays out the panel: its width, a grid, its padding. Its contents fade in together as the panel grows.
- `NavigationMenu.Profile` — Who or what the panel is about: a name, a `description` under it, and a `status` at the end, such as a [Badge](/docs/web/components/badge).
- `NavigationMenu.Card` — A featured destination: a tile in a theme `tone`, a small `eyebrow` line, the title and an arrow. Only the tile carries the colour. Use one or two near the top of a panel, for where most people are going.
- `NavigationMenu.Value` — A value worth taking away, such as a command or an address, with `actions` at its end. Put a Copy pill there.
- `NavigationMenu.Pills` — A row of pills that wraps when it runs out of room.
- `NavigationMenu.Pill` — A small round control: a button, or a link with `href`. `external` adds an arrow and opens the link in a new tab. With only an `icon` it is a round icon pill and needs an `aria-label`.
- `NavigationMenu.Group` — Rows under one small heading, given by `label`.
- `NavigationMenu.Setting` — A labelled row with a control at its end, for preferences kept in the menu. Put `NavigationMenu.Options` or a [Switch](/docs/web/components/switch) in it.
- `NavigationMenu.Options` — A choice of a few options in one rounded track, for a preference kept in the menu. It is a radio group: the arrow keys move the choice.
- `NavigationMenu.Option` — One option in a track. Give it a `value`.
- `NavigationMenu.Separator` — A rule between parts of a panel.
- `NavigationMenu.Footer` — The strip along a panel's foot, for keyboard hints.
- `NavigationMenu.Hint` — One keyboard hint: each of its `keys` in a cap, then what they do.
- `NavigationMenu.Actions` — Controls at the end of the bar that are not destinations, such as sign-in buttons. They sit outside the list, so the highlight does not visit them.
- `NavigationMenu.Status` — A strip hanging under the bar that says what is happening now: an `icon`, a line, an `action` link and an optional `progress` meter. Give each status its own `id`: when the `id` changes, the strip tucks up into the bar, changes out of sight and comes back down. It also tucks away while a panel is open, and when `hidden` is set.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `NavigationMenuProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `NavigationMenuVariant` | `'island'` | `island` is a floating pill that grows into its panel; `dock` is the same with icon rows whose labels appear when pointed at; `bar` is a full-width header with a panel that hangs below it. Default `island`. |
| `side` | `'top' \| 'bottom'` | `bottom` | Which way the panel opens. Default `bottom`, or `top` for `dock`. |
| `openOn` | `'press' \| 'hover'` | — | What opens a panel. `press` waits for a click, Enter or Space, and keeps the panel open until it is dismissed, so a pointer drifting off it while someone types or chooses does not close it. `hover` also opens it under the pointer and closes it when the pointer leaves. Default `press` for `island` and `dock`, `hover` for `bar`. |
| `className` | `string` | — | — |
| `barClassName` | `string` | — | Classes for the bar that holds the list. |

#### `NavigationMenuListProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavigationMenuItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavigationMenuTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | — | Drawn before the label. In a dock it is the whole row until pointed at. |
| `hideChevron` | `boolean` | `false` | Hides the chevron after the label. |
| `className` | `string` | — | — |

#### `NavigationMenuContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavigationMenuLinkProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | — | Drawn before the label: in the bar, beside it; in a panel, in a square of its own. |
| `description` | `ReactNode` | — | In a panel, a quieter line under the label. |
| `className` | `string` | — | — |

#### `NavigationMenuBrandProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | — | The mark: an image or an icon, drawn in a round tile. |

#### `NavigationMenuCardProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | — | Drawn in the card's tile. |
| `tone` | `NavigationMenuTone` | `'neutral'` | The tile's colour, as a theme role. Default `neutral`. |
| `eyebrow` | `ReactNode` | — | A small line above the title: "Start here", "New". |
| `className` | `string` | — | — |

#### `NavigationMenuGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | — | The small heading over the group. |

#### `NavigationMenuSettingProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | **required** | What the control beside it sets: "Theme", "Labels". |

#### `NavigationMenuHintProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `keys` | `readonly string[]` | **required** | The keys, each drawn in its own cap: `['⌘', 'K']`. |

#### `NavigationMenuProfileProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `description` | `ReactNode` | — | A quieter line under the name: a role, a place, a plan. |
| `status` | `ReactNode` | — | Something at the row's end, such as a Badge saying whether they are available. |

#### `NavigationMenuValueProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `actions` | `ReactNode` | — | Pills at the row's end that act on the value: a copy, a share. |

#### `NavigationMenuOptionsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavigationMenuOptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavigationMenuStatusProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `id` | `string` | `''` | Which status this is. When it changes, the strip tucks up behind the bar, changes what it says out of sight, and comes back down. Content that changes under the same `id`, such as `progress`, updates in place. |
| `icon` | `ReactNode` | — | Drawn before the line: a project's mark, a coloured dot for a state. |
| `action` | `ReactNode` | — | At the strip's end, after a rule: usually a link such as "See it". |
| `progress` | `number` | — | How far along, from 0 to 1, drawn as a short meter after the line. Leave it out for none. |
| `hidden` | `boolean` | `false` | Tucks the strip away behind the bar, for example while the page scrolls. |

## In a Server Component

`NavigationMenu` is a client component. A Server Component cannot read `NavigationMenu.List` off the import, so import each part by name: `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`, `NavigationMenuBrand`, `NavigationMenuActions`, `NavigationMenuCard`, `NavigationMenuGroup`, `NavigationMenuSetting`, `NavigationMenuSeparator`, `NavigationMenuFooter`, `NavigationMenuHint`, `NavigationMenuProfile`, `NavigationMenuValue`, `NavigationMenuPills`, `NavigationMenuPill`, `NavigationMenuOptions`, `NavigationMenuOption`, `NavigationMenuStatus`.

## Notes

#### Opening

In `island` and `dock` a trigger opens on a press, and the panel stays open until a press outside, Escape or following a link closes it. A panel that holds a search field or settings must not close because the pointer drifted off it. In `bar` a trigger also opens after a short pause under the pointer, and the panel closes when the pointer leaves; `delay` and `closeDelay` set the two pauses, 60 and 120 milliseconds by default. Set `openOn` to choose either behaviour for any variant.

Moving from one trigger to the next while a panel is open swaps the panel's content without closing it. Focus returns to the trigger when it closes.

To open a panel from somewhere else, give its `NavigationMenu.Item` a `value` and hold `value` and `onValueChange` on the menu. That is how the Search example answers ⌘K.

#### Keyboard

Tab moves across the bar. Enter, Space or the Down arrow opens a trigger's panel, and Tab moves into it; there the arrow keys walk its links, and Escape closes it and returns focus to the trigger. The highlight follows focus from the keyboard as it follows the pointer.

#### The status strip

`NavigationMenu.Status` goes inside `NavigationMenu`, after the list; it is drawn under the bar rather than in it. It is a live region, so a screen reader announces a new status, and while it is tucked away it leaves the accessibility tree. Keep the line short: the strip is never wider than the bar, and a longer line is cut off with an ellipsis.

#### The panel's width

A panel is as wide as its content, and in `island` and `dock` never narrower than the bar it grows from. Set a width on `NavigationMenu.Content` to fix it, such as `w-[22rem]`. The panel stays inside the viewport and shrinks to fit a narrow one.

#### Reduced motion

With reduced motion set, the panel opens and changes size without animating, its contents appear without fading, and the highlight moves without travelling.

#### Accessibility

The root is a `<nav>` landmark, so give it an `aria-label` when the page has more than one. A link marked `active` carries `aria-current="page"`. Each trigger reports its panel with `aria-expanded`. In a dock the labels are always in the accessibility tree, so an icon-only row is never nameless. `NavigationMenu.Options` is a radio group, and an icon-only `NavigationMenu.Pill` needs an `aria-label`. The highlight is decorative and hidden from assistive technology.

#### Built on

Base UI's NavigationMenu, for the triggers, hover intent, keyboard model, focus return and the size it measures for each panel. The panel's growth is a clip from the bar's measured shape to the panel's full size. Icons are whatever the app passes; the package does not ship an icon set.

## Example

```tsx
'use client';

import { CheckIcon, CoinsIcon, ShareIcon, TerminalIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/panelui/badge';
import { NavigationMenu } from '@/components/panelui/navigation-menu';

const COMMAND = 'npx panelui-cli init';

export default function NavigationMenuOverview() {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('system');
  const [motion, setMotion] = useState('full');

  const copy = () => {
    void navigator.clipboard?.writeText(COMMAND);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenu.Brand
        href="#"
        aria-label="Home"
        icon={<img src="https://avatars.githubusercontent.com/u/127331761?v=4" alt="" />}
      />
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#" active>
            Docs
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Components</NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Blocks</NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item value="more">
          <NavigationMenu.Trigger>v0.18</NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[25rem]">
            <NavigationMenu.Profile
              description="Maintainer · PanelUI"
              status={
                <Badge variant="success" dot>
                  Taking contributions
                </Badge>
              }
            >
              Khalid Abdi
            </NavigationMenu.Profile>
            <NavigationMenu.Card href="#" icon={<TerminalIcon />} eyebrow="Start here">
              Install PanelUI
            </NavigationMenu.Card>
            <NavigationMenu.Card href="#" icon={<CoinsIcon />} eyebrow="New in 0.18">
              Currency Input
            </NavigationMenu.Card>
            <NavigationMenu.Value
              actions={
                <>
                  <NavigationMenu.Pill onClick={copy} icon={copied ? <CheckIcon /> : undefined}>
                    {copied ? 'Copied' : 'Copy'}
                  </NavigationMenu.Pill>
                  <NavigationMenu.Pill icon={<ShareIcon />} aria-label="Share" />
                </>
              }
            >
              <code className="font-mono text-sm">{COMMAND}</code>
            </NavigationMenu.Value>
            <NavigationMenu.Pills>
              <NavigationMenu.Pill href="https://github.com/panel-ui/PanelUI" external>
                GitHub
              </NavigationMenu.Pill>
              <NavigationMenu.Pill href="https://www.npmjs.com/package/panelui-web" external>
                npm
              </NavigationMenu.Pill>
              <NavigationMenu.Pill href="#" external>
                Changelog
              </NavigationMenu.Pill>
            </NavigationMenu.Pills>
            <NavigationMenu.Separator />
            <NavigationMenu.Setting label="Theme">
              <NavigationMenu.Options aria-label="Theme" value={theme} onValueChange={(next) => setTheme(String(next))}>
                <NavigationMenu.Option value="system">System</NavigationMenu.Option>
                <NavigationMenu.Option value="light">Light</NavigationMenu.Option>
                <NavigationMenu.Option value="dark">Dark</NavigationMenu.Option>
              </NavigationMenu.Options>
            </NavigationMenu.Setting>
            <NavigationMenu.Setting label="Motion">
              <NavigationMenu.Options
                aria-label="Motion"
                value={motion}
                onValueChange={(next) => setMotion(String(next))}
              >
                <NavigationMenu.Option value="full">Full</NavigationMenu.Option>
                <NavigationMenu.Option value="reduced">Reduced</NavigationMenu.Option>
              </NavigationMenu.Options>
            </NavigationMenu.Setting>
            <NavigationMenu.Footer>
              <NavigationMenu.Hint keys={['↑', '↓']}>Move</NavigationMenu.Hint>
              <NavigationMenu.Hint keys={['↵']}>Open</NavigationMenu.Hint>
              <NavigationMenu.Hint keys={['Esc']}>Close</NavigationMenu.Hint>
            </NavigationMenu.Footer>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu>
  );
}
```
