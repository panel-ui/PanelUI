# Range Meter

A reading on a ruler of ticks that rises where the value is, with the number above it.

```tsx
import { RangeMeter } from "@/components/panelui/range-meter"
```

From npm the path is `panelui-web/range-meter`. Install with `npx shadcn@latest add @panelui/range-meter`.

## When to use it

Use it for one reading on a known scale where the position matters as much as the number: a response time between the fastest and the slowest, a level between empty and full. The scale is a ruler of ticks that rises where the reading is, with the number in a tag above the rise.

With `onValueChange` it is a slider that can be dragged. Without it, the same drawing is a meter that only shows a value.

It needs about 12rem of width for the rise to read as one. In a tighter space, or for a reading that needs no number, use a progress bar.

## Usage

```tsx
<RangeMeter.Label>Response time</RangeMeter.Label>
<RangeMeter
  min={80}
  max={600}
  step={10}
  value={time}
  onValueChange={setTime}
  marker={300}
/>
<RangeMeter.Scale start="80 ms" end="600 ms" />
```

## Parts

```tsx
<RangeMeter.Label />
<RangeMeter value={…} />
<RangeMeter.Scale start="…" end="…" />
```

- `RangeMeter.Label` — The meter's name, written over it. The meter's own `label` prop is what a screen reader says; this is the visible name.
- `RangeMeter.Scale` — What the two ends of the ruler stand for, at either side under it: `start` and `end`.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `RangeMeterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `min` | `number` | `0` | The low end of the ruler. |
| `max` | `number` | `100` | The high end of the ruler. |
| `value` | `number` | **required** | The reading: where the ruler rises and the number written above it. |
| `onValueChange` | `(value: number) => void` | — | Called with the new value as the ruler is dragged or moved with the keyboard. Passing this makes it a slider; without it, it is a meter. |
| `step` | `number` | `1` | How much one arrow key press moves the value, and what a drag snaps to. |
| `marker` | `number` | — | A value to mark under the ruler, such as a target. |
| `ticks` | `number` | `41` | How many ticks the ruler is drawn with. |
| `color` | `RangeMeterColor` | `'primary'` | Which of the theme's roles the lit ticks and the tag are drawn in. |
| `formatValue` | `(value: number) => ReactNode` | — | Writes the number in the tag. Defaults to the value as it is. |
| `label` | `string` | `'Reading'` | What a screen reader calls it. |
| `valueText` | `string` | — | What a screen reader says for the value: "240 milliseconds". |

#### `RangeMeterLabelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `RangeMeterScaleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `start` | `ReactNode` | **required** | The word or figure at the low end. |
| `end` | `ReactNode` | **required** | The word or figure at the high end. |

## In a Server Component

`RangeMeter` is a client component. A Server Component cannot read `RangeMeter.Label` off the import, so import each part by name: `RangeMeterLabel`, `RangeMeterScale`.

## Notes

#### Scale

`min` and `max` are the ends of the ruler and default to 0 and 100. A `value` outside them is drawn at the nearest end and still announced as given.

`step` is what one arrow key press moves the value by, and what a drag snaps to.

#### Ticks

The ruler has 41 ticks unless `ticks` says otherwise. They are decoration and not graduations: the reading is placed by its value, between two ticks if that is where it falls. Set `ticks` so one tick is a round amount if you want them to line up with the steps.

#### The tag stays inside

The tag sits over the reading and is hung from it in proportion to the reading's place on the ruler: by its left edge at the lowest value, its middle half way and its right edge at the highest. Nothing hangs outside the control, so it can be placed against the edge of a card.

The control is taller than the ruler by the height of the tag, which is drawn inside its box.

#### Marker

`marker` draws a small diamond under the ruler at a value, such as a target or a budget. It is hidden from screen readers, so say what it marks in text beside the meter.

#### Colour

`color` names one of the theme's roles and colours the lit ticks and the tag. To show that a reading has crossed a threshold, work out the role from the value and pass it, as the first example does.

#### Keyboard

Left and down lower the value by one step, right and up raise it. Page Up and Page Down move a tenth of the range, and Home and End go to the ends.

#### Screen readers

Pass `label` to name the reading and `valueText` to say the value with its unit, such as "240 milliseconds".

## Example

```tsx
'use client';

import { useState } from 'react';
import { RangeMeter, type RangeMeterColor } from '@/components/panelui/range-meter';
import { Frame } from '@/components/panelui/frame';
import { Stat } from '@/components/panelui/stat';

const FASTEST = 80;
const SLOWEST = 600;
/** What the team has agreed a page may take. */
const BUDGET = 300;

/** Fine under the budget, a warning up to half as much again, a problem past that. */
const colorOf = (time: number): RangeMeterColor =>
  time <= BUDGET ? 'success' : time <= BUDGET * 1.5 ? 'warning' : 'destructive';

const verdictOf = (time: number) =>
  time <= BUDGET ? `${BUDGET - time} ms inside budget` : `${time - BUDGET} ms over budget`;

export default function RangeMeterResponseTime() {
  const [time, setTime] = useState(240);

  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Checkout page</Frame.Title>
        <Frame.Action>Budget {BUDGET} ms</Frame.Action>
      </Frame.Header>

      <Frame.Panel className="gap-4 p-5">
        <Stat aria-live="polite">
          <Stat.Content>
            <Stat.Label>Response time</Stat.Label>
            <Stat.Value>
              {time}
              <Stat.Unit>ms</Stat.Unit>
            </Stat.Value>
          </Stat.Content>
          <Stat.Badge>{verdictOf(time)}</Stat.Badge>
        </Stat>

        <div className="flex flex-col gap-2">
          <RangeMeter
            min={FASTEST}
            max={SLOWEST}
            step={10}
            value={time}
            onValueChange={setTime}
            marker={BUDGET}
            color={colorOf(time)}
            label="Response time"
            valueText={`${time} milliseconds`}
          />
          <RangeMeter.Scale start={`${FASTEST} ms`} end={`${SLOWEST} ms`} />
        </div>
      </Frame.Panel>
    </Frame>
  );
}
```
