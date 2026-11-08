# Nav Rail

A collapsible sidebar of destinations that keeps one active pill sliding between rows, and folds to a column of icons with tooltips.

```tsx
import { NavRail } from "@/components/panelui/nav-rail"
```

From npm the path is `panelui-web/nav-rail`. Install with `npx shadcn@latest add @panelui/nav-rail`.

## When to use it

Use it for the destinations of a product that should stay visible while the work beside them changes: the sections of a studio, the parts of an editor, the pages of an account. It is a `<nav>` landmark, so there is one per set of destinations and its `aria-label` says which set.

The active row has two weights. `variant="tonal"` (the default) keeps it as a quiet primary tint with a short accent bar, which suits a rail that is on screen all the time. `variant="solid"` fills it with the primary colour, the weight [Tabs](/docs/web/components/tabs) and [Toolbar](/docs/web/components/toolbar) give the item they have chosen.

It folds for a narrow window or a screen that needs the room, and folding is always the app's decision. The rail never picks a width from the viewport itself, so a server-rendered page cannot jump after hydration. Pass `collapsed` and `onCollapsedChange` and drive it from a media query, a stored preference or a keyboard shortcut.

When the destinations are peers that swap one panel, use [Tabs](/docs/web/components/tabs). When they lead to other pages, a rail gives every page a permanent place and a visible current one.

It can also hold one level of hierarchy: a destination with a child list, expanded inline while the rail is open and shown as a flyout beside it when the rail is folded. That is the shape of a file explorer, a project tree or settings with sub-pages. Deeper trees are the app’s own component rather than another `NavRail.Sub`.

## Usage

```tsx
<NavRail aria-label="Main">
  <NavRail.Header>
    <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
    <NavRail.Trigger />
  </NavRail.Header>

  <NavRail.Group label="Workspace">
    <NavRail.Item href="/" active icon={<HomeIcon />}>
      Overview
    </NavRail.Item>
    <NavRail.Item href="/inbox" icon={<InboxIcon />}>
      Inbox <NavRail.Badge>12</NavRail.Badge>
    </NavRail.Item>
  </NavRail.Group>

  <NavRail.Footer>
    <NavRail.Item href="/settings" icon={<SettingsIcon />}>
      Settings
    </NavRail.Item>
  </NavRail.Footer>
</NavRail>
```

## Parts

```tsx
<NavRail>
  <NavRail.Header>
    <NavRail.Brand />
    <NavRail.Trigger />
  </NavRail.Header>
  <NavRail.Group>
    <NavRail.Item>
      <NavRail.Badge />
      <NavRail.Sub>
        <NavRail.Item />
      </NavRail.Sub>
    </NavRail.Item>
  </NavRail.Group>
  <NavRail.Separator />
  <NavRail.Footer />
</NavRail>
```

- `NavRail.Header` — The strip across the top of the rail, where a brand and the trigger usually sit. It becomes a column when the rail folds so the mark and the trigger each get their square.
- `NavRail.Brand` — The product's mark and name. `icon` is the mark and is what remains when the rail folds; the children are the name. Give it an `href` to make it a link, and a `label` when the children are not plain text so the folded mark still has a name.
- `NavRail.Trigger` — The button that folds and unfolds the rail. It says what pressing it will do and reports the state with `aria-expanded`; pass `expandLabel` or `collapseLabel` to word it differently, or children to draw your own icon.
- `NavRail.Group` — A set of destinations under one `label`: the workspace, the account, the things you can do to it. Open, the label is a small uppercase heading; folded, it becomes a divider and stays the group's accessible name.
- `NavRail.Item` — One destination. It is an anchor with `href` and a button without one. `active` sets `aria-current="page"` and moves the pill onto it, in the weight the rail’s `variant` asks for; `icon` sits before the children, which are the label. A `NavRail.Badge` child shows a count and becomes a dot when folded. `disabled` keeps it from being chosen and the arrow keys step over it. A `NavRail.Sub` child makes the row a parent: with an `href` it stays a link to its own page and a disclosure button beside it opens the list; without one the row itself is the disclosure.
- `NavRail.Sub` — The child list under a destination: one level of ordinary `NavRail.Item`s, indented inline in the open rail and shown as a flyout beside a folded one. `defaultOpen`, or `open` and `onOpenChange`, holds the disclosure state, separately from whether the rail is folded. The children are a real `<ul>` of links, and the parent’s disclosure reports `aria-expanded` and `aria-controls`.
- `NavRail.Badge` — A count beside a destination's label: unread, open, waiting. Folded, it becomes a dot on the corner of the icon, and only the first badge is drawn.
- `NavRail.Separator` — A rule between groups of destinations that belong apart, such as the workspace and the account at the bottom.
- `NavRail.Footer` — The bottom of the rail, held against the floor for account, settings, help or a sign-out action. Items in it take part in the same focus order and the same single pill.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `NavRailProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `collapsed` | `boolean` | — | Whether the rail is folded. Pass it with `onCollapsedChange` to hold the state yourself. |
| `defaultCollapsed` | `boolean` | `false` | Whether it starts folded, when the caller does not hold it. Default `false`. |
| `onCollapsedChange` | `(collapsed: boolean) => void` | — | Called when the rail asks to fold or unfold. |
| `expandedWidth` | `number \| string` | `'15rem'` | Its width open, as pixels or any CSS length. Default `15rem`. |
| `collapsedWidth` | `number \| string` | `'3.5rem'` | Its width folded, as pixels or any CSS length. Default `3.5rem`. |
| `variant` | `NavRailVariant` | `'tonal'` | How loudly the active row is drawn. `tonal` is a quiet primary tint with an accent bar; `solid` is the primary fill and `primary-foreground` text that Tabs, Toolbar and Inspector use. Default `tonal`. |
| `className` | `string` | — | — |

#### `NavRailHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavRailBrandProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `href` | `string` | — | Where it goes. Without it the brand is a plain block rather than a link. |
| `icon` | `ReactNode` | — | The mark beside the name, usually an icon. It is what remains when the rail folds. |
| `label` | `string` | — | What a screen reader calls the brand once the name is folded away. Taken from text children when they are plain text. |
| `className` | `string` | — | — |

#### `NavRailTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `expandLabel` | `string` | `'Expand navigation'` | What it is called when the rail is folded and pressing it opens it. Default "Expand navigation". |
| `collapseLabel` | `string` | `'Collapse navigation'` | What it is called when the rail is open and pressing it folds it. Default "Collapse navigation". |
| `className` | `string` | — | — |

#### `NavRailGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | — | The heading over the group. Open, it is a small uppercase label; folded, it becomes a divider and stays available to a screen reader as the group's name. |
| `className` | `string` | — | — |

#### `NavRailBadgeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavRailItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `href` | `string` | — | Where it goes. With it the row is an anchor; without it, a button. |
| `active` | `boolean` | `false` | Whether this is the page the reader is on. Sets `aria-current="page"` and lights the pill. |
| `disabled` | `boolean` | `false` | Draws the row unavailable: it cannot be chosen, and the arrow keys step over it. |
| `icon` | `ReactNode` | — | The mark before the label: what remains, with the label, when the rail folds. |
| `label` | `string` | — | What a screen reader calls the row once the label is folded away, and what the folded tooltip shows. Taken from text children when they are plain text. |
| `className` | `string` | — | — |

#### `NavRailSubProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether the child list is open. Pass it with `onOpenChange` to hold the state yourself; it is separate from the rail's fold. |
| `defaultOpen` | `boolean` | — | Whether it starts open when the caller does not hold it. Default `false`. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the parent's disclosure asks to open or close the list. |
| `label` | `string` | — | What a screen reader calls the child list. Defaults to the parent row's name, which is usually the right thing to hear. |
| `className` | `string` | — | — |

#### `NavRailSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavRailFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

## In a Server Component

`NavRail` is a client component. A Server Component cannot read `NavRail.Header` off the import, so import each part by name: `NavRailHeader`, `NavRailBrand`, `NavRailTrigger`, `NavRailGroup`, `NavRailItem`, `NavRailSub`, `NavRailBadge`, `NavRailSeparator`, `NavRailFooter`.

## Notes

#### Nested destinations

`NavRail.Sub` carries one level: a parent `NavRail.Item` and its child `NavRail.Item`s. That is the shape of a file explorer, a project tree or a settings section, and it is deliberately not recursive — a `NavRail.Sub` inside a child list is not supported, and a deeper tree belongs to the app’s own component.

With the rail open, the list unfolds under the parent with a height and opacity transition, indented and marked with a rule so the children read as subordinate. Folded, the same list is a flyout beside the rail: hover or focus the parent to open it, Tab into its links, and press outside to close a pinned one. It is not clipped by the rail. The open state belongs to the sub-list and does not follow the rail’s fold: pass `defaultOpen`, or `open` with `onOpenChange`, on `NavRail.Sub`.

A parent with an active child keeps a quiet secondary marker — its icon tinted primary, or a small dot when it has no icon — while the active child carries `aria-current="page"` and the single pill. When the child is folded away inside a closed list, the parent holds the pill so the rail still shows the current place.

#### Two weights

`variant="tonal"` is the default: a primary tint and a short accent bar, quiet enough to sit on screen all day. `variant="solid"` fills the active row with the primary colour and sets its text in `primary-foreground`, the same weight as the chosen item in [Tabs](/docs/web/components/tabs) and [Toolbar](/docs/web/components/toolbar). The choice applies to the open and folded rail together, including the count dot on an active folded row and the active child inside a folded flyout.

#### Keyboard

Every enabled destination is an ordinary tab stop, so Tab walks the rail the way it walks the rest of the page. With focus on a row, Up and Down move between rows and wrap at the ends, stepping over disabled ones; Home and End go to the first and last visible row, skipping children hidden in a closed list. Enter or Space follows the row, whether it is an anchor or a button.

On a parent, Right opens a closed child list and steps into an open one, Left closes the list the row sits in and returns focus to the parent, and Escape closes it from anywhere inside. Folded, the flyout has its own reading order: Up and Down move within it while focus is in the children. A press anywhere outside a pinned flyout closes it.

`NavRail.Trigger` is a button with a name that says what it will do and `aria-expanded` for the state, so it is reachable and understandable from the keyboard alone. Arrow keys work the same folded and open.

#### Reduced motion

With the system set to reduce motion, the pill appears on its destination without travelling, and the rail's width, the labels and the trigger's icon change without transitions. Nothing is lost: the pill is still the thing that says where you are.

#### Accessibility

The root is a `<nav>` landmark, and `aria-label` names it when a page has more than one. The active row carries `aria-current="page"`. Folded, the visible label is `aria-hidden` and the row's name comes from `label`, or from its text children when they are plain text, so an icon-only row is never nameless and a screen reader does not hear the label twice. The folded tooltip is decorative for the same reason. Group headings remain available as the group's name when they are drawn as dividers, and the trigger says "Expand navigation" or "Collapse navigation" rather than only showing an arrow.

A destination with children exposes the disclosure through `aria-expanded` and `aria-controls` — on the row itself when it has no `href`, and on the button beside it when the row is a link. The child list is a real `<ul>` of links named after the parent, not a `menu`, because these are navigation destinations. Out of sight it is `inert`, so its links leave the tab order and the accessibility tree until it is shown. The active child is the current page; the parent is a marker, not a second one.

Counts live inside the row, so an open item is announced with its label and its count. Folded, the count becomes a dot and the row's name is its label; the dot is a visual signal rather than a second name.

#### Built on

Base UI's `useRender` and `mergeProps` for the element each part draws, and React state, refs and effects for the fold and the pill. There is no headless navigation primitive underneath, and no other component in the collection is a dependency. Icons are whatever the app passes; the package does not ship an icon set.

#### Server rendering and width

No width is read from `window` and no collapse is chosen from the viewport. `expandedWidth` and `collapsedWidth` take pixels or any CSS length (default `15rem` and `3.5rem`), and the rail's width is written as a custom property. Measurement happens in a layout effect after mount, inside guards, so a server render draws the rail at the right size with no pill and the first client frame places it before paint.

## Example

```tsx
'use client';

import { useState } from 'react';
import {
  BellIcon,
  CreditCardIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LayersIcon,
  LifeBuoyIcon,
  UsersIcon,
} from 'lucide-react';
import { NavRail } from '@/components/panelui/nav-rail';

const ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon, note: 'This week across the studio.' },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon, count: 12, note: 'Twelve conversations are waiting on you.' },
  { id: 'projects', label: 'Projects', icon: FolderKanbanIcon, count: 4, note: 'Four projects are in review this morning.' },
  { id: 'people', label: 'People', icon: UsersIcon, note: 'Eight collaborators, two invitations out.' },
  { id: 'billing', label: 'Billing', icon: CreditCardIcon, note: 'The studio plan renews on 1 December.' },
];

export default function NavRailOverview() {
  const [active, setActive] = useState('overview');
  const current = ITEMS.find((item) => item.id === active) ?? ITEMS[0]!;

  return (
    <div className="flex h-[380px] w-full max-w-2xl items-stretch gap-2 rounded-2xl border border-border/70 bg-background p-2">
      <NavRail aria-label="Meridian">
        <NavRail.Header>
          <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
          <NavRail.Trigger />
        </NavRail.Header>

        <NavRail.Group label="Workspace">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavRail.Item
                key={item.id}
                href="#"
                active={active === item.id}
                icon={<Icon />}
                onClick={(event) => {
                  event.preventDefault();
                  setActive(item.id);
                }}
              >
                {item.label}
                {item.count ? <NavRail.Badge>{item.count}</NavRail.Badge> : null}
              </NavRail.Item>
            );
          })}
        </NavRail.Group>

        <NavRail.Footer>
          <NavRail.Separator className="mb-1" />
          <NavRail.Item href="#" icon={<LifeBuoyIcon />} label="Help and support">
            Help and support
          </NavRail.Item>
        </NavRail.Footer>
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-muted/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              Thursday, 6 November
            </p>
            <h3 className="mt-1 truncate text-xl font-semibold tracking-[-0.02em]">{current.label}</h3>
          </div>
          <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
            <BellIcon className="size-4" aria-hidden="true" />
            <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
          </span>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">{current.note}</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-background p-3 ring-1 ring-border/70">
            <p className="text-[11px] font-medium text-muted-foreground">Open reviews</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">07</p>
            <div className="mt-2 flex items-end gap-1">
              {[30, 46, 38, 62, 54, 74, 68].map((height, index) => (
                <span
                  key={index}
                  className="w-full rounded-sm bg-primary/25 last:bg-primary"
                  style={{ height: `${height / 4}px` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-background p-3 ring-1 ring-border/70">
            <p className="text-[11px] font-medium text-muted-foreground">Time saved</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              6.4<span className="ms-1 text-sm font-medium text-muted-foreground">h</span>
            </p>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Since the new flow shipped.</p>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-xl bg-background p-3 ring-1 ring-border/70">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
            ID
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Ines Duarte</p>
            <p className="truncate text-[11px] text-muted-foreground">ines@meridian.studio</p>
          </div>
          <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Owner
          </span>
        </div>
      </div>
    </div>
  );
}
```
