# ImageViewer

An image that opens out of the page over a blur, to zoom into and swipe through.

```tsx
import { ImageViewer } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { ImageViewer } from '@/components/ui/image-viewer';
```

### Anatomy

```tsx
<ImageViewer>
  <ImageViewer.Trigger />
  <ImageViewer.Trigger />
</ImageViewer>
```

### Parts

- `ImageViewer.Trigger` — The thing pressed to open the viewer. It draws `source` to fill its box, or whatever you pass as `children`, and registers the picture as one page of the gallery.

### Props

#### `ImageViewerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `index` | `number` | — | Controlled page — which trigger's image is showing, in page order. |
| `defaultIndex` | `number` | `0` | Initial page when uncontrolled. |
| `onIndexChange` | `(index: number) => void` | — | — |
| `blur` | `boolean` | `true` | Blur the page behind the picture. Needs the optional `expo-blur`, and dims instead without it. Reduce Transparency draws an opaque backdrop. |
| `maxScale` | `number` | `4` | How far a pinch can zoom in, as a multiple of the fitted size. |
| `doubleTapScale` | `number` | `2.5` | Where a double tap zooms to, as a multiple of the fitted size. |
| `haptics` | `boolean` | `true` | Tick as a drag to dismiss begins. Needs the optional `expo-haptics`. |
| `showClose` | `boolean` | `true` | Draw the close button. Tapping outside the picture and dragging it away still close it. |
| `closeLabel` | `string` | `Close` | Read out for the close button. |
| `inset` | `number` | `16` | Space kept between the open picture and the edges of the screen, in points. Measured from the safe area at the top and bottom, and the larger of the two is used for both, so the picture stays centred. `0` fills the screen. |
| `cornerRadius` | `number` | `16` | Corner radius of the open picture, in points. The corners stay this size on screen while the picture is zoomed or dragged. `0` squares them. |

#### `ImageViewerTriggerProps`

Extends `Omit<PressableProps, 'children' \| 'style' \| 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes on the pressable. Without `children` the image fills it, so give it a size — `h-48 w-full`, `aspect-square flex-1`. |
| `source` | `ImageSourcePropType` | **required** | The picture. Shown in the page and, until `fullSource` loads, in the viewer. |
| `fullSource` | `ImageSourcePropType` | — | A larger copy to show once the viewer is open. It loads when the viewer opens and replaces `source` when it arrives, so a feed can carry thumbnails. |
| `alt` | `string` | — | Described for a screen reader, on the trigger and in the viewer. |
| `caption` | `ReactNode` | — | Shown under the picture while it is open. A string is set as text. |
| `index` | `number` | — | Page order within the root. Render order when left out. |
| `radius` | `number` | `0` | The corner radius the picture has in the page, in points, so the flight starts from the same shape. Match it to the `rounded-*` class you gave the trigger — a class cannot be read back. |
| `width` | `number` | — | The image's own width and height, when known. Saves looking it up, and is the only way the viewer knows the proportions before a remote image loads. |
| `height` | `number` | — | — |
| `disabled` | `boolean` | `false` | Nothing opens, and the press is not reported. |
| `children` | `ReactNode` | — | Draw the picture yourself — a `Post.Media`, a card. It should show `source` cropped to fill, the way the viewer's own flight starts. Left out, the trigger draws `source` to fill its box. |

### Example — One image

The trigger draws the image cropped to fill its box, so it needs a size. `radius` matches `rounded-2xl`, which is 16 points.

```tsx
<ImageViewer>
  <ImageViewer.Trigger
    source={{ uri: photo }}
    alt="A harbour at dusk"
    radius={16}
    className="h-56 w-full rounded-2xl"
  />
</ImageViewer>
```

### Notes

Zooming and paging do not mix: a zoomed picture pans inside its own edges, and the page only turns once it is back at its fitted size. Double-tap to get there quickly.

The open picture keeps `inset` points clear of the screen edges — measured from the safe area at the top and bottom — and is rounded to `cornerRadius`, so the blur shows on every side of it. Pass `inset={0}` and `cornerRadius={0}` for a picture that fills the screen edge to edge. Zooming in lets it grow past the margin either way.

The Android back button and the accessibility escape gesture both close it. With a screen reader, the open picture is announced with its `alt`, and in a gallery swiping up or down turns the page.

---

Full page, with every example: https://panelui.dev/docs/components/image-viewer
