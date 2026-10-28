# Slider

A number set by dragging along a track, with its name and value written inside it.

```tsx
import { Slider } from "@/components/panelui/slider"
```

From npm the path is `panelui-web/slider`. Install with `npx shadcn@latest add @panelui/slider`.

## When to use it

Use it to set a number where the feel of the change matters more than the exact figure: a brush size, an opacity, a zoom. The value updates while the hand moves, so whatever it drives can follow live.

The default `fill` slider writes its name at the start of the track and its value at the end, so a panel of settings is a column of bars rather than labels, tracks and numbers to line up. Give every slider a `label`; it is also what a screen reader announces.

For a number that has to be typed exactly, such as a price or a page count, use an [Input](/docs/web/components/input). For a choice between a few named options, use [Tabs](/docs/web/components/tabs) or a [Select](/docs/web/components/select).

## Usage

```tsx
<Slider label="Opacity" defaultValue={80} format={{ style: "unit", unit: "percent" }} />

<Slider variant="line" label="Zoom" min={25} max={400} defaultValue={100}>
  <Slider.Step by={-25} aria-label="Zoom out">
    <MinusIcon />
  </Slider.Step>
  <Slider.Step by={25} aria-label="Zoom in">
    <PlusIcon />
  </Slider.Step>
</Slider>
```

## Parts

```tsx
<Slider>
  <Slider.Step />
</Slider>
```

- `Slider.Step` — A button beside the track that moves the value by `by`. One with a negative `by` stands before the track and one with a positive `by` after it, wherever they are written. It is disabled at the end it moves towards, and does nothing on a range.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `SliderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `Value` | — | The value, when the caller holds it. Two numbers make a range with two handles. |
| `defaultValue` | `Value` | — | The value to start at, when the caller does not hold it. Default `min`. |
| `onValueChange` | `(value: Value) => void` | — | Called with the new value while it changes, by a drag, a press, a key or a `Slider.Step`. |
| `variant` | `SliderVariant` | `'fill'` | `fill` writes the name and value inside a bar; `line` is a thin track with a knob. Default `fill`. |
| `label` | `string` | — | What it sets. Written inside a `fill` slider, and what a screen reader calls either kind. |
| `format` | `Intl.NumberFormatOptions \| ((value: number) => string)` | — | How the value is written: number-format options such as `{ style: 'unit', unit: 'percent' }`, or a function from the number to a string for anything else, such as a multiplier written `1.40×`. Also what a screen reader reads. |
| `origin` | `'start' \| 'center'` | `'start'` | Where the fill grows from. `center` fills outwards from the middle of the range. Default `start`. |
| `color` | `SliderColor` | `neutral` | The colour of the fill and the handle. `neutral` by default. |
| `size` | `SliderSize` | `md` | Height of a `fill` slider. Default `md`. |
| `showValue` | `boolean` | `true` | Show the value at the end of a `fill` slider. Default true. |
| `ticks` | `boolean` | — | Mark every step with a notch. Default: on when there are 12 steps or fewer. |
| `className` | `string` | — | — |
| `style` | `CSSProperties` | — | — |

#### `SliderStepProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `by` | `number` | **required** | How much one press moves the value. Negative steps down and sits before the track. |

## In a Server Component

`Slider` is a client component. A Server Component cannot read `Slider.Step` off the import, so import each part by name: `SliderStep`.

## Notes

#### Pointer and keyboard

A press away from the handle glides the fill there; a drag follows the pointer with no easing. Pulled past either end, the track stretches a few pixels and springs back on release.

The arrow keys move by `step` and Page Up and Page Down by `largeStep`, 10 steps by default. Home and End go to `min` and `max`.

#### Writing the value

`format` takes number-format options, such as `{ style: "unit", unit: "percent" }`, or a function from the number to a string. Either way it also writes what a screen reader reads, so a value written as `1.40×` is read as that rather than as 1.4.

#### Forms

Give it a `name` and it submits its value with the form it is in. A range submits both numbers.

With reduced motion turned on, the fill moves without gliding and the track does not stretch.

## Example

```tsx
'use client';

import { Slider } from '@/components/panelui/slider';

const PERCENT = { style: 'unit', unit: 'percent' } as const;

export default function SliderOverview() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Slider label="Size" defaultValue={24} min={1} max={120} format={(v) => `${v} px`} />
      <Slider label="Opacity" defaultValue={80} format={PERCENT} />
      <Slider label="Hardness" defaultValue={35} format={PERCENT} />
      <Slider label="Smoothing" defaultValue={1.4} min={0} max={4} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
    </div>
  );
}
```
