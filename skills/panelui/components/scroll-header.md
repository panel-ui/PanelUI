# ScrollHeader

A screen title that hands over to a compact bar as the page scrolls.

```tsx
import { ScrollHeader } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ScrollHeader } from '@/components/ui/scroll-header';
```

### Anatomy

```tsx
<ScrollHeader>
  <ScrollHeader.Bar>          {/* pinned; its surface fades in */}
    <ScrollHeader.Title>…</ScrollHeader.Title>
    <ScrollHeader.Actions>…</ScrollHeader.Actions>
  </ScrollHeader.Bar>

  <ScrollHeader.Cover />      {/* optional; fills the band and stretches with it */}

  <ScrollHeader.Large>        {/* scrolls away; its height is the distance */}
    <ScrollHeader.Title>…</ScrollHeader.Title>
    <ScrollHeader.Description>…</ScrollHeader.Description>
  </ScrollHeader.Large>

  <ScrollView>…</ScrollView>  {/* exactly one scrollable */}
</ScrollHeader>
```

### Variants

- **surface** — `plain` *(default)*, `muted`, `none`, `blur`
- **divider** — `true` *(default)*, `false`

### Parts

- `ScrollHeader.Bar` — The pinned bar. Its contents never move — only its surface fades in, which is what makes the change read as one crossfade rather than two things happening at once. `surface` picks what it is drawn on, `divider` puts a hairline under it, and `surface="blur"` frosts it rather than filling it, so the content passing underneath stays legible as shape and colour.
- `ScrollHeader.Large` — The block that scrolls away. Its measured height is the distance the header collapses over, so it can hold anything and the transition follows. Once the bar has taken over it is faded out, hidden from screen readers, and stops taking touches meant for the content behind it.
- `ScrollHeader.Title` — The screen's title. Write it in both halves: in `Large` it is large and at rest, in `Bar` it is compact and fades in. The part reads which half it is in and styles itself accordingly, so the two are one element written twice rather than two components to keep in step.
- `ScrollHeader.Description` — The quiet line under the title — a count, a byline, a date.
- `ScrollHeader.Actions` — The controls at the trailing end of the bar. They stay put and stay reachable throughout: only the bar's surface and title are part of the transition. A `Badge` aligns to the top of the row rather than its centre, so give it `self-center` where it sits beside a taller control like a button.
- `ScrollHeader.Cover` — A picture or a gradient filling the band. It has no height of its own, so an over-scroll stretches it by laying it out taller rather than by scaling it up — a photograph stretches without going soft. `scrim` washes it down so a title stays legible over a bright picture.

### Props

#### `ScrollHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `barHeight` | `number` | `48` | Height of the pinned bar in points, before the device's top inset. The inset is added on top of this rather than taken out of it, so the bar's contents keep this much room on every device. |
| `threshold` | `number` | `1` | How much of the large block has to leave before the bar has fully taken over, as a fraction of its height. Below 1 the crossing happens early, which suits a tall block whose last few points are not worth waiting for. |
| `snap` | `boolean` | `true` | Settle a part-scrolled band open or closed when the finger lifts, rather than leaving the header half-collapsed. |
| `stretch` | `boolean` | `true` | Let the band grow past its resting height when the scroller is pulled down. A cover fills the band, so this is what stretches it. Off under Reduce Motion. |
| `inset` | `boolean` | `true` | Add the device's top inset above the bar. Off inside a screen that already has one. |
| `onCollapsedChange` | `(collapsed: boolean) => void` | — | Called as the bar takes over, and again when the large block comes back. Fires on the crossing, not on every frame. |
| `progress` | `SharedValue<number>` | — | A shared value to mirror the collapse into, 0 to 1, for animating something outside the header against the same transition. |
| `children` | `ReactNode` | — | The parts, and exactly one scrollable. |

#### `ScrollHeaderBarProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `surface` | `ScrollHeaderSurface` | `plain` | What the bar is drawn on once it has taken over. `none` leaves it clear, for a bar over a cover that should stay visible. `blur` frosts it, so the content passing under the bar stays legible as shape and colour. `blur` needs `expo-blur`, which is optional, and it is replaced by an opaque bar under Reduce Transparency. Both fall back to `plain` — a bar whose title cannot be read is a worse answer than one that is not frosted. |
| `divider` | `boolean` | `true` | A hairline under the bar, drawn with its surface. |
| `intensity` | `number` | `40` | Depth of the frost, on `expo-blur`'s 0–100 scale. Defaults to 40 — heavier than a scrim's, because a scrim covers a whole screen and this is a thin band read against content moving under it. Ignored unless `surface` is `blur`. |
| `material` | `ScrollHeaderMaterial` | `default` | Which way the frost tints. Defaults to the app's theme rather than the device's, so an app running light inside a dark OS frosts light. Ignored unless `surface` is `blur`. |
| `children` | `ReactNode` | — | — |

#### `ScrollHeaderLargeProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `ScrollHeaderActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `ScrollHeaderCoverProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `source` | `ImageSourcePropType` | — | A picture behind the header. Laid out to fill the band, so it stretches with it. |
| `colors` | `[string, string, ...string[]]` | — | The gradient drawn when there is no picture, or under one that has not loaded. Defaults to two of the theme's series tokens, so an app that puts its charts on brand puts this on brand with them. |
| `scrim` | `boolean` | `true` | A wash over the cover, so a title stays legible on a bright picture. |
| `children` | `ReactNode` | — | — |

### Example — A large title over a list

The plain arrangement: a title and a count at rest, and a pinned bar carrying the same title once the list is moving.

```tsx
<ScrollHeader className="flex-1">
  <ScrollHeader.Bar>
    <ScrollHeader.Title>Library</ScrollHeader.Title>
    <ScrollHeader.Actions>
      <Button variant="ghost" size="icon">
        <SearchIcon size={18} />
      </Button>
    </ScrollHeader.Actions>
  </ScrollHeader.Bar>

  <ScrollHeader.Large>
    <ScrollHeader.Title>Library</ScrollHeader.Title>
    <ScrollHeader.Description>128 components</ScrollHeader.Description>
  </ScrollHeader.Large>

  <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
    {components.map((component) => (
      <Item key={component.id} variant="outline">
        <Item.Content>
          <Item.Title>{component.name}</Item.Title>
          <Item.Description>{component.summary}</Item.Description>
        </Item.Content>
      </Item>
    ))}
  </ScrollView>
</ScrollHeader>
```

### Notes

**Give the root a height.** It fills its parent, and inside a container with no height of its own it collapses to nothing. `className="flex-1"` on a screen is the usual answer.

**Exactly one scrollable child.** Anything that is not a `Bar`, a `Large` or a `Cover` is taken to be the scroller, and the first such child wins. A `ScrollView`, a `FlatList` and a `SectionList` all work, and so does an `Animated.ScrollView` or `Animated.FlatList` you have already animated yourself — that one is used as it stands rather than wrapped again.

**An `onScroll` of your own is kept, either kind.** A handler from `useAnimatedScrollHandler` composes onto the header's and stays on the UI thread. A plain function is called across the bridge instead, once for every scroll event the child delivers — which `scrollEventThrottle` decides, and which is every frame at the default of 16 — and receives a `{ nativeEvent }` carrying every field React Native puts on a scroll event, `velocity` and `targetContentOffset` included. What it does not carry is the synthetic wrapper around it, which is a live object with methods on it and cannot cross. Prefer the animated handler where the work can be done in a worklet.

**The content inset is applied for you**, as `paddingTop` on the child's content container, and it is the band's full resting height. Top padding of your own is read off `contentContainerStyle` and added to it, because a style array overrides rather than adds — and you could not write the sum yourself in any case, since the band's height is measured rather than known. A percentage is left out of the sum rather than guessed at, and the inset alone is used.

The two titles are both in the tree the whole time, and only the one being shown is exposed to a screen reader — the other is hidden as the header crosses. Nothing else about the bar is gated: a back button and the `Actions` stay reachable at every scroll position.

`snap` settles a part-scrolled band at whichever end is nearer once the finger lifts and nothing else is going to move it. A fling is left alone, because settling under momentum fights the gesture rather than finishing it.

Under Reduce Motion the band stops growing past its resting height, so an over-scroll no longer stretches the cover. The crossfade itself is scroll-linked rather than autonomous and is left as it is — it moves only as far as the finger does.

With no `Large` block there is no distance to interpolate over, so the bar's surface is timed in over 200ms rather than appearing between one frame and the next. With a block, the hand-over is scroll-linked and moves only as far as the finger does.

On Android the band carries a small elevation so it draws over the scroller, which orders by elevation before z-order. That is also what draws its shadow, so `surface="none"` still lifts very slightly.

**A frosted bar is optional twice over.** `surface="blur"` needs `expo-blur`, which is an optional dependency reached through a lazy require, and Reduce Transparency is a preference that outranks the design. Where either says no the bar draws `plain` instead, so nothing has to be guarded at the call site — but pick the rest of the screen so it still works with a solid bar, because for some readers that is the only bar there is.

---

Full page, with every example: https://panelui.dev/docs/components/scroll-header
