# Panelside

Navigation panel that moves the app aside instead of covering it.

```tsx
import { Panelside } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Panelside } from '@/components/ui/panelside';
```

### Anatomy

```tsx
<Panelside>
  <Panelside.Panel>
    <Panelside.Header action={<Panelside.SearchTrigger />} />
    <Panelside.Content>
      <Panelside.Group>
        <Panelside.GroupLabel>…</Panelside.GroupLabel>
        <Panelside.Item>
          <Panelside.ItemIcon>…</Panelside.ItemIcon>
          <Panelside.ItemLabel>…</Panelside.ItemLabel>
          <Panelside.ItemBadge>…</Panelside.ItemBadge>
          <Panelside.ItemActions>…</Panelside.ItemActions>
        </Panelside.Item>
      </Panelside.Group>
    </Panelside.Content>
    <Panelside.Footer>
      <Panelside.Cta />
    </Panelside.Footer>
  </Panelside.Panel>

  <Panelside.Scene>
    <Panelside.Trigger />
    <Panelside.Pages>
      <Panelside.Page />
    </Panelside.Pages>
  </Panelside.Scene>

</Panelside>
```

### Variants

- **size** — `default` *(default)*, `sm`

### Parts

- `Panelside.Panel` — The navigation surface, sitting behind the app. It is a column: a sticky header, a scroller, and a footer pinned to the bottom edge.
- `Panelside.Header` — The panel's title row, and anything below it that should not scroll. It clears the status bar itself, because the panel draws behind it. `action` takes a single element at the trailing end — the search button goes there. It paints nothing behind itself; `surface` is for a header you have positioned over the list yourself.
- `Panelside.Search` — The inline filter field, for a docked panel on a tablet, where there is width for a field and no keyboard covering half the screen. On a phone, use `Panelside.SearchTrigger` instead. It reports what was typed and nothing else, so your app decides what the query matches.
- `Panelside.Content` — The scrolling middle. It leaves room at the end for a floating footer, measured rather than assumed.
- `Panelside.Group` — A run of related rows. Groups are the unit of spacing, so an empty one costs nothing to render conditionally.
- `Panelside.GroupLabel` — The heading over a group — “Starred”, “Recents”, “Today”. Announced as a heading.
- `Panelside.Item` — One destination or one conversation: a leading icon, a label truncated to a line, an optional badge, and an active state. Fill it either way — `icon`, `label` and `badge` are the shorthand for the row every panel has, and the parts below are for everything else. `size="sm"` tightens the padding for a panel that has to show more history at once.
- `Panelside.ItemIcon` — The leading slot, written out. Whatever is inside takes the row's own tint, so an icon does not need a colour that stops being right the moment the row goes active.
- `Panelside.ItemLabel` — The row's text, written out. It takes the flexible middle, so a long title truncates instead of pushing the badge and the action off the end of the panel.
- `Panelside.ItemBadge` — The trailing count or status, written out. Text becomes a pill; anything else is drawn as given, so a dot or a chip needs no opting out.
- `Panelside.Action` — The trailing control on a row — rename, delete, the overflow menu. It takes its target back as touch slop rather than as layout, so it stays small next to a row-sized target, and its press does not reach the row underneath. For the common case of a menu behind it, use `Panelside.ItemActions`, which is this button with one already on it. Leave it off unless the row has an action worth a permanent glyph: a column of them down the side of a history list is a control on every row and a reason on none.
- `Panelside.ItemActions` — A row's actions, behind an overflow button at the end of it. Give it `Menu.Item` rows and it draws the button, the menu and the dismissal. The menu is anchored to the button rather than presented from the bottom of the screen, so it lines up with the row it belongs to and the list stays readable behind it — `placement`, `align` and `contentProps` move it, and `minWidth` is the floor that stops a menu of one-word verbs sizing itself down to a column of icons.
- `Panelside.Footer` — The bar across the bottom of the panel — the compose button at one end, an account control at the other. It floats over the list and paints nothing behind itself, so the history runs underneath it and the panel reads as one surface with two things on it. `surface="fade"` dissolves the list into the panel just above the controls, for a panel whose history is long enough that something is always under them; `surface="solid"` is the band with an edge, which `floating={false}` implies.
- `Panelside.Cta` — The compose button. A pill rather than a rectangle, because it is the one control in the panel that is not a list row — 44pt by default, a step above the account button beside it so the footer reads as one primary control and one secondary one, and `size="lg"` for the 52pt one. Takes `native` to hand it to the platform, and `glass` to have the platform draw it in Liquid Glass.
- `Panelside.Scene` — Your app. This is the half that moves, and naming it is the whole contract — everything inside it travels, rounds and dims together. It also draws a hairline along its edge as it goes, since two surfaces of the same colour meeting at a corner need something to say they are separate. `scale`, `radius` and `dim` are its numbers, and it takes the root's as defaults for all three.
- `Panelside.Pages` — The pages the panel navigates between. Put it inside `Panelside.Scene` and give each page a `value` that a row's `to` matches; the panel holds the route, so nothing is wired between the two. A page is mounted the first time it is visited and stays mounted after that, hidden rather than removed, which is what makes going back to one instant.
- `Panelside.Page` — One page. `value` is what a row's `to` has to equal for it to be the one shown. `keepAlive={false}` tears it down on the way out instead — for a page whose contents go stale, or whose data costs more to hold than to fetch again.
- `Panelside.Trigger` — Opens and closes the panel. Wraps a control of your own, or draws a plain one. It renders nothing at all when the panel is docked, since there would be nothing to toggle.
- `Panelside.SearchTrigger` — The search button. Goes in `Panelside.Header`'s `action` slot, and draws the control and nothing else — a circle, or the platform's own button under `native`, with the magnifier already in it. What pressing it opens is `onPress`'s to decide.

### Props

#### `PanelsideProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | **required** | — |
| `open` | `boolean` | — | Open state, when you want to own it. Pair with `onOpenChange`. |
| `onOpenChange` | `(open: boolean) => void` | — | Called with the next open state, whether a gesture or you caused it. |
| `defaultOpen` | `boolean` | `false` | Open state to start at when you are not controlling it. |
| `mode` | `PanelsideMode` | `push` | How the two layers relate. `push` moves the scene aside and curves it, which is the point of this component. `overlay` slides the panel over a scene that stays put — the same navigation, for a screen whose content cannot afford to move. |
| `width` | `number` | — | Panel width in points. Defaults to 80% of the container capped at 360, and to a third of it capped at 320 once docked — an overlay panel gives the width back when it closes and a docked one keeps it, so they are not the same measurement. The caps are what stop a tablet getting a navigation list with a field of whitespace beside it. |
| `dock` | `number \| false` | `false` | Container width at or above which the panel stops being an overlay and becomes a permanent sidebar: laid out beside the scene, always open, with the gesture and the trigger switched off. A docked panel also narrows to a third of the container, capped at 320 — docked, every point it takes is a point the app does not get back. Off by default, and deliberately not a guess — a large phone in landscape is wider than a small tablet in portrait, so no single number is right for every app. Set it high enough that what is left over is still a screen: around 700 is the first width where both halves have room. |
| `swipeEnabled` | `boolean` | `true` | Swipe to open, and drag the scene to close. Default true. |
| `swipeFrom` | `PanelsideSwipeFrom` | `anywhere` | Where a swipe may begin. `anywhere` is the default and the behaviour this pattern is known for — a sideways drag across the app opens the panel from wherever your thumb already was. `edge` narrows it to a strip at the leading screen edge, for a scene that has its own use for a horizontal drag: a carousel, a wide table, a chart you can pan. Anything like that under an `anywhere` panel will fight it, and the panel usually wins. |
| `edgeWidth` | `number` | `48` | How wide the leading-edge strip that starts a swipe is, when `swipeFrom` is `edge`. Default 48 — wider than the system's own edge gestures, because there is no bezel to feel for. Ignored otherwise. |
| `dismissible` | `boolean` | `true` | Tapping the pushed scene, or the Android back button, closes the panel. Default true. |
| `haptics` | `boolean` | `false` | A tick under the finger when a swipe commits to opening or closing. Off by default — needs the optional `expo-haptics`, and is silent without it. It fires on the commit rather than during the drag: the panel following your thumb is already the feedback for the drag, and a tick per frame is what makes a gesture feel broken rather than responsive. |
| `scale` | `number` | — | How far the scene shrinks at full open, as a scale factor. Sets the default for every `Panelside.Scene` underneath; the scene's own prop still wins. Here so the three numbers that describe the curve can be set once where the panel is configured, rather than on a part further down. |
| `radius` | `number` | — | The corner radius the scene reaches at full open, in points. |
| `dim` | `number` | — | How far the scene is dimmed at full open, 0 to 1. |
| `route` | `string` | — | Which page the scene is showing. Controlled; pair it with `onRouteChange`. A route is any string you choose. It is matched against `Panelside.Page`'s `value` and against `Panelside.Item`'s `to`, so a row marks itself as the current destination and the scene swaps to the page without either being wired to the other. |
| `defaultRoute` | `string` | `` | Which page the scene starts on, when the panel is not controlling `route`. |
| `onRouteChange` | `(route: string) => void` | — | Called with the route a row navigated to. |
| `className` | `string` | — | — |

#### `PanelsidePanelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PanelsideHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Rendered as the heading. Omit it and supply your own in `children`. |
| `action` | `ReactNode` | — | A single element pinned to the trailing end of the title row. |
| `surface` | `PanelsideSurface` | `transparent` | What the header paints behind itself. `transparent` is the default and paints nothing, so the header is the panel's own surface with a title on it rather than a bar sitting on top of one. In the panel's normal stacking that is the whole story — the header takes a row and the list starts below it. `fade` and `solid` are for a header the caller has lifted out of that stack — `className="absolute start-0 end-0 top-0"` — so the list runs underneath it. They are the two shapes `Panelside.Footer` offers, drawn the other way up. |
| `children` | `ReactNode` | — | Anything below the title row — a search field, a workspace switcher. |

#### `PanelsideSearchProps`

Extends `TextInputProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `containerClassName` | `string` | — | — |

#### `PanelsideContentProps`

Extends `ScrollViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `contentContainerClassName` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PanelsideGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PanelsideGroupLabelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PanelsideItemProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ReactNode` | — | Leading element — an icon, an avatar, a coloured dot. The shorthand for `Panelside.ItemIcon`. |
| `label` | `string` | `More options` | The row's text, truncated to one line since chat titles run long. The shorthand for `Panelside.ItemLabel`. |
| `to` | `string` | — | The page this row goes to — a `Panelside.Page`'s `value`. Pressing it sets the panel's route, and the row marks itself active while that route is the current one. It also closes the panel, since the thing you just moved to would otherwise be behind the thing you moved from. `active` and `onPress` still win where they are passed, so a row can navigate and do something else as well. |
| `closeOnNavigate` | `boolean` | `true` | Leave the panel open after navigating. Off by default. |
| `active` | `boolean` | — | Marks the row as the current destination. Derived from `to` when given. |
| `badge` | `ReactNode` | — | Trailing count or status. A number or string renders as a pill; anything else renders as given. The shorthand for `Panelside.ItemBadge`. |
| `disabled` | `boolean` | `false` | — |
| `size` | `PanelsideItemSize` | `default` | Row density. `sm` tightens the padding for a panel that has to show more history at once, without touching the type size — a list you can read is worth more than two extra rows. |
| `children` | `ReactNode` | — | The row's contents, written out: `Panelside.ItemIcon`, `Panelside.ItemLabel`, `Panelside.ItemBadge` and `Panelside.Action`, in whatever order the row wants them. Anything else you draw works too. Children and the shorthand props compose — a row can take its label from `label` and still write a trailing `Panelside.Action` as a child. |

#### `PanelsideItemIconProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PanelsideItemLabelProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PanelsideItemBadgeProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `PanelsideActionProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | `More options` | What a screen reader announces. The default control is an unlabelled glyph, so this is the only description it has. |
| `children` | `ReactNode` | — | Replaces the default overflow glyph. |

#### `PanelsideItemActionsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | `More options` | What a screen reader announces for the button. The control is an unlabelled glyph, so this is the only description it has. |
| `icon` | `ReactNode` | — | Replaces the default overflow glyph. |
| `placement` | `MenuContentProps['placement']` | `bottom` | Where the panel opens relative to the button. Defaults to below it. |
| `align` | `MenuContentProps['align']` | `end` | How it lines up on that edge. Defaults to the button's trailing edge. |
| `minWidth` | `number` | `220` | Floor for the menu's width. A panel sized to its contents takes its width from whatever inside it is not flexible — in a row of a flexible label and a fixed glyph, that is the glyph, and the menu comes up as a column of icons with the words squeezed out of it. |
| `contentProps` | `Omit<MenuContentProps, 'children' \| 'placement' \| 'align' \| 'minWidth'>` | — | Passed through to the panel — `width`, `maxHeight`, `offset` and the rest. |
| `children` | `ReactNode` | — | The rows: `Menu.Item`, `Menu.Separator`, `Menu.Label`. |

#### `PanelsideFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `floating` | `boolean` | `true` | Overlay the scrolling list instead of taking a row below it. Default true — the list runs the full height of the panel behind it, and `Panelside.Content` leaves exactly this footer's height of room at the end. |
| `surface` | `PanelsideSurface` | `transparent` | What the footer paints behind its controls. `transparent` is the default and paints nothing: the list runs under the controls, which is how the panel reads as one surface with two things floating on it rather than as a list with a bar bolted to the bottom. `fade` dissolves the list into the panel background over the strip above the controls. It costs a band of the panel, and buys a compose button that never has a chat title running through its label — worth turning on for a panel whose history is long enough that something is always underneath. `solid` is a band with a hairline over it, for a footer that is a row of the layout. Implied by `floating={false}`, which has no list to float over. |
| `children` | `ReactNode` | — | — |

#### `PanelsideCtaProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | `More options` | The button's text. |
| `icon` | `ReactNode` | — | Leading element, usually an icon. |
| `variant` | `'primary' \| 'secondary'` | `primary` | `primary` is the filled accent pill; `secondary` is the quiet one. |
| `size` | `PanelsideCtaSize` | `default` | How tall the pill is. `default` is 44pt — a step above the account button beside it, so the footer reads as one primary control and one secondary one. `lg` is 52pt, for a panel where the call to action is the only thing in the row, and `xl` is 56pt. Ignored under `native` — the platform sizes its own button, and asks for a control size rather than a height. The three steps reach the platform's regular, large and extra-large controls. |
| `native` | `boolean` | `false` | Render the platform's own button instead of the pill. Requires the optional `@expo/ui` package; without it this prop does nothing. **Theme tokens do not apply** — the platform draws the button, so `className` and `icon` are ignored and it sizes itself to `label`. |
| `glass` | `boolean` | `false` | Draw the native button in the platform's Liquid Glass material. Requires `native`, and iOS 26 or later; ignored anywhere else. |
| `children` | `ReactNode` | — | — |

#### `PanelsideSceneProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `scale` | `number` | — | How small the scene gets at full travel. Default 1 — the screen keeps its full height and stays behind the status bar, and the radius and dim do the work. Below one it shrinks about its centre, which insets it top and bottom as well as at the side. Falls back to the same prop on the `Panelside` root, so the three numbers that describe the curve can be set once where the panel is configured. |
| `radius` | `number` | — | The corner radius the scene reaches at full travel. Default 44. |
| `dim` | `number` | — | How far the scene dims at full travel, 0 to 1. Default 0.45. |
| `scrimClassName` | `string` | — | Styles the layer that dims the scene. Its opacity is `dim`'s to set, so this is for the colour — a scrim that is not black, for a light theme where black at 45% reads as a hole rather than as shade. |
| `children` | `ReactNode` | — | — |

#### `PanelsidePagesProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | `Panelside.Page` elements. Anything else is rendered as given. |

#### `PanelsidePageProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | What a row's `to` has to equal for this page to be the one shown. |
| `keepAlive` | `boolean` | — | Keep the page mounted once it has been visited. Default true, which is what makes going back to it instant. Off, it is torn down on the way out and rebuilt on the way in. |
| `hidden` | `boolean` | `false` | Set by `Panelside.Pages`. A hidden page is laid out by nobody, is not in the accessibility tree, and takes no touches — but it is still mounted, which is the whole point of it. |
| `children` | `ReactNode` | — | — |

#### `PanelsideTriggerProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | `More options` | What a screen reader announces. |
| `children` | `ReactElement<{ onPress?: (...args: unknown[]) => void }>` | — | A single pressable element to use instead of the default button. Its own `onPress` still runs. |

#### `PanelsideSearchTriggerProps`

Extends `Omit<PressableProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | `More options` | What a screen reader announces. |
| `variant` | `PanelsideControlVariant` | `primary` | `filled` is the default: a circle in the secondary surface, which is what a control sitting alone on the panel's own surface needs to read as one. `outline` is a ring and no fill, for a panel whose other controls are outlined too — a filled circle among them is the only thing on the screen claiming to be a second primary. Ignored under `native`, where the platform owns the button's chrome. |
| `children` | `ReactNode` | — | Replaces the default magnifier. |
| `native` | `boolean` | `false` | Render the platform's own button instead of the circle. Requires the optional `@expo/ui` package; without it this prop does nothing. |
| `glass` | `boolean` | `false` | Draw the native button in the platform's Liquid Glass material. Requires `native`, and iOS 26 or later; ignored anywhere else. |

### Example — Destinations and history

Two groups, because they are two different things. The first is where you can go and never changes; the second is what you have done and changes every session — so only the second carries a label, and only its rows carry an action.

```tsx
<Panelside.Content>
  <Panelside.Group>
    <Panelside.Item icon={<MessageCircleIcon size={20} />} label="Chats" active />
    <Panelside.Item icon={<PackageIcon size={20} />} label="Projects" badge={4} />
  </Panelside.Group>

  <Panelside.Group>
    <Panelside.GroupLabel>Recents</Panelside.GroupLabel>
    {recents.map((chat) => (
      <Panelside.Item key={chat.id} label={chat.title} onPress={() => open(chat.id)}>
        <Panelside.Action label={`Options for ${chat.title}`} onPress={() => menu(chat.id)} />
      </Panelside.Item>
    ))}
  </Panelside.Group>
</Panelside.Content>
```

### Notes

### How far everything travels

One shared value drives both layers, so a half-finished drag is a real halfway state rather than a blend of two snapshots. At progress `p`, with panel width `W` and container width `C`:

```
scale      = 1 - (1 - scale) * p
translateX = p * (W + 12) - C * (1 - scale) / 2
radius     = p * radius
```

`scale` defaults to **1**, so by default the middle term falls away and the scene simply travels. That is deliberate: a scale is applied about the centre, so anything below one insets the screen at the top and the bottom as well as at the side — it lifts away from the status bar and the home indicator, and the strips of panel that appear above and below it are strips of nothing. Full height, with the corner radius and the dim carrying the effect, is what this pattern actually looks like. Only the screen's *content* respects the safe area, and it was already doing that on its own.

Set `scale` below one and the subtraction earns its place. React Native scales about the centre, so a scaled scene has already pulled its leading edge inward before any translation applies — travelling by the panel width alone would leave a gap that grows with the scale, and the panel would look mis-measured.

<Diagram
  src="/diagrams/panelside-scene-dark.webp"
  srcLight="/diagrams/panelside-scene-light.webp"
  alt="Three stages of the transition: closed, dragging and open, with the scene sliding right, scaling to 0.92 and rounding to a 28-point radius as progress runs 0 to 1."
  width={1559}
  height={522}
  caption="Closed, dragging, open — one value, three properties."
/>

### Where a swipe can start

A single pan opens and closes, and by default it listens across the whole surface: a sideways drag anywhere on the app brings the panel in, from wherever your thumb already was. What keeps a list usable underneath it is the pair of thresholds — the drag gives itself up on 12 points of vertical travel and only claims the touch at 14 horizontal, so anything even slightly vertical resolves as a scroll.

`swipeFrom="edge"` narrows the closed-state hit area to `edgeWidth` points at the leading screen edge instead. Reach for it when the scene has its own use for a horizontal drag — a carousel, a wide table, a pannable chart — which would otherwise fight the panel and lose.

```tsx
<Panelside swipeFrom="edge" edgeWidth={64}>…</Panelside>
```

Either way the restriction is a closed-state one. Open, the whole surface drags: the panel is already out, so there is no app underneath left to compete.

<Callout type="warn" title="iOS claims the same edge">
A native stack turns on a back-swipe from the leading screen edge, and it wins over anything JavaScript puts there — so on a screen inside one, the panel's gesture never sees a touch and only the trigger works. Turn the stack gesture off for that screen:

```tsx
<Stack.Screen options={{ gestureEnabled: false }} />
```

Give the screen another way back when you do — Panelside is usually the root of a tab, where there was nothing to go back to anyway.
</Callout>

### Both halves leave the accessibility tree

Being covered says nothing to a screen reader: without help it reads out a navigation list nobody can see, or the app underneath an open panel. Panelside hides whichever half is not in front, so a swipe through the elements only ever reaches what is actually on the screen.

### Search is a place, not a panel

`Panelside.SearchTrigger` draws the search button and reports the press. It goes in
`Panelside.Header`'s `action` slot, it takes `native` and `glass` so the control can be the
platform's, and it does nothing else — where search lives is `onPress`'s to decide.

**A field in the header is the obvious answer and the wrong one on a phone.** The panel is most
of the screen and the field is forty points of it, so results have to push the history down a
screen it already fills.

**A surface over the app is the second wrong answer.** Searching your chats is somewhere you go
and stay for a while: you read the list, filter it, type, read it again. A sheet spends all of
that covering the thing it is a list of, and gives the field half a screen to put results in
once the keyboard is up.

So a page. Swap what `Panelside.Scene` renders, or give the scene a `Panelside.Page` and
`navigate` to it.

Put the field at the top with a Cancel beside it. `SearchBar` draws both — pass
`cancel="always"`, and its `onCancel` fires after the field has emptied and dropped focus, which
is the order a page that is about to close wants. The page needs a way out: it is somewhere you
arrive at, look at, and leave, and leaving by the panel button means opening a panel to escape a
search.

Group the results and mark the match. Which section a row is in answers "is this a file or a
conversation", which a mixed list of twelve titles cannot; and highlighting the query inside the
line answers "why is this row in front of me" for a title that contains it once in the middle of
eight words.

Before anything is typed, show recent searches and what was last open. Those are what a search
screen is opened for most of the time, and answering them without a query saves the query.

`Panelside.Search`, the inline field, is still exported. It is the right shape for a docked panel
on a tablet, where there is width for a field and no keyboard covering half the screen.

### What is yours to change

Every part takes `className`. On top of that: `width` and `dock` decide the geometry, `scale`, `radius` and `dim` the curve — settable on the root as defaults for every scene, or per scene — `scrimClassName` the colour of the dim, and `size` on `Panelside.Cta` and `Panelside.Item` the density of the two things in the panel that are not text. `swipeFrom` and `edgeWidth` decide where a swipe may start, and `swipeEnabled` turns it off. `variant` on `Panelside.SearchTrigger` swaps its round control between a fill and a ring, for a panel whose other controls are outlined.

### Reduced motion

Every spring here resolves instantly to its target when the system setting is on. The panel still opens and the scene still ends up in the right place — it just does not travel.

`Panelside.Trigger` composes a supplied trigger `onPress` with opening/closing the panel. With a custom child, the child's own press runs first, then the trigger callback, then the panel toggle; the default button uses the same callback-before-toggle ordering and retains its name, role, classes, and primary handler after other forwarded props.

---

Full page, with every example: https://panelui.dev/docs/ai-components/panelside
