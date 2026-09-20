# Compare

Two versions of one picture, with a seam you drag across it.

```tsx
import { Compare } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Compare } from '@/components/ui/compare';
```

### Anatomy

```tsx
<Compare>
  <Compare.After />   {/* the whole frame, underneath */}
  <Compare.Before />  {/* the side the seam covers */}
  <Compare.Handle />  {/* the seam, and the accessibility wiring */}
  <Compare.Label />   {/* a caption pinned to one corner */}
</Compare>
```

### Variants

- **orientation** — `horizontal` *(default)*, `vertical`

### Parts

- `Compare.Before` — The side on the near edge of the seam — a window onto the content, sized to the measured frame. Its child is given the frame's size in points rather than a percentage, which is what keeps the image still behind the seam instead of scaling with the window.
- `Compare.After` — The side the seam uncovers as it travels: the whole frame, underneath, never clipped. It decides what the frame looks like at the far end of the travel.
- `Compare.Handle` — The seam: a line across the frame with a knob on it. The knob is a marker rather than the target, since the drag is on the whole frame. It carries the accessibility wiring, because it is the one part of this that is a control.
- `Compare.Label` — A caption pinned to one corner, for saying which side is which. Worth adding where the two versions are not obviously an original and an edit — two dates, two settings, two models.

### Props

#### `CompareProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `height` | `number` | `240` | How tall the frame is, in points. Required in practice rather than in the types: both sides are positioned absolutely, so there is no content left to give the box a height of its own. |
| `value` | `number` | — | Where the seam sits, `0` to `1`. Leave unset to let the frame track it. |
| `defaultValue` | `number` | `0.5` | Where it starts when the frame is tracking it itself. |
| `onValueChange` | `(value: number) => void` | — | Fires while the seam moves, with its new position. |
| `onValueCommit` | `(value: number) => void` | — | Fires once, when the finger is lifted. The one to persist. |
| `orientation` | `CompareOrientation` | `horizontal` | Which way the seam runs. |
| `disabled` | `boolean` | `false` | Freezes the seam where it is and takes it out of the accessibility tree. |
| `step` | `number` | `0.05` | How far one screen-reader increment moves the seam, `0` to `1`. |
| `haptics` | `boolean` | `true` | A tick when the seam reaches either end. |
| `children` | `ReactNode` | — | — |

#### `CompareAfterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CompareBeforeProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `CompareHandleProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `withGrip` | `boolean` | `true` | Hide the two grip bars inside the knob. |
| `accessibilityLabel` | `string` | `Compare` | Spoken name. |
| `children` | `ReactNode` | — | Replaces the knob. The line behind it is kept. |

#### `CompareLabelProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `side` | `'start' \| 'end'` | — | Which side of the frame it sits on. |
| `children` | `ReactNode` | — | — |

### Example — Where the seam starts

`defaultValue` is a share of the frame, `0` to `1`, and the default is the middle so both sides are equally on show. Start it near an edge where one version is the subject and the other is the reference — the reader then drags to reveal rather than to hide.

```tsx
<Compare height={260} defaultValue={0.15}>
  <Compare.After>
    <Image source={edited} style={{ width: '100%', height: '100%' }} />
  </Compare.After>
  <Compare.Before>
    <Image source={original} style={{ width: '100%', height: '100%' }} />
  </Compare.Before>
  <Compare.Handle />
</Compare>
```

### Notes

The drag is the whole frame, not the knob, and it only claims movement along its own axis — so a Compare inside a scrolling page still scrolls. The seam runs on the UI thread and never needs the JS thread to move.

A drag is not available to everyone, so the handle is `adjustable`: a screen reader moves the seam a `step` at a time, which defaults to five percent of the frame. `disabled` freezes it and takes it out of the accessibility tree.

There is a tick when the seam reaches either end, where it stops following the finger — without it the stall reads as the gesture having been dropped. `haptics={false}` turns it off.

Under a right-to-left layout a horizontal drag is mirrored, so dragging towards the start of the line still moves the seam towards the start.

---

Full page, with every example: https://panelui.dev/docs/components/compare
