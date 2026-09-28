# Sketch

Draw with a pen, shapes and an eraser, in a sheet or a whole screen.

```tsx
import { Sketch } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Sketch } from '@/components/ui/sketch';
```

### Anatomy

```tsx
<Sketch.Sheet open={open} onOpenChange={setOpen} onDone={save} />

{/* or on a screen of its own */}
<Sketch onClose={goBack} onDone={save} />
```

### Parts

- `Sketch.Sheet` — The sketch in a bottom sheet that fills the screen. The sheet cannot be dragged or tapped away, so close and confirm are the ways out, and both close it. It is the platform's own sheet by default, painted solid; pass `native={false}` for the styled one.

### Props

#### `SketchProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `colors` | `string[]` | — | The swatches along the bottom. The custom-colour button sits before them. |
| `defaultColor` | `string` | — | The ink to start with. Defaults to the theme's foreground. |
| `defaultTool` | `SketchTool` | `pen` | The tool selected when the surface opens. Default `pen`. |
| `defaultShape` | `SketchShape` | `rectangle` | The shape the shape tool draws until another is picked. Default `rectangle`. |
| `shapes` | `SketchShape[]` | — | Which shapes the grid offers, in order. Defaults to all eight. |
| `defaultSize` | `number` | `6` | Stroke width to start with, in points. Default 6. |
| `minSize` | `number` | `2` | The thinnest stroke the slider reaches. Default 2. |
| `maxSize` | `number` | `24` | The thickest stroke the slider reaches. Default 24. |
| `customColor` | `boolean` | `true` | Show the custom-colour button before the swatches. Default true. |
| `onClose` | `() => void` | — | Called by the close button in the top leading corner. Leave it out and there is no close button — for a sketch embedded in a screen that has its own way out. |
| `onDone` | `(result: SketchResult) => void` | — | Called by the confirm button with the finished drawing. Leave it out and there is no confirm button. The button is disabled until something has been drawn. |
| `onChange` | `(itemCount: number) => void` | — | The number of items in the document changed — by drawing, undo or clear. |

#### `SketchSheetProps`

Extends `SketchProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | — |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `native` | `boolean` | — | Present the platform's own sheet, painted solid in the theme's popover surface. On by default. Requires the optional `@expo/ui` package; without it the styled sheet is used instead. On iOS the sheet cannot be dragged away, so a downward stroke draws rather than moving the sheet. The close button is the way out. |

### Example — In a sheet

`Sketch.Sheet` opens over the current screen and closes when the drawing is confirmed. `onDone` receives the SVG, the canvas size in points and the list of what was drawn.

```tsx
const [open, setOpen] = useState(false);
const [drawing, setDrawing] = useState<string | null>(null);

<Button variant="outline" onPress={() => setOpen(true)}>Open sketch</Button>
<Sketch.Sheet
  open={open}
  onOpenChange={setOpen}
  onDone={({ svg }) => setDrawing(svg)}
/>
```

### Notes

### The eraser rubs out, it does not delete

The eraser paints a mask over what was drawn before it, so it removes only what is under the finger. Ink drawn afterwards over an erased patch is not affected. Undo takes an eraser stroke back like any other mark.

The drawing stays vector, and `toSVG()` writes the same masks, so an export matches the screen.

### The sheet cannot be dragged away

On a canvas every drag is a stroke. On iOS the platform sheet is told not to take drags, and the styled sheet's drag is switched off. On Android, the platform sheet keeps its own drag handling.

### It needs a height

`Sketch` fills its parent, like any `flex-1` view. On a screen, that is the screen. Inside a scroll view it has no height to fill; give it one.

### Colours

The chrome is drawn in theme tokens, so it follows light and dark. The swatches are ink colours rather than tokens, because a drawing keeps its colours when it leaves the app. The default ink is the theme's foreground.

---

Full page, with every example: https://panelui.dev/docs/components/sketch
