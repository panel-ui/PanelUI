# Nav Rail

A collapsible sidebar of destinations that keeps one active pill sliding between rows, and folds to a column of icons with tooltips.

```tsx
import { NavRail } from "@/components/panelui/nav-rail"
```

From npm the path is `panelui-web/nav-rail`. Install with `npx shadcn@latest add @panelui/nav-rail`.

## When to use it

Use it for the destinations of a product that should stay visible while the work beside them changes: the sections of a studio, the parts of an editor, the pages of an account. It is a `<nav>` landmark, so there is one per set of destinations and its `aria-label` says which set.

The active row has two weights. `variant="tonal"` (the default) keeps it as a quiet primary tint with a short accent bar, which suits a rail that is on screen all the time. `variant="solid"` fills it with the primary colour, the weight [Tabs](/docs/web/components/tabs) and [Toolbar](/docs/web/components/toolbar) give the item they have chosen.

It folds for a narrow window or a screen that needs the room, and folding is always the app's decision. A stand-alone rail never picks a width from the viewport itself, so the rail cannot be the cause of a jump after hydration. If you drive `collapsed` from a client-only source such as a media query or stored preference, pass the same value on the server when the first paint matters; `collapsed` and `onCollapsedChange` are how the app holds that state. A provider-backed rail reads the viewport for one thing — the breakpoint where it becomes a drawer — so the server draws the wide layout and a narrow client swaps in the drawer after hydration.

When the destinations are peers that swap one panel, use [Tabs](/docs/web/components/tabs). When they lead to other pages, a rail gives every page a permanent place and a visible current one.

It can also hold one level of hierarchy: a destination with a child list, expanded inline while the rail is open and shown as a flyout beside it when the rail is folded. That is the shape of a file explorer, a project tree or settings with sub-pages. Deeper trees are the app’s own component rather than another `NavRail.Sub`.

The rail can also be the side of a whole screen rather than a panel inside one. Wrap it and the page beside it in `NavRail.Provider`; the provider owns the fold, so a `NavRail.Trigger` in the page's own header controls the same state as the one in the rail, <kbd>⌘B</kbd> / <kbd>Ctrl+B</kbd> works from anywhere outside a field, and `storageKey` remembers the choice. Below `mobileBreakpoint` the rail becomes a drawer.

## Usage

```tsx
<NavRail.Provider defaultCollapsed={false} shortcutKey="b" storageKey="studio-rail">
  <div className="flex min-h-svh">
    <NavRail aria-label="Main">
      <NavRail.Header>
        <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
        <NavRail.Trigger />
      </NavRail.Header>

      <NavRail.Content>
        <NavRail.Group label="Workspace">
          <NavRail.Item href="/" active icon={<HomeIcon />}>
            Overview
          </NavRail.Item>
          <NavRail.Item href="/inbox" icon={<InboxIcon />}>
            Inbox <NavRail.Badge>12</NavRail.Badge>
          </NavRail.Item>
        </NavRail.Group>
      </NavRail.Content>

      <NavRail.Footer>
        <NavRail.Item href="/settings" icon={<SettingsIcon />}>
          Settings
        </NavRail.Item>
      </NavRail.Footer>

      <NavRail.Rail />
    </NavRail>

    <NavRail.Inset>
      <header className="flex items-center gap-2 border-b p-3">
        <NavRail.Trigger />
        <span>Meridian</span>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-5">{children}</main>
    </NavRail.Inset>
  </div>
</NavRail.Provider>
```

## Parts

```tsx
<NavRail.Provider>
  <NavRail>
    <NavRail.Header>
      <NavRail.Brand />
      <NavRail.Trigger />
    </NavRail.Header>
    <NavRail.Content>
      <NavRail.Group>
        <NavRail.Item>
          <NavRail.Badge />
          <NavRail.Sub>
            <NavRail.Item />
          </NavRail.Sub>
        </NavRail.Item>
      </NavRail.Group>
      <NavRail.Separator />
    </NavRail.Content>
    <NavRail.Footer />
    <NavRail.Rail />
  </NavRail>
  <NavRail.Inset />
</NavRail.Provider>
```

- `NavRail.Provider` — Holds the fold for a whole screen, so a trigger in the page's own header and the one in the rail never disagree. It also owns the keyboard shortcut, the saved preference and the width at which the rail becomes a drawer. Optional: a stand-alone `NavRail` holds its own state, while a rail inside a provider reads the provider's and ignores its own `collapsed` props.
- `NavRail.Header` — The strip across the top of the rail, where a brand and the trigger usually sit. It stays against the top while the destinations scroll. It becomes a column when the rail folds so the mark and the trigger each get their square.
- `NavRail.Content` — The destinations between the header and the footer. The rail scrolls when they outgrow it, and the footer stays at the floor. Groups belong here.
- `NavRail.Brand` — The product's mark and name. `icon` is the mark and is what remains when the rail folds; the children are the name. Give it an `href` to make it a link, and a `label` when the children are not plain text so the folded mark still has a name.
- `NavRail.Trigger` — The button that folds and unfolds the rail, or opens the drawer on a phone. It says what pressing it will do and reports the state with `aria-expanded`; pass `expandLabel` or `collapseLabel` to word it differently, or children to draw your own icon.
- `NavRail.Rail` — A thin grab handle down the rail's outer edge. Clicking it folds the rail. It is a pointer affordance and stays out of the tab order, where the trigger already does the job.
- `NavRail.Inset` — The page beside the rail: the surface the work sits on. It fills the rest of the shell and keeps its own scroll, so the rail never slides away with the page.
- `NavRail.Group` — A set of destinations under one `label`: the workspace, the account, the things you can do to it. Open, the label is a small uppercase heading; folded, it becomes a divider and stays the group's accessible name.
- `NavRail.Item` — One destination. It is an anchor with `href` and a button without one. `active` sets `aria-current="page"` and moves the pill onto it, in the weight the rail's `variant` asks for; `icon` sits before the children, which are the label. A `NavRail.Badge` child shows a count and becomes a dot when folded. `disabled` keeps it from being chosen and the arrow keys step over it. A `NavRail.Sub` child makes the row a parent: with an `href` it stays a link to its own page and a disclosure button beside it opens the list; without one the row itself is the disclosure.
- `NavRail.Sub` — The child list under a destination: one level of ordinary `NavRail.Item`s, indented inline in the open rail and shown as a flyout beside a folded one. `defaultOpen`, or `open` and `onOpenChange`, holds the disclosure state, separately from whether the rail is folded. Folded, the parent row has no disclosure arrow: hover or focus shows the flyout, and the row reports `aria-expanded` and `aria-controls`. The children are a real `<ul>` of links; pass `heading` to put the parent's mark and name above them, off by default.
- `NavRail.Badge` — A count beside a destination's label: unread, open, waiting. Folded, it becomes a dot on the corner of the icon, and only the first badge is drawn.
- `NavRail.Separator` — A rule between groups of destinations that belong apart, such as the workspace and the account at the bottom.
- `NavRail.Footer` — The bottom of the rail, held against the floor for account, settings, help or a sign-out action. It stays there while the destinations scroll. Items in it take part in the same focus order and the same single pill.

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
| `collapsible` | `NavRailCollapsible` | `'icon'` | What folding does. `icon` keeps a column of icon squares, `offcanvas` takes the rail out of the layout entirely, and `none` keeps it open and ignores the fold entirely. Default `icon`. |
| `side` | `NavRailSide` | `'start'` | Which edge of the shell it sits on, for the rail handle and the drawer. Default `start`. |
| `variant` | `NavRailVariant` | `'tonal'` | How loudly the active row is drawn. `tonal` is a quiet primary tint with an accent bar; `solid` is the primary fill and `primary-foreground` text that Tabs, Toolbar and Inspector use. Default `tonal`. |
| `className` | `string` | — | — |

#### `NavRailProviderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `collapsed` | `boolean` | — | Whether the rail is folded. Pass it with `onCollapsedChange` to hold the state yourself. |
| `defaultCollapsed` | `boolean` | `false` | Whether it starts folded, when the caller does not hold it. Default `false`. |
| `onCollapsedChange` | `(collapsed: boolean) => void` | — | Called when the rail asks to fold or unfold. |
| `shortcutKey` | `string \| false` | `'b'` | The key that folds and unfolds the rail with the command or control modifier, or `false` for no shortcut. Default `'b'`. |
| `storageKey` | `string` | — | Where the folded state is remembered between visits. Off by default. |
| `mobileBreakpoint` | `string` | `'48rem'` | The viewport width below which the rail is a drawer. Default `'48rem'`. |
| `className` | `string` | — | — |

#### `NavRailHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `NavRailContentProps`

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

#### `NavRailRailProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | What the handle is called. Default "Toggle navigation". |
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
| `heading` | `boolean` | `false` | Whether a folded flyout is headed by the parent's mark and name. Off by default: the children are the destination list, and a heading is opt-in. |
| `label` | `string` | — | What a screen reader calls the child list. Defaults to the parent row's name, which is usually the right thing to hear. |
| `className` | `string` | — | — |

#### `NavRailInsetProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
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

`NavRail` is a client component. A Server Component cannot read `NavRail.Provider` off the import, so import each part by name: `NavRailProvider`, `NavRailHeader`, `NavRailContent`, `NavRailBrand`, `NavRailTrigger`, `NavRailRail`, `NavRailInset`, `NavRailGroup`, `NavRailItem`, `NavRailSub`, `NavRailBadge`, `NavRailSeparator`, `NavRailFooter`.

## Notes

#### Nested destinations

`NavRail.Sub` carries one level: a parent `NavRail.Item` and its child `NavRail.Item`s. That is the shape of a file explorer, a project tree or a settings section, and it is deliberately not recursive — a `NavRail.Sub` inside a child list is not supported, and a deeper tree belongs to the app’s own component.

With the rail open, the list unfolds under the parent with a height and opacity transition, indented and marked with a rule so the children read as subordinate. Folded, the same list is a flyout beside the rail: hover or focus the parent to open it, Tab into its links, and press outside to close a pinned one. It is not clipped by the rail. A pointer gets a short pause before the flyout opens, so sweeping down the rail does not flash every branch on the way; focus opens it at once. The parent row stays marked while its flyout is out. Folded, the parent has no disclosure arrow — the icon is the whole row, and hover or focus is enough; Right still opens the list from the keyboard. Pass `heading` on `NavRail.Sub` to put the parent's mark and name above the children; it is off by default. The open state belongs to the sub-list and does not follow the rail’s fold: pass `defaultOpen`, or `open` with `onOpenChange`, on `NavRail.Sub`.

A parent with an active child keeps a quiet secondary marker — its icon tinted primary, or a small dot when it has no icon — while the active child carries `aria-current="page"` and the single pill. When the child is folded away inside a closed list, the parent holds the pill so the rail still shows the current place.

#### The shell

`NavRail.Provider` is optional: without it a rail keeps its own `collapsed` state, which is the shortest way to show one. Inside it, the rail reads the provider's state and ignores its own `collapsed`, `defaultCollapsed` and `onCollapsedChange`, so a `NavRail.Trigger` placed in the page header controls the same fold as the one in the rail. The provider adds three things a stand-alone rail does not have: the keyboard shortcut, the saved preference and the drawer.

`shortcutKey` defaults to `'b'` and is pressed with the command or control modifier. Pass `false` for none. It is ignored while focus is in an input, textarea, select or editable region, so typing the letter still types it. `storageKey` remembers the fold in `localStorage`; the stored value is read after the first paint, so pass `collapsed` when the server already knows the preference. `mobileBreakpoint` defaults to `'48rem'`.

`collapsible` decides what folding means. `icon` (the default) leaves the column of icon squares, `offcanvas` takes the rail out of the layout entirely, and `none` keeps it open and hides the trigger and the handle. `side` puts the handle and the drawer on the start or the end edge.

#### Scrolling

The rail scrolls as one column: the header and the footer stay against their edges and the destinations between them move. Put the groups in `NavRail.Content` to make that region explicit, and a long rail no longer pushes its footer out of the rounded surface. The active pill is positioned in the scrolling content, so it stays on its row when the rail moves.

#### The handle

`NavRail.Rail` is a thin strip down the outer edge that folds the rail when pressed. It is a pointer affordance and is left out of the tab order: the trigger is the control a keyboard reaches, and the arrow keys still walk the destinations.

#### Mobile

Below `mobileBreakpoint` the rail is drawn as a drawer instead of a column, and the page keeps the full width. A trigger outside the rail is what opens it, since the one inside the rail is not on screen until the drawer is. Following a destination or pressing the rail's own trigger closes the drawer; opening a child list does not.

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

Base UI's `useRender` and `mergeProps` for the element each part draws, and React state, refs and effects for the fold and the pill. The drawer is [Sheet](/docs/web/components/sheet), so a rail on a narrow screen inherits its swipe, focus trap and backdrop. There is no headless navigation primitive underneath. Icons are whatever the app passes; the package does not ship an icon set.

#### Server rendering and width

`expandedWidth` and `collapsedWidth` take pixels or any CSS length (default `15rem` and `3.5rem`), and the rail's width is written as a custom property. Measurement happens in a layout effect after mount, inside guards, so a server render draws the rail at the right size with no pill and the first client frame places it before paint.

The provider reads the viewport for one thing only: whether to draw the drawer. The server snapshot is the wide layout, so the HTML a crawler receives is the rail, and the first client frame swaps in the drawer below the breakpoint without a hydration mismatch. Nothing else about the rail depends on the window.

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
  SettingsIcon,
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

export default function NavRailShell() {
  const [active, setActive] = useState('overview');
  const current = ITEMS.find((item) => item.id === active) ?? ITEMS[0]!;

  return (
    <NavRail.Provider defaultCollapsed={false} shortcutKey="b" className="h-[620px] min-h-0">
      <div className="flex h-full w-full gap-2 rounded-2xl border border-border/70 bg-background p-2">
        <NavRail aria-label="Meridian">
          <NavRail.Header>
            <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
            <NavRail.Trigger />
          </NavRail.Header>

          <NavRail.Content>
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

            <NavRail.Group label="Studio">
              <NavRail.Item href="#" icon={<SettingsIcon />} onClick={(event) => event.preventDefault()}>
                Settings
              </NavRail.Item>
            </NavRail.Group>
          </NavRail.Content>

          <NavRail.Footer>
            <NavRail.Separator className="mb-1" />
            <NavRail.Item href="#" icon={<LifeBuoyIcon />} label="Help and support">
              Help and support
            </NavRail.Item>
          </NavRail.Footer>

          <NavRail.Rail />
        </NavRail>

        <NavRail.Inset className="bg-muted/30">
          <header className="flex shrink-0 items-center gap-2 border-b border-border/70 px-4 py-3">
            <NavRail.Trigger />
            <p className="text-sm font-medium">Meridian</p>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
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
              </div>
              <div className="rounded-xl bg-background p-3 ring-1 ring-border/70">
                <p className="text-[11px] font-medium text-muted-foreground">Time saved</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  6.4<span className="ms-1 text-sm font-medium text-muted-foreground">h</span>
                </p>
              </div>
            </div>
          </div>
        </NavRail.Inset>
      </div>
    </NavRail.Provider>
  );
}
```
