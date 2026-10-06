# BottomSheet

Draggable sheet anchored to the bottom of the screen.

```tsx
import { BottomSheet } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { BottomSheet } from '@/components/ui/bottom-sheet';
```

### Anatomy

```tsx
<BottomSheet>
  <BottomSheet.Trigger>…</BottomSheet.Trigger>
  <BottomSheet.Content>
    <BottomSheet.Header title="…" />   {/* stays put, and clears the close button */}
    <BottomSheet.Body>…</BottomSheet.Body>     {/* scrolls */}
    <BottomSheet.Footer>…</BottomSheet.Footer> {/* pinned */}
  </BottomSheet.Content>
</BottomSheet>
```

### Variants

- **detached** — `false` *(default)*, `true`

### Parts

- `BottomSheet.Trigger` — Clones its child and opens the sheet on press.
- `BottomSheet.Content` — The sheet surface. Renders through a portal above everything else.
- `BottomSheet.Header` — A heading that stays put while the body scrolls. Reserves the corner the close button sits in.
- `BottomSheet.Body` — The scrolling part. Hands the sheet its scroll position, which is what lets the two gestures share a drag.
- `BottomSheet.Footer` — A row pinned below the body, for the action the sheet is asking about.

### Props

#### `BottomSheetProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | **required** | — |
| `open` | `boolean` | — | — |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `defaultOpen` | `boolean` | `false` | — |
| `native` | `boolean` | — | Present the platform's own sheet instead of this one, so it gets the system's detents, scroll interaction and dismiss gesture. Requires the optional `@expo/ui` package; without it this prop does nothing. **Theme tokens do not apply to the sheet chrome** — the platform draws the container, so `BottomSheet.Content`'s `className` and its drag handle are ignored. The content inside is still yours. |
| `snapPoints` | `('half' \| 'full' \| { fraction: number } \| { height: number })[]` | — | Heights the native sheet can rest at. Omit to size to the content. `{ fraction }` and `{ height }` are iOS-only; Android snaps them to the nearest of `half` / `full`. |
| `nativeBackground` | `boolean \| string` | — | Paint the native sheet a solid colour instead of the material the platform draws it in by default. The platform's sheet is translucent — on iOS 26 that is Liquid Glass — and what is behind it shows through. That is right for a sheet laid over content worth glimpsing and wrong for one that is a surface of the app's own, where the app's ground shifting under it reads as a mistake. `true` uses the theme's popover surface, so the sheet matches the rest of the app in both schemes. A string paints that colour exactly. It only reaches the platform's sheet, so it does nothing without `native`. On iOS below 16.4 the sheet keeps its material. |

#### `BottomSheetContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `dismissible` | `boolean` | `true` | Whether the reader can close the sheet themselves — by tapping the backdrop, dragging it down, or pressing back on Android. Default true. Off, only your own controls close it. On the native sheet this also stops the drag on iOS, which is what a sheet whose content takes drags needs. |
| `showClose` | `boolean` | `true` | Show a close button in the top trailing corner — the right in a left-to-right app, the left in a right-to-left one. On by default for the styled sheet; ignored by the native sheet, which has its own dismiss affordances. |
| `showGrabber` | `boolean` | `true` | Show the drag handle at the top of the sheet. On by default, because a sheet that can be dragged should say so. Turn it off when the sheet draws its own — a component wrapping this one to give the surface a material of its own has to put the handle on that material, and a handle floating above it belongs to nothing. On the native sheet it hides the platform's grabber on iOS. |
| `detached` | `boolean` | `false` | Float the sheet clear of the screen edges instead of docking it to the bottom, so it reads as a card laid over the app rather than a drawer pulled out of it. All four corners round and the bottom border comes back, since a floating sheet has four real edges where a docked one has three. On Android it floats above the navigation bar, so the system buttons stay uncovered. Ignored by the native sheet, which the platform positions itself. |
| `blur` | `boolean` | `false` | Frost the screen behind the sheet instead of dimming it, so what is behind stays legible as shape and colour while losing its detail. Needs the optional `expo-blur`; without it this dims, rather than failing. Someone who has Reduce Transparency switched on gets an opaque backdrop instead, which is the whole point of the setting. |
| `size` | `'auto' \| 'half' \| 'full'` | `auto` | How tall the sheet opens. `auto` sizes to the content, which is right for a sheet that is a handful of rows. It stops short of the status bar, and a `Body` inside it scrolls once the content is taller than that. `half` and `full` fix the height instead, for content that has to be given the room rather than allowed to ask for it — a list, a form, a document. Either way the sheet is clamped to leave the status bar clear, so `full` is as tall as the screen allows rather than as tall as the screen. On the native sheet this maps onto the platform's detents. |
| `children` | `ReactNode` | — | — |

#### `BottomSheetHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `ReactNode` | — | Heading for the sheet. Strings are wrapped; anything else is drawn as given. |
| `description` | `ReactNode` | — | A line under the title, for what the sheet is asking. |
| `children` | `ReactNode` | — | — |

#### `BottomSheetBodyProps`

Extends `Omit<ComponentProps<typeof Animated.ScrollView>, 'ref'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `overScrollMode` | `'auto' \| 'always' \| 'never'` | — | Android's overscroll effect, drawn when the list is pulled past an end. Off by default: at the top of the list that pull moves the sheet, and the effect would draw the content stretching inside a sheet that is already moving. |
| `children` | `ReactNode` | — | — |

#### `BottomSheetFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — Uncontrolled, with a trigger

`BottomSheet.Trigger` clones its child and adds the press handler, so any pressable works as the trigger.

```tsx
<BottomSheet>
  <BottomSheet.Trigger>
    <Button variant="outline">Share</Button>
  </BottomSheet.Trigger>
  <BottomSheet.Content>
    <Text size="lg" weight="semibold" className="mb-3">Share this page</Text>
    <Input placeholder="https://panelui.dev/p/xK2f9" />
    <Button className="mt-3">Copy link</Button>
  </BottomSheet.Content>
</BottomSheet>
```

### Notes

Control it with `open` / `onOpenChange`, or leave it uncontrolled with `defaultOpen`.

### Detached and docked

A docked sheet is continuous with the bottom of the screen — three real edges, and no line along a fourth that is not there. `detached` lifts it clear of all four instead, so it reads as a card laid over the app rather than a drawer pulled out of it: every corner rounds and the bottom border comes back. The gap it leaves already clears the home indicator, so it takes plain padding rather than stacking the safe-area inset on top of the margin.

### How tall the sheet is

`size` decides. `auto`, the default, sizes to the content, which is right for a sheet of a handful of rows. `half` and `full` fix the height instead, for content that has to be given the room rather than allowed to ask for it — a list, a form, a document.

Either way the sheet is clamped to leave the status bar and the notch clear, so `full` is as tall as the screen allows rather than as tall as the screen. It is not the whole screen by design: a sheet reaching the top has nothing behind it to read as laid *over*, and the gap is what says the app is still there underneath.

On the native sheet `size` maps onto the platform’s own detents, so it keeps the system’s snapping. An explicit `snapPoints` on the root is the finer control and wins.

### Scrolling inside a sheet

Use `BottomSheet.Body` rather than a bare `ScrollView`. Both gestures want the same downward drag, and with no relationship between them whichever activates first takes the touch outright — so either the list never scrolls or the sheet never drags. `Body` reports its scroll position to the sheet, which holds off until the list has run out: pull down on a list at its top and the sheet comes with you, pull down anywhere else and the list scrolls.

While the sheet has the drag, the list holds still, and an upward drag over the list always scrolls it rather than lifting the sheet. `Body` also turns off Android's overscroll effect by default, because at the top of the list that pull moves the sheet; pass `overScrollMode` to bring it back.

### The backdrop

The screen behind dims by default. `blur` frosts it instead, which keeps what is behind legible as shape and colour while losing its detail. It needs the optional `expo-blur`; without it the sheet dims, rather than failing — a blur you cannot draw is better shown as a darkened screen than as a crash.

### Native rendering

Pass `native` to render the platform's own sheet instead — SwiftUI on iOS, Jetpack Compose on Android. It needs the optional `@expo/ui` package and is a silent no-op without it.

**Theme tokens do not apply in native mode**: the platform draws the control with its own colours and metrics, so `className` and most styling props are ignored. Only the chrome is the platform's — the content inside stays yours and stays themed. Adds a `snapPoints` prop for the detents the sheet rests at.

See [Native rendering](/docs/native) for the full prop-by-prop breakdown.

### The native sheet's surface

The platform draws its sheet in a translucent material — on iOS 26 that is
Liquid Glass — and what is behind it shows through. That is right for a sheet
laid over content worth glimpsing, and wrong for one that is a surface of the
app's own, where the ground shifting under it reads as a mistake.

`nativeBackground` paints it solid instead. `true` uses the theme's popover
surface, so the sheet matches the rest of the app in both schemes; a string
paints that colour exactly.

It reaches the sheet's own chrome — the grabber's strip at the top and the
safe-area inset at the bottom — which a background on the content stops short
of. It needs `native`, since only the platform's sheet has a material to drop,
and on iOS below 16.4 the sheet keeps that material.

**A close button sits in the top-right by default.** Drop it with `showClose={false}` when the sheet is already dismissible by drag or backdrop and the corner X would be clutter. The native sheet ignores it — the platform provides its own affordances.

It is drawn above the content, so anything full-width at the top of a sheet passes underneath it rather than over it. `BottomSheet.Header` already leaves the corner free; a heading written by hand should keep clear of it too.

In native mode the sheet content is given a minimum height matching its first detent. A hosted box shorter than the sheet is centred in it by the platform, which is why short content would otherwise float in the middle of a half-height sheet instead of starting at the top.

### Focus after closing

On the web, closing returns keyboard focus to the element that had it before the overlay opened. Nested overlays return to the still-open parent first. If that element was removed or disabled while the overlay was open, it is skipped rather than focusing a stale control. Native screen-reader containment remains the platform's `accessibilityViewIsModal` behaviour.

### Closing, and opening again straight away

The sheet stays in the tree until its own exit animation has put it away, then
unmounts from that animation's completion. Reopening while it is still leaving
catches the same sheet on its way down rather than starting a second one over
it, so a close followed immediately by an open is one continuous movement.

A `native` sheet is the platform's to present, and the platform will not present
one while the previous is still dismissing — it drops the request rather than
queueing it. A present that arrives during a dismissal is therefore held and
made again once the platform reports the old sheet has gone.

---

Full page, with every example: https://panelui.dev/docs/components/bottom-sheet
