# Tabs

Segmented navigation with an animated indicator.

```tsx
import { Tabs } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Tabs } from '@/components/ui/tabs';
```

### Anatomy

```tsx
<Tabs>
  <Tabs.List>
    <Tabs.Trigger value="…">…</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="…">…</Tabs.Content>
</Tabs>
```

### Variants

- **variant** — `segmented` *(default)*, `underline`, `pill`, `expanding`
- **size** — `xs`, `sm`, `md` *(default)*, `lg`, `xl`
- **active** — `true`, `false`
- **disabled** — `true`
- **scrollable** — `true`, `false` *(default)*

### Parts

- `Tabs.List` — Holds the triggers and the animated indicator. Takes `scrollable` for more tabs than fit.
- `Tabs.Trigger` — One tab, with optional `icon`, `badge` and `disabled`. Must be inside `Tabs.List`.
- `Tabs.Content` — Panel for a tab. Unmounted while inactive unless the root sets `keepMounted`.

### Props

#### `TabsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | — | — |
| `onValueChange` | `(value: string) => void` | — | — |
| `defaultValue` | `string` | **required** | — |
| `variant` | `TabsVariant` | `segmented` | `segmented` is a chip travelling inside a recessed track, `underline` is a rule under the active tab, `pill` is a filled chip on the page. `expanding` is a row of icon pills where only the selected one is open: it widens to let its label out and closes again behind it. For a short row of destinations that are recognisable by their icons, where the labels would otherwise take the whole width to say things nobody rereads. Give every trigger an `icon` — a closed tab has nothing else. |
| `size` | `TabsSize` | `md` | How big the triggers and their labels are. `xs` and `sm` are for a tab set inside something else, such as a card or a toolbar; `lg` and `xl` are for one that is the main navigation of a screen. Icons and badges you pass are not resized. |
| `keepMounted` | `TabsKeepMounted` | `false` | Mount every panel up front instead of only the ones that have been reached, so a scroll position or a half-filled form is there from the start rather than from the first visit. Usually unnecessary. A panel that has been shown once stays mounted for the life of the tab set either way, and with `swipeable` the panels on each side of the active one are mounted before you get to them. What this adds is the panels you have *not* been near — the fourth tab of four — which costs their render at startup and buys nothing until somebody opens them. Turn it on when a panel has to be live while it is off screen: a form that must validate as another tab is edited, a chart that has to be ready to print, a subscription that must not miss a message. |
| `swipeable` | `boolean` | `false` | Move between tabs by dragging sideways on the panels, as well as by pressing the triggers. Off by default, because a panel is allowed to contain something that already wants a horizontal drag — a carousel, a slider, a row that swipes open — and the two cannot both have it. Turn it on for panels of ordinary scrolling content, where it is the gesture people try first. **It changes how the panels are laid out.** They go side by side in a strip that is as wide as all of them, and the tab set shows one panel of it at a time. So the panel on each side of the active one is built and sized before you swipe to it, which is what stops a heavy panel — a virtualised list, a chart — from stalling on the frame it becomes visible. **It needs a height to fill**, the same as any pager: `flex-1` on the tab set, or a fixed height. Without one the strip has no room to lay its panels out in, and a list inside a panel of no height renders no rows. In development the tab set says so rather than rendering nothing. |
| `animation` | `TabsAnimation` | — | Turn the tab set's animations off — the indicator, the strip, and an expanding tab's reveal. For a screen that is already animating something more important, and as a blunt instrument on a device that cannot afford them. The system's own reduce-motion setting is honoured without this. |
| `children` | `ReactNode` | **required** | — |

#### `TabsListProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `indicatorClassName` | `string` | — | Classes for the indicator that slides to the selected tab: the chip in `segmented` and `pill`, the rule in `underline`. Use it to change the indicator's colour, height or radius, for example `bg-primary`. `expanding` has no indicator, so this does nothing there. Style the open tab with `activeClassName` on `Tabs.Trigger` instead. |
| `scrollable` | `boolean` | `false` | Lay the triggers out at their natural widths inside a horizontal scroller instead of splitting the row between them. For more tabs than fit — which a fixed row answers by crushing every label. |
| `children` | `ReactNode` | **required** | — |

#### `TabsTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `activeClassName` | `string` | — | Classes added to the trigger while it is selected. In `expanding`, where the open tab draws its own pill, this is how the pill is recoloured. |
| `labelClassName` | `string` | — | Classes for the label in every state, for example its inactive colour. |
| `activeLabelClassName` | `string` | — | Classes for the label while the tab is selected. Set it with `indicatorClassName` on `Tabs.List` so the text stays readable on the new indicator colour. |
| `value` | `string` | **required** | — |
| `icon` | `ReactNode` | — | Rendered before the label. Required by `variant="expanding"`, where it is the only thing a closed tab has left to identify it by. |
| `badge` | `ReactNode` | — | Rendered after the label — a count, a dot, a status. |
| `disabled` | `boolean` | `false` | Unselectable, dimmed, and announced as disabled. |
| `children` | `ReactNode` | **required** | — |

#### `TabsContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | — |
| `children` | `ReactNode` | **required** | — |

### Example — Uncontrolled

`defaultValue` is required — the tabs need a starting panel.

```tsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="overview">
    <Text>Usage and billing at a glance.</Text>
  </Tabs.Content>
  <Tabs.Content value="activity">
    <Text>Everything that happened this week.</Text>
  </Tabs.Content>
  <Tabs.Content value="settings">
    <Text>Names, members and integrations.</Text>
  </Tabs.Content>
</Tabs>
```

### Notes

### Swiping puts the panels in a row

With `swipeable`, the panels are laid out side by side in a strip as wide as all of them, and the tab set is a window showing one panel of it at a time. Moving between tabs is that strip sliding. A press and a drag do the same thing to it, so they produce the same movement.

The panel on each side of the active one is built before you get to it. That is the point of the arrangement: a panel that is only created when it becomes visible is a panel that stalls at the moment it becomes visible, for as long as it takes to build — and for a virtualised list or a chart, that is long enough to see.

Without `swipeable`, one panel is shown at a time in place, and the panels are neither laid out together nor built ahead.

### A swipeable tab set needs a height

Give it one, the same as any pager:

```tsx
<Tabs swipeable defaultValue="users" className="flex-1">
```

The strip lays its panels out inside the height it is given. Without one there is nothing to lay them out in, and a virtualised list inside a panel of no height renders no rows — the failure looks like the tab set being empty rather than like a missing style. In development the tab set warns when this happens.

If you do not give it a height, the strip is as tall as its tallest panel and every panel stretches to match. That works for panels of ordinary content, and it means switching tabs does not change the tab set's height.

### What a swipe commits on

A drag changes tab on release, not while the finger is down. It commits once the drag has passed a quarter of a panel's width, or once it is moving faster than 500pt/s however short it was. Distance and speed can disagree — a flick back the way it came reads as a cancel — and speed decides.

The gesture takes over after 12pt of sideways travel and gives up on any real vertical travel, so a panel that scrolls still scrolls.

The order swiped through is the order the `Tabs.Content` panels are **written** in. Under RTL the first tab is the rightmost, and a swipe towards the start of the reading direction goes to the previous tab either way.

At the first and last tab the strip still moves, but a sixth as far. A gesture that produces nothing at all is indistinguishable from one that was not received.

### What `keepMounted` is for

A panel that has been shown once stays mounted for the life of the tab set, whether or not this is set. So state that has to survive a *visit* — a scroll position, a half-filled form — survives without it.

`keepMounted` mounts the panels you have not been near, at startup instead of on arrival. Turn it on when a panel has to be live while it is off screen: a form that validates as another tab is edited, a subscription that must not miss a message. It costs those panels' render up front and buys nothing until somebody opens them.

`keepMounted="measured"` was the way to keep a hidden panel's size, back when a kept panel was hidden with `display: none` and so had none. In a swipeable tab set every panel in the strip has a real size already. It still works and means the same as `true`.

### The expanding variant

A row of icon pills where only the selected one is open: it widens to let its label out and closes again behind it. For a short row of destinations recognisable by their icons, where writing every label out spends the whole width on words nobody rereads.

Give **every** trigger an `icon`. A closed tab has nothing else, and one without an icon closes to an empty pill.

There is no travelling indicator here. Every tab draws its own pill, so a shape sliding underneath them would be invisible; the shape that moves is the open tab itself. The open pill sits one step further from the page than the closed ones — lighter in a dark theme, darker in a light one.

The label is never unmounted, only closed over: a row of unlabelled icons gives a screen reader nothing to read, and a label that mounted on selection would have no width to animate from, so the pill would jump to its open size with the text fading in inside it.

### Turning the animations off

`animation="disable-all"` stops the indicator, the strip and the expanding reveal. For a screen already animating something more important, or a device that cannot afford them.

The system's own reduce-motion setting is honoured without it.

---

Full page, with every example: https://panelui.dev/docs/components/tabs
