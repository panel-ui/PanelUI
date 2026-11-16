# Navigation Menu

A site's top-level destinations in a bar, with panels that grow out of it for the destinations that hold more.

```tsx
import { NavigationMenu } from "@/components/panelui/navigation-menu"
```

From npm the path is `panelui-web/navigation-menu`. Install with `npx shadcn@latest add @panelui/navigation-menu`.

## When to use it

Use it for a site's or an app's top-level destinations, where some of them open a panel of further links: a docs header, a product site, an app's launcher.

In `island` the panel is the bar grown larger rather than a box that appears under it, and its contents arrive one after another behind the growth. `bar` is a full-width header whose panel hangs below the triggers and moves between them. `dock` is an island at the foot of the window, with icon rows whose labels appear when pointed at.

For a sidebar of destinations beside the page, use [Nav Rail](/docs/web/components/nav-rail). For a list of actions rather than places, use [Menu](/docs/web/components/menu).

## Usage

```tsx
<NavigationMenu aria-label="Main">
  <NavigationMenu.List>
    <NavigationMenu.Item>
      <NavigationMenu.Link href="/docs" active>Docs</NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item value="explore">
      <NavigationMenu.Trigger>Explore</NavigationMenu.Trigger>
      <NavigationMenu.Content>
        <NavigationMenu.Card href="/install" eyebrow="Start here">Install</NavigationMenu.Card>
        <NavigationMenu.Link href="/blog" description="Long reads">Blog</NavigationMenu.Link>
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
        <NavigationMenu.Card />
        <NavigationMenu.Group>
          <NavigationMenu.Link />
        </NavigationMenu.Group>
        <NavigationMenu.Setting />
        <NavigationMenu.Separator />
        <NavigationMenu.Footer>
          <NavigationMenu.Hint />
        </NavigationMenu.Footer>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  </NavigationMenu.List>
  <NavigationMenu.Actions />
</NavigationMenu>
```

- `NavigationMenu.NavigationMenu` — The menu: the bar, and the panel its triggers open. `variant` chooses island, bar or dock, and `side` which way the panel opens. Pass `value` and `onValueChange` to open a panel yourself, for a keyboard shortcut.
- `NavigationMenu.Brand` — The product's mark at the start of the bar, drawn in a round tile. With `href` it is a link home; without children it is the mark alone and needs an `aria-label`.
- `NavigationMenu.List` — The destinations and triggers. A highlight rests on the current page, moves to an open trigger, and follows the pointer and the keyboard across the rest.
- `NavigationMenu.Item` — One entry in the list. Give it a `value` when it holds a trigger you want to open from outside.
- `NavigationMenu.Link` — A destination. In the bar it is a pill; mark the current page with `active`. Inside a panel it is a row, with an optional `icon` in a square of its own and a `description` under the label.
- `NavigationMenu.Trigger` — Opens its item's content, on a press or after a short pause under the pointer. Pass `icon` to draw one before the label, and `hideChevron` to drop the chevron after it.
- `NavigationMenu.Content` — What a trigger opens. `className` lays out the panel: its width, a grid, its padding. Its children arrive one after another as it opens.
- `NavigationMenu.Card` — A featured destination: a tile in a theme `tone`, a small `eyebrow` line, the title and an arrow. Use one or two at the top of a panel for where most people are going.
- `NavigationMenu.Group` — Rows under one small heading, given by `label`.
- `NavigationMenu.Setting` — A labelled row with a control at its end, for preferences kept in the menu. Put a segmented [Tabs](/docs/web/components/tabs) or a [Switch](/docs/web/components/switch) in it.
- `NavigationMenu.Separator` — A rule between parts of a panel.
- `NavigationMenu.Footer` — The strip along a panel's foot, for keyboard hints.
- `NavigationMenu.Hint` — One keyboard hint: each of its `keys` in a cap, then what they do.
- `NavigationMenu.Actions` — Controls at the end of the bar that are not destinations, such as sign-in buttons. They sit outside the list, so the highlight does not visit them.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `NavigationMenuProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `NavigationMenuVariant` | `'island'` | `island` is a floating pill that grows into its panel; `dock` is the same with icon rows whose labels appear when pointed at; `bar` is a full-width header with a panel that hangs below it. Default `island`. |
| `side` | `'top' \| 'bottom'` | `bottom` | Which way the panel opens. Default `bottom`, or `top` for `dock`. |
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

## In a Server Component

`NavigationMenu` is a client component. A Server Component cannot read `NavigationMenu.List` off the import, so import each part by name: `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`, `NavigationMenuBrand`, `NavigationMenuActions`, `NavigationMenuCard`, `NavigationMenuGroup`, `NavigationMenuSetting`, `NavigationMenuSeparator`, `NavigationMenuFooter`, `NavigationMenuHint`.

## Notes

#### Opening

A trigger opens on a press, or after a short pause under the pointer; `delay` and `closeDelay` set the two pauses, 60 and 120 milliseconds by default. Moving from one trigger to the next while a panel is open swaps the panel's content without closing it. A press outside, Escape, or following a link closes it, and focus returns to the trigger.

To open a panel from somewhere else, give its `NavigationMenu.Item` a `value` and hold `value` and `onValueChange` on the menu. That is how the Search example answers ⌘K.

#### Keyboard

Tab moves across the bar. Enter, Space or the Down arrow opens a trigger's panel, and Tab moves into it; there the arrow keys walk its links, and Escape closes it and returns focus to the trigger. The highlight follows focus from the keyboard as it follows the pointer.

#### The panel's width

A panel is as wide as its content, and in `island` and `dock` never narrower than the bar it grows from. Set a width on `NavigationMenu.Content` to fix it, such as `w-[22rem]`. The panel stays inside the viewport and shrinks to fit a narrow one.

#### Reduced motion

With reduced motion set, the panel opens and changes size without animating, its contents arrive without the blur, and the highlight moves without travelling.

#### Accessibility

The root is a `<nav>` landmark, so give it an `aria-label` when the page has more than one. A link marked `active` carries `aria-current="page"`. Each trigger reports its panel with `aria-expanded`. In a dock the labels are always in the accessibility tree, so an icon-only row is never nameless. The highlight is decorative and hidden from assistive technology.

#### Built on

Base UI's NavigationMenu, for the triggers, hover intent, keyboard model, focus return and the size it measures for each panel. The panel's growth is a clip from the bar's measured shape to the panel's full size. Icons are whatever the app passes; the package does not ship an icon set.

## Example

```tsx
'use client';

import { BookOpenIcon, CoinsIcon, LayoutTemplateIcon, RocketIcon, ScrollTextIcon, SparklesIcon } from 'lucide-react';
import { NavigationMenu } from '@/components/panelui/navigation-menu';

export default function NavigationMenuOverview() {
  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenu.Brand href="#" icon={<SparklesIcon />} aria-label="Home" />
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
        <NavigationMenu.Item value="explore">
          <NavigationMenu.Trigger>Explore</NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[22rem]">
            <NavigationMenu.Card href="#" icon={<RocketIcon />} tone="primary" eyebrow="Start here">
              Install in one command
            </NavigationMenu.Card>
            <NavigationMenu.Card href="#" icon={<CoinsIcon />} tone="success" eyebrow="New in 0.18">
              Currency Input
            </NavigationMenu.Card>
            <NavigationMenu.Group label="Resources">
              <NavigationMenu.Link href="#" icon={<LayoutTemplateIcon />} description="Whole screens to copy in">
                Templates
              </NavigationMenu.Link>
              <NavigationMenu.Link href="#" icon={<ScrollTextIcon />} description="What changed in each release">
                Changelog
              </NavigationMenu.Link>
              <NavigationMenu.Link href="#" icon={<BookOpenIcon />} description="Long reads on how it is built">
                Blog
              </NavigationMenu.Link>
            </NavigationMenu.Group>
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
