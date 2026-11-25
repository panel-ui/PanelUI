# Micro

A pill holding one small reading or control: a count with its trend, a ring, a timecode, a stepper.

```tsx
import { Micro } from "@/components/panelui/micro"
```

From npm the path is `panelui-web/micro`. Install with `npx shadcn@latest add @panelui/micro`.

## When to use it

Use it for the small readings and controls that sit around a piece of work rather than in a form: a count with its trend, a percentage, a timecode with play and skip, a speed, which section is showing, how far an export has got. Every pill has the same height and surface, so a row of them reads as one strip of instruments.

A pill is built from parts written in the order they read. Each pill in the board above has its own example further down this page. At an end that is a round button, a segmented choice or a ring, the pill pulls its padding in so the circle sits concentric with it.

For a single figure with a label and a badge, use [Stat](/docs/web/components/stat). For a status word, use [Badge](/docs/web/components/badge).

## Usage

```tsx
<Micro>
  <Micro.Text value="12.4k" label="listens · 30 days" />
  <Micro.Spark values={[4, 5, 4, 6, 7, 8, 11]} tone="info" />
  <Micro.Delta value={9} />
</Micro>
```

## Parts

```tsx
<Micro>
  <Micro.Text />
  <Micro.Label />
  <Micro.Mono />
  <Micro.Spark />
  <Micro.Ring />
  <Micro.Delta />
  <Micro.Pulse />
  <Micro.Button />
  <Micro.Separator />
  <Micro.Segments>
    <Micro.Segment />
  </Micro.Segments>
  <Micro.Stepper />
  <Micro.Progress />
  <Micro.Switch />
  <Micro.Faces />
  <Micro.Input />
  <Micro.Kbd />
</Micro>
```

- `Micro.Text` — A value over a muted line saying what it is.
- `Micro.Label` — One muted word or phrase on a single line, such as "Speed".
- `Micro.Mono` — A reading in mono figures, for times and counts that change in place. `muted` dims it, for the second half of a pair.
- `Micro.Spark` — A run of thin bars, oldest first. The newest is drawn in `tone`. They rise when first shown.
- `Micro.Ring` — A ring that sweeps to `value`, from 0 to 100. It is a meter, named by `label`.
- `Micro.Delta` — A change with its sign and an arrow, green when up and red when down. `inverted` swaps them, for a reading where lower is better.
- `Micro.Pulse` — A heartbeat line that beats while `live`, for a reading taken continuously.
- `Micro.Button` — A round button. `ghost` shows its circle only when pointed at, and `aria-pressed` fills it.
- `Micro.Separator` — A short upright rule between two groups.
- `Micro.Segments` — A choice of a few, with a marker that slides to the chosen one. The arrow keys move it.
- `Micro.Segment` — One choice, by its `value`.
- `Micro.Stepper` — A number between a minus and a plus, with `min`, `max` and `step`. Its digits roll as it changes, and the arrow keys move it.
- `Micro.Progress` — A label and a count over a row of ticks that fill as the work is done: one tick each, up to 16.
- `Micro.Switch` — A switch sized for the pill. Put a `Micro.Text` before it for what it turns on.
- `Micro.Faces` — Overlapping faces, with initials where there is no picture. Four show and the rest are counted.
- `Micro.Input` — A bare field that takes the pill's remaining width.
- `Micro.Kbd` — A key or a chord in a cap.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `MicroProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `MicroSize` | `md` | `sm` is 40px tall, `md` 48px. Default `md`. |

#### `MicroTextProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `ReactNode` | — | The reading, on the first line: "48.2k", "68%". |
| `label` | `ReactNode` | — | What it is, on the second line, muted: "views · 7 days". |

#### `MicroMonoProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `muted` | `boolean` | — | `muted` for the second half of a pair, like a duration after the time played. |

#### `MicroSparkProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `values` | `readonly number[]` | **required** | The values, oldest first. The last is drawn in the tone. |
| `tone` | `MicroTone` | — | The colour of the last bar. Default `default`, the text's colour. |
| `height` | `number` | — | How tall the tallest bar is, in px. Default `20`. |

#### `MicroRingProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | **required** | How full it is, from 0 to 100. |
| `tone` | `MicroTone` | — | The arc's colour. Default `default`. |
| `diameter` | `number` | — | Its diameter, in px. Default `32`, or `26` in a small pill. |
| `label` | `string` | — | What a screen reader says it is: "lip-sync". It is read with the value. |

#### `MicroDeltaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | **required** | The change, as a number: `12` for +12%. |
| `unit` | `string` | — | What follows the number. Default `%`. |
| `tone` | `MicroTone` | — | Its colour. Default `success` when up, `destructive` when down, muted when flat. |
| `inverted` | `boolean` | — | Draw a fall as good, as for latency or cost. Swaps the default tones. |

#### `MicroButtonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `'solid' \| 'ghost'` | — | `solid` sits on a filled circle; `ghost` shows its circle only when pointed at. Default `solid`. |

#### `MicroSegmentsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The chosen segment's `value`, when the caller holds it. |
| `defaultValue` | `string` | — | The segment chosen first, when the caller does not hold it. |
| `onValueChange` | `(value: string) => void` | — | Called with the new segment's `value`. |

#### `MicroSegmentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | **required** | What choosing it sets. |

#### `MicroStepperProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | — | The number, when the caller holds it. |
| `defaultValue` | `number` | — | The number to start at, when the caller does not hold it. Default `min`. |
| `onValueChange` | `(value: number) => void` | — | Called with the new number. |
| `min` | `number` | `0` | The lowest it goes. Default `0`. |
| `max` | `number` | `100` | The highest it goes. Default `100`. |
| `step` | `number` | `1` | How far one press moves it. Default `1`. |
| `format` | `Intl.NumberFormatOptions` | — | How it is written, passed to `Intl.NumberFormat`. |
| `suffix` | `string` | — | Written after the number: `×`, ` px`. |
| `label` | `string` | — | What a screen reader calls it: "Playback speed". |

#### `MicroProgressProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | **required** | How many are done. |
| `max` | `number` | `100` | How many there are. One tick each, up to 16; past that the ticks stand for a share each. |
| `label` | `ReactNode` | — | What is being done: "Rendering". |
| `tone` | `MicroTone` | — | The ticks' colour when done. Default `default`. |

#### `MicroFacesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `people` | `readonly MicroFace[]` | **required** | The people, in order. Four show; the rest are counted. |

#### `MicroPulseProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `tone` | `MicroTone` | — | Its colour. Default `default`. |
| `live` | `boolean` | — | Whether it beats. Default `true`. |

## In a Server Component

`Micro` is a client component. A Server Component cannot read `Micro.Text` off the import, so import each part by name: `MicroText`, `MicroLabel`, `MicroMono`, `MicroSpark`, `MicroRing`, `MicroDelta`, `MicroButton`, `MicroSeparator`, `MicroSegments`, `MicroSegment`, `MicroStepper`, `MicroProgress`, `MicroSwitch`, `MicroKbd`, `MicroFaces`, `MicroInput`, `MicroPulse`.

## Notes

#### Tones

Bars, rings, ticks and the pulse are drawn in the text's colour unless `tone` names a theme colour: `info`, `success`, `warning` or `destructive`. Use a tone for what a reading means, not to decorate it.

#### Motion

The spark's bars rise once when they first show, the ring sweeps whenever its value changes, the stepper's digits roll, the segment marker slides, and ticks fill as progress is made. With reduced motion each change happens at once and the pulse stops.

#### Screen readers

`Micro.Ring` is a meter and `Micro.Progress` a progress bar, both read with their values. `Micro.Segments` is a radio group and `Micro.Stepper` a spin button. A `Micro.Button` that holds only a glyph needs an `aria-label`, as does `Micro.Input`.

## Example

```tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Add01Icon,
  Bookmark01Icon,
  Clock01Icon,
  GoForward15SecIcon,
  PauseIcon,
  PlayIcon,
  GoBackward15SecIcon,
  Search01Icon,
  Share08Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Micro } from '@/components/panelui/micro';

const LENGTH = 52 * 60 + 10;

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MicroOverview() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(18 * 60 + 42);
  const [speed, setSpeed] = useState(1);
  const [part, setPart] = useState('interview');
  const [exporting, setExporting] = useState(true);
  const [exported, setExported] = useState(5);
  const [denoise, setDenoise] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTime((value) => Math.min(LENGTH, value + 1)), 1000 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  useEffect(() => {
    if (!exporting || exported >= 12) return;
    const timer = window.setTimeout(() => setExported((value) => value + 1), 1500);
    return () => window.clearTimeout(timer);
  }, [exporting, exported]);

  return (
    <div className="flex w-full max-w-4xl flex-wrap items-center justify-center gap-3">
      <Micro>
        <Micro.Text value="12.4k" label="listens · 30 days" />
        <Micro.Spark values={[4, 5, 4, 6, 6, 7, 6, 8, 9, 11]} tone="info" />
        <Micro.Delta value={9} />
      </Micro>
      <Micro>
        <Micro.Text value="41:08" label="average listen" />
        <Micro.Spark values={[6, 6, 7, 6, 7, 8, 7, 8, 8, 9]} />
        <Micro.Delta value={4} />
      </Micro>
      <Micro>
        <Micro.Ring value={72} tone="info" label="Finish rate" />
        <Micro.Text value="72%" label="finish rate" />
      </Micro>

      <Micro>
        <Micro.Button aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>
          {playing ? <HugeiconsIcon icon={PauseIcon} /> : <HugeiconsIcon icon={PlayIcon} />}
        </Micro.Button>
        <Micro.Button
          variant="ghost"
          aria-label="Back 15 seconds"
          onClick={() => setTime((value) => Math.max(0, value - 15))}
        >
          <HugeiconsIcon icon={GoBackward15SecIcon} />
        </Micro.Button>
        <Micro.Button
          variant="ghost"
          aria-label="Forward 15 seconds"
          onClick={() => setTime((value) => Math.min(LENGTH, value + 15))}
        >
          <HugeiconsIcon icon={GoForward15SecIcon} />
        </Micro.Button>
        <Micro.Separator />
        <span>
          <Micro.Mono>{clock(time)}</Micro.Mono> <Micro.Mono muted>/ {clock(LENGTH)}</Micro.Mono>
        </span>
      </Micro>
      <Micro>
        <Micro.Segments value={part} onValueChange={setPart} aria-label="Section">
          <Micro.Segment value="intro">Intro</Micro.Segment>
          <Micro.Segment value="interview">Interview</Micro.Segment>
          <Micro.Segment value="outro">Outro</Micro.Segment>
        </Micro.Segments>
        <Micro.Button variant="ghost" aria-label="Add a section">
          <HugeiconsIcon icon={Add01Icon} />
        </Micro.Button>
      </Micro>
      <Micro>
        <Micro.Label>Speed</Micro.Label>
        <Micro.Stepper
          value={speed}
          onValueChange={setSpeed}
          min={0.5}
          max={2}
          step={0.25}
          suffix="×"
          format={{ minimumFractionDigits: 1, maximumFractionDigits: 2 }}
          label="Playback speed"
        />
      </Micro>
      <Micro>
        <Micro.Button variant="ghost" aria-label="Bookmark">
          <HugeiconsIcon icon={Bookmark01Icon} />
        </Micro.Button>
        <Micro.Button variant="ghost" aria-label="Share">
          <HugeiconsIcon icon={Share08Icon} />
        </Micro.Button>
      </Micro>

      <Micro>
        <Micro.Pulse tone="success" />
        <Micro.Mono>−14</Micro.Mono>
        <Micro.Label>LUFS</Micro.Label>
      </Micro>
      <Micro className="w-64">
        <Micro.Progress
          label={exported >= 12 ? 'Exported' : 'Exporting'}
          value={exported}
          max={12}
          tone="info"
          className="flex-1"
        />
        <Micro.Button
          aria-label={exported >= 12 ? 'Export again' : exporting ? 'Pause export' : 'Resume export'}
          onClick={() => (exported >= 12 ? setExported(0) : setExporting(!exporting))}
        >
          {exported >= 12 ? (
            <HugeiconsIcon icon={Tick02Icon} />
          ) : exporting ? (
            <HugeiconsIcon icon={PauseIcon} />
          ) : (
            <HugeiconsIcon icon={PlayIcon} />
          )}
        </Micro.Button>
      </Micro>
      <Micro>
        <Micro.Faces
          people={[
            { name: 'Khalid Abdi', src: 'https://avatars.githubusercontent.com/u/127331761?v=4' },
            { name: 'Ines Duarte' },
            { name: 'Sam Whitlock' },
          ]}
        />
        <Micro.Label className="text-foreground">Approved</Micro.Label>
        <HugeiconsIcon icon={Tick02Icon} className="size-4 text-success-foreground" aria-hidden="true" />
      </Micro>

      <Micro className="w-80">
        <HugeiconsIcon icon={Search01Icon} className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Micro.Input placeholder="Find a word in this episode" aria-label="Find in episode" />
        <Micro.Kbd>⌘F</Micro.Kbd>
      </Micro>
      <Micro>
        <Micro.Text value="Remove noise" label="this episode only" />
        <Micro.Switch checked={denoise} onCheckedChange={setDenoise} label="Remove noise" color="info" />
      </Micro>
      <Micro>
        <HugeiconsIcon icon={Clock01Icon} className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Micro.Mono>3,180</Micro.Mono>
        <Micro.Label>minutes left</Micro.Label>
      </Micro>
    </div>
  );
}
```
