# Fab

The floating action button — one action pinned over the content, with an optional dial of others behind it.

```tsx
import { Fab } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Fab } from '@/components/ui/fab';
```

### Anatomy

```tsx
{/* on its own */}
<Fab icon={…} accessibilityLabel="…" onPress={…} />

{/* or with a dial behind it */}
<Fab.Group icon={…} accessibilityLabel="…">
  <Fab.Action icon={…} label="…" onPress={…} />
  <Fab.Action icon={…} label="…" onPress={…} />
</Fab.Group>

{/* or a menu */}
<Fab.Group layout="menu" icon={…} accessibilityLabel="…">
  <Fab.Action icon={…} label="…" onPress={…} />
</Fab.Group>
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`
- **extended** — `true`, `false` *(default)*
- **variant** — `primary` *(default)*, `secondary`, `surface`, `destructive`
- **disabled** — `true`
- **glass** — `true`

### Parts

- `Fab.Group` — A trigger with actions behind it. It owns the open state, the scrim, and the quarter turn the trigger takes while it is open. `layout` decides what the actions become: a speed dial of round buttons, or one panel of rows.
- `Fab.Action` — One choice behind the trigger. In a dial it is a smaller round button with its label beside it; in a menu it is a row, a label with its glyph on the side the appearance puts it. Pressing one closes the group and then runs the action.

### Props

#### `FabProps`

Extends `Omit<AnimatedPressableProps, 'children' \| 'style' \| 'disabled'>, Omit<FabVariantProps, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ReactNode` | — | The glyph. Sized by you — this is the one thing that should not guess. |
| `children` | `ReactNode` | — | The label, which turns the circle into a stadium. Needs `extended`; a label with nowhere to go is a label that gets clipped by the circle. |
| `extended` | `boolean` | `false` | Spell the action out beside the glyph. |
| `placement` | `FabPlacement` | `bottom-right` | Pin it over the content, in a corner. Left out, it is an ordinary button in the flow — which is what you want inside a `Fab.Group`, or when the screen already has somewhere for it to sit. |
| `offset` | `number` | `16` | Distance from the edges when `placement` is set, in points. |
| `style` | `ViewProps['style']` | — | Placement-aware view style. Press-state styling belongs in `className`. |
| `disabled` | `boolean` | `false` | — |
| `haptics` | `boolean` | `false` | A tick on press. Off by default — needs the optional `expo-haptics`, and is silent without it. |
| `glass` | `boolean` | `false` | Draw it in Liquid Glass — the material iOS 26 uses for its own floating controls — instead of the variant's fill. Every variant takes the plain material, with its glyph in the foreground colour and in red on `destructive`. Pressed, the material swells and brightens the way the platform's own glass controls do. Needs iOS 26 and the optional `expo-glass-effect`. Below that, on Android, on web, or with Reduce Transparency on, it does nothing and the button keeps its ordinary fill. |
| `accessibilityLabel` | `string` | — | Required for an icon-only button. A lone glyph reads out as nothing. |

#### `FabGroupProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ReactNode` | — | The glyph on the trigger. |
| `label` | `string` | — | The trigger's label, if it should be extended while closed. |
| `children` | `ReactNode` | — | `Fab.Action` children, in the order they should unfold. |
| `open` | `boolean` | — | Controlled open state. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `placement` | `FabPlacement` | `bottom-right` | Which corner of the *screen* the whole dial parks in. |
| `offset` | `number` | `16` | Distance from the screen's edges, in points. Add your safe-area inset. |
| `layout` | `FabGroupLayout` | `dial` | What opens out of the trigger. `dial`, the default, is a column of round buttons with their labels beside them. `menu` is one panel of rows — a label with its glyph, on the side the appearance puts it — that springs out of the trigger's corner, the way the platform's own menus do. `native` hands the menu to the platform: SwiftUI on iOS, Jetpack Compose on Android. A native menu is drawn by the platform, so `className` and the theme tokens do not reach it, and the rows take `label` and `systemImage` rather than an `icon` element. `blur` still applies: the scrim behind the menu is ours, so the page recedes the way it does behind the dial and the panel. On iOS the platform owns the menu's open state, so `open` and `onOpenChange` do nothing there. Android's menu is controlled and honours both. Where the platform menu cannot be drawn — on the web, or without `@expo/ui` installed — this falls back to `menu`. |
| `appearance` | `FabMenuAppearance` | `platform` | How a menu is drawn. `platform`, the default, is the shape the platform's own menus take: a hairline between rows and the glyph after the label. `wells` is tighter, with the glyph leading in a tinted well and each row its own pill — a menu the app designed rather than the system. Menu layout only. |
| `iconPlacement` | `FabMenuIconPlacement` | — | Which side of a menu row the glyph sits on. Each appearance has its own default. |
| `menuWidth` | `number` | — | The menu panel's width in points. Each appearance has its own default. |
| `menuRadius` | `number` | — | The menu panel's corner radius in points. Each appearance has its own default. |
| `menuClassName` | `string` | — | Extra classes for the menu panel. |
| `rowClassName` | `string` | — | Extra classes for every menu row. A row's own `className` comes after. |
| `size` | `FabSize` | `md` | — |
| `variant` | `FabVariant` | `primary` | — |
| `disabled` | `boolean` | `false` | — |
| `haptics` | `boolean` | `false` | — |
| `glass` | `boolean` | `false` | Draw the trigger and its actions in Liquid Glass. The same flag as on `Fab`, with the same floor: iOS 26 and `expo-glass-effect`, inert elsewhere. |
| `blur` | `boolean` | `false` | Frost the screen behind the open dial instead of dimming it. |
| `accessibilityLabel` | `string` | — | Required — the trigger is a lone glyph until it is opened. |
| `rotateOnOpen` | `boolean` | `true` | Turn the trigger's glyph a quarter circle while the dial is open. On by default, and it is doing real work when the glyph is a plus: the same mark becomes a cross, which says "this closes now" without a second icon that has to be swapped in. Turn it off for a glyph that means something at one angle only. |

#### `FabActionProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ReactNode` | — | The glyph. |
| `systemImage` | `string` | — | The glyph for a native menu row, as an SF Symbol name. `layout="native"` only, and iOS only — SwiftUI names its symbols rather than taking a view for them, so `icon` cannot cross over. Ignored everywhere else, so a group can carry both and be right on either path. |
| `label` | `string` | — | What it does, beside the glyph. A column of unlabelled circles is a quiz. |
| `onPress` | `() => void` | — | — |
| `disabled` | `boolean` | `false` | — |
| `destructive` | `boolean` | `false` | Draws it in the destructive colour, for the one that removes something. |
| `labelClassName` | `string` | — | Extra classes for the label — the chip in a dial, the row's text in a menu. |

### Example — Over a list

The case it exists for. `placement` pins it to a corner against the nearest positioned ancestor, which on a screen means the screen — so give the content below it enough bottom padding to scroll clear. Nothing here can work out how tall your list is, and a button sitting on the last row forever is the failure people actually hit.

```tsx
<View className="flex-1">
  <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
    {/* …rows… */}
  </ScrollView>

  <Fab
    placement="bottom-right"
    icon={<PlusIcon size={24} />}
    accessibilityLabel="New note"
    haptics
    onPress={compose}
  />
</View>
```

### Notes

### Give it a label

`accessibilityLabel` is not optional in practice. An icon-only button reads out as nothing, and the plus that is obvious to someone looking at it says nothing to someone who is not. `Fab.Action` takes its label from `label`, so it is already covered.

### Dial or menu

`layout` on `Fab.Group` decides what opens. `dial`, the default, is the column of round buttons with labels beside them. `menu` is one panel of rows that grows out of the trigger's corner. A dial reads as a handful of buttons and suits three or four glyphs that stand on their own; a menu reads as a list and suits actions that need their words.

A menu has two appearances. `platform` is the system's own shape; `wells` leads with the glyph in a tinted well and makes each row a pill. Either takes `iconPlacement`, `menuWidth`, `menuRadius`, `menuClassName` and `rowClassName`, and a row's own `className` and `labelClassName` come after those.

The menu panel scales in rather than fading in. The material cannot be faded — at zero it stops drawing — and a panel growing out of the button is what says the button opened.

### Write a group in the screen's root container

A `Fab.Group` draws its scrim and its buttons as two absolutely positioned siblings in whatever it is written inside. That parent is what `offset` is measured from and what the scrim covers, so it should be the container that fills the screen.

This is also what makes the dial belong to its screen. Pushing a new screen over this one hides the dial with everything else on it, because it is part of the screen's own view tree rather than lifted above the app.

Add your safe-area inset to `offset` to clear the home indicator.

### Pressing an action closes the dial

Any child of a `Fab.Group` closes it when pressed, including a plain `Fab` used as an action. A menu that stays up after a choice reads as the choice not having registered — and an action that navigates would otherwise leave the dial standing over the screen it navigated to.

The Android back button closes an open dial too, rather than popping the screen behind it.

### The actions are unmounted while the dial is closed

Not hidden. A column kept alive behind the trigger would still be in the accessibility tree, and a screen reader would walk into four buttons nobody can see.

### One spring, not one per action

The whole dial runs off a single spring, and each action works out its own share of it on the UI thread from its index — the stagger is where each one reads the spring, not a delay. There is no chain of timeouts to fall out of step with itself when the dial is closed halfway through opening; closing runs the same value back down, and every action follows it. The spring overshoots a little and settles, so buttons arrive rather than stop.

A glass dial's actions rise out of the trigger, small, and grow into their slots, with each label growing out of its button once it is most of the way there. Inside the group the pieces of glass merge while they overlap, so the trigger reads as dividing into its actions rather than the actions arriving from elsewhere. Nothing fades: the material stops drawing at zero opacity and does not come back.

### The trigger turns rather than swapping

`rotateOnOpen` gives the glyph a quarter circle while the dial is up. That is doing real work when the glyph is a plus: the same mark becomes a cross, so the button says *this closes now* without a second icon to swap in. Turn it off for a glyph that means something at one angle only.

### Glass is a material, not a colour

`glass` is inert where the material cannot be drawn, and it cannot be drawn below iOS 26, on Android, on web, without `expo-glass-effect`, or with Reduce Transparency on. Nothing is faked there: a hand-drawn approximation of a system material is a near-miss on the one platform that has the real thing, and an iOS look pasted onto Android. The button keeps its variant's fill instead.

A disabled glass button dims its glyph and label rather than the material. A faded material stops being one.

### Press behavior composes with the button

`Fab` forwards the ordinary animated Pressable controls such as `hitSlop`, `onLongPress`, `pressOpacity`, and the native press event passed to `onPress`. Its button role, disabled state, haptic tick, and primary press handler remain owned by the component. Use `className` for pressed-state styling; `style` remains a placement-aware view style so an absolutely positioned Fab keeps one deterministic anchor.

---

Full page, with every example: https://panelui.dev/docs/components/fab
