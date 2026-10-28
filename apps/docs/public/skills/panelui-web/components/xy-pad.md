# XY Pad

Two numbers set with one drag: a point moved across a field.

```tsx
import { XYPad } from "@/components/panelui/xy-pad"
```

From npm the path is `panelui-web/xy-pad`. Install with `npx shadcn@latest add @panelui/xy-pad`.

## When to use it

Use it for two values that the hand thinks of as one place: where a subject sits in a frame, the position of a light, a pan or a balance between two pairs of things. One drag sets both, where two sliders would make the reader find the point by turning one knob and then the other.

It needs room to be dragged across, so give it a width and let `aspect` set its height.

For a single value, use a [Slider](/docs/web/components/slider). For values that need typing exactly, use two [Inputs](/docs/web/components/input).

## Usage

```tsx
<XYPad label="Framing" defaultValue={{ x: 0.3, y: -0.2 }}>
  <XYPad.Value />
</XYPad>
```

## Parts

```tsx
<XYPad>
  <XYPad.Value />
</XYPad>
```

- `XYPad.Value` — The two values written out under the field, each by `format`. Leave it out when the values are shown elsewhere.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `XYPadProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `XYPadPoint` | — | Where the point is, when the caller holds it. |
| `defaultValue` | `XYPadPoint` | — | Where it starts, when the caller does not hold it. Default the centre. |
| `onValueChange` | `(value: XYPadPoint) => void` | — | Called with the new point while it moves. |
| `onValueCommitted` | `(value: XYPadPoint) => void` | — | Called once a move ends: on release, or after a key press. |
| `x` | `[number, number]` | — | The range of `x`, left to right. Default `[-1, 1]`. |
| `y` | `[number, number]` | — | The range of `y`, bottom to top. Default `[-1, 1]`. |
| `step` | `number` | `0.01` | The granularity of both values. Default `0.01`. |
| `grid` | `number` | `8` | How many cells the dot grid has across. Default 8. |
| `snapToGrid` | `boolean` | `false` | Snap the point to the dots of the grid. |
| `snapBack` | `boolean` | `false` | Spring back to the centre on release, like a joystick. |
| `trail` | `boolean` | `false` | Draw the last moves as a fading line behind the point. |
| `color` | `XYPadColor` | `info` | The colour of the point, its guides and its trail. Default `info`. |
| `aspect` | `string` | `'16 / 10'` | The shape of the field, as a CSS aspect ratio. Default `16 / 10`. |
| `label` | `string` | — | What it sets. Read out with its values. |
| `format` | `(value: number, axis: 'x' \| 'y') => string` | — | How each value is written, here and to a screen reader. Default two decimals. |
| `disabled` | `boolean` | `false` | Turns it off. |
| `name` | `string` | — | Submits `<name>.x` and `<name>.y` with a form. |

## In a Server Component

`XYPad` is a client component. A Server Component cannot read `XYPad.Value` off the import, so import each part by name: `XYPadValue`.

## Notes

#### Axes

`x` runs from left to right and `y` from bottom to top, as on a chart, each from `-1` to `1` unless `x` or `y` sets another range. The hairlines mark zero on each axis that crosses it.

#### Pointer and keyboard

A press anywhere in the field moves the point there, and a drag carries it. The arrow keys move it by `step`, ten steps with Shift, and Home puts it back in the centre.

A screen reader reads both values together, written by `format`, after the `label`.

#### Forms

Give it a `name` and it submits `name.x` and `name.y` with the form it is in.

With reduced motion turned on, a spring back to the centre happens without moving through the field.

## Example

```tsx
'use client';

import { XYPad } from '@/components/panelui/xy-pad';

export default function XYPadOverview() {
  return (
    <XYPad label="Framing" defaultValue={{ x: 0.32, y: -0.18 }} className="max-w-sm">
      <XYPad.Value />
    </XYPad>
  );
}
```
