# Canvas

A surface of dots, lines or crosses for other components to sit on, with a light that can follow the pointer.

```tsx
import { Canvas } from "@/components/panelui/canvas"
```

From npm the path is `panelui-web/canvas`. Install with `npx shadcn@latest add @panelui/canvas`.

## When to use it

Use it as the surface under something that sits on a page of its own: a graph, an empty state, a composer on an otherwise empty screen.

It is a stack of layers. `Canvas.Pattern` draws dots, a grid or crosses across the whole surface, and several patterns stack. `Canvas.Spotlight` lights the marks near the pointer, brightest at its centre. `Canvas.Content` is what sits on top.

A canvas needs a height to fill: give it one with `className`, or let its parent stretch it.

To put a [Flow](/docs/web/components/flow) on it, pass the Flow's `onViewportChange` to the canvas's `viewport`, and the pattern pans and zooms with the graph.

## Usage

```tsx
<Canvas className="h-96">
  <Canvas.Pattern variant="dots" />
  <Canvas.Spotlight />
  <Canvas.Content>…</Canvas.Content>
</Canvas>
```

## Parts

```tsx
<Canvas>
  <Canvas.Pattern />
  <Canvas.Spotlight />
  <Canvas.Content />
</Canvas>
```

- `Canvas.Pattern` — Marks across the whole canvas: `dots`, `grid` or `cross`, `gap` apart. `major` draws every so many lines or marks stronger, `fade` lets the pattern fade towards the edges or the bottom, and `strength` sets how strongly the marks show. Patterns stack in the order they are written.
- `Canvas.Spotlight` — Lights the patterns near the pointer: inside `radius`, the marks brighten towards the foreground colour, most at the centre. It follows the pointer over whatever is in the content, fades out when the pointer leaves, and on a touch screen shows while a finger is down. `position` holds it at a point instead.
- `Canvas.Content` — What sits on the canvas, above its patterns and its light. It fills the canvas, so lay out what is in it with `className`.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `CanvasProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `viewport` | `CanvasViewport` | — | Where the canvas is looking, as `{ x, y, zoom }`. Pass what a Flow reports from `onViewportChange`, and the pattern pans and scales with the graph. Default `{ x: 0, y: 0, zoom: 1 }`. |

#### `CanvasPatternProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `CanvasPatternVariant` | `'dots'` | Dots, a grid of lines, or small crosses. Default `dots`. |
| `gap` | `number` | — | The distance from one mark to the next, in pixels at a zoom of 1. Default `12`, or `24` for a grid. |
| `size` | `number` | — | How big a mark is: a dot's radius, a line's width, half a cross's arm. Default `0.75`, `1` or `3`. |
| `major` | `number` | — | Draws every this-many-th line or mark stronger, as on graph paper. |
| `fade` | `CanvasFade` | `'none'` | Fades the pattern out towards every edge or towards the bottom. Default `none`. |
| `strength` | `string` | — | How strongly the marks show at rest, as a share of the foreground colour. Default `28%` for dots and crosses, `10%` for a grid. |

#### `CanvasSpotlightProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `radius` | `number` | `100` | How far the light reaches from its centre, in pixels. Default `100`. |
| `position` | `{ x: number; y: number }` | — | Holds the light at a point, in pixels from the canvas's top left corner, instead of following the pointer. |

#### `CanvasContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'canvas-content', className: canvasVariants().content({ className }) }, props),` | **required** | — |

## In a Server Component

`Canvas` is a client component. A Server Component cannot read `Canvas.Pattern` off the import, so import each part by name: `CanvasPattern`, `CanvasSpotlight`, `CanvasContent`.

## Notes

#### Height

The canvas fills what it is given and does not grow with its content. Give it a height, or put it in a parent that stretches it.

#### Under a Flow

Give the Flow `className="h-full rounded-none border-0 bg-transparent"` and no `Flow.Background`, keep the viewport in state, and pass it both ways: `onViewportChange={setViewport}` on the Flow and `viewport={viewport}` on the canvas.

#### The spotlight and motion

The spotlight follows the pointer directly rather than easing after it, and nothing moves on its own, so it runs the same when reduced motion is asked for. It is drawn from the canvas's own pointer events, so it also lights the marks under content that takes the pointer, such as a Flow's nodes.

#### Colours

The marks are the theme's foreground colour at `strength`, 28% for dots and crosses and 10% for a grid, and the spotlight brings them to 95%. Both follow the theme, light and dark.

## Example

```tsx
'use client';

import { Canvas } from '@/components/panelui/canvas';

export default function CanvasOverview() {
  return (
    <Canvas className="h-[420px] w-full">
      <Canvas.Pattern />
      <Canvas.Spotlight />
    </Canvas>
  );
}
```
