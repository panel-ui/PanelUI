# Soundwave

A voice drawn while an app listens: capsules, bars, a line, a field of dots, spokes round a person, or rings of dots.

```tsx
import { Soundwave, useMicrophone } from "@/components/panelui/soundwave"
```

From npm the path is `panelui-web/soundwave`. Install with `npx shadcn@latest add @panelui/soundwave`.

## When to use it

Use it to show that an app is hearing someone, or that someone is speaking: over a microphone button, in a recording row, beside each person on a call, or behind a whole voice screen.

It draws a level and does not record one. Pass it a microphone, a call or an audio element as `source` and it measures the sound itself, or pass a `level` from 0 to 1 that you measure. `useMicrophone` asks for the microphone and gives you the stream.

With no level it runs its own motion for the current `state`, which is enough to build and review a voice screen before any audio exists.

For a spinner while an answer is being written, use a loader. For a recording's length and position alone, a progress bar is clearer.

## Usage

```tsx
const mic = useMicrophone()

<Soundwave variant="dots" source={mic.stream} />
<Button onClick={mic.toggle}>{mic.active ? 'Stop' : 'Speak'}</Button>

<Soundwave variant="radial" state="speaking">
  <Soundwave.Center>
    <Avatar name="Khalid Abdi" size="xl" />
  </Soundwave.Center>
</Soundwave>
```

## Parts

```tsx
<Soundwave>
  <Soundwave.Center />
</Soundwave>
```

- `Soundwave.Center` — What sits in the middle of a `radial` or `ring` wave, such as an avatar or a figure. It is sized to the hole and centred in it. The other looks have no middle and do not use it.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `SoundwaveProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `SoundwaveVariant` | `'pills'` | Which look to draw: `pills` for a few capsules over a microphone button, `bars` for a metering strip, `line` for a travelling wave, `ambient` for a glow that fills its parent, `dots` for a field of dots lit into a wave, `radial` for spokes around a centre, and `ring` for rings of dots lit outward by angle. |
| `state` | `SoundwaveState` | `'listening'` | What the app is doing. With no `level` it picks the motion the wave runs on its own, and it always sets what a screen reader announces. |
| `level` | `number \| RefObject<number \| null>` | — | How loud the input is now, from 0 to 1. Pass a ref and write each reading into `ref.current` to keep updates out of React entirely. Leave it out and the wave runs its own motion for `state`. |
| `source` | `SoundwaveSource \| null` | — | Sound to draw, in place of `level`: a `MediaStream` from a microphone or a call, or an `<audio>` or `<video>` element. A media file has to be on the same site or sent with CORS headers, or the browser hides its sound from the page and the wave stays still. |
| `levels` | `readonly number[]` | — | Fixed values, 0 to 1 each: the stored shape of a recording, a frequency analysis, or one value per angle for `ring` (24 for the hours of a day). Resampled to the bar count, and drawn still rather than animated. |
| `progress` | `number` | — | How far a recording has played, from 0 to 1. Bars and dots behind it keep full ink and the rest are dimmed. `bars` and `dots`, with `levels`. |
| `bars` | `number` | — | How many capsules, bars or spokes, or how many angles for `ring`. `dots` fits as many columns as the width allows. |
| `barWidth` | `number` | — | Capsule or bar width, the stroke of `line` and `radial`, or the size of a dot. |
| `barGap` | `number` | — | Space between capsules, or between dots. `bars` spaces itself across the width. |
| `height` | `number` | — | Drawing height. For `radial` and `ring` it is the diameter. `ambient` fills its parent instead. |
| `mode` | `'static' \| 'scrolling'` | `'static'` | `static` gives every bar a share of the current level; `scrolling` keeps a history that slides across, newest at the trailing edge. `bars` and `dots`. |
| `centered` | `boolean` | `true` | Grow bars and dots from the middle out rather than up from the bottom. |
| `fadeEdges` | `boolean` | `false` | Fade a strip out at both ends, so it does not stop at a hard edge. |
| `sensitivity` | `number` | `1` | Multiplier on the incoming level, applied before it is capped at 1. |
| `speed` | `number` | `1` | Multiplier on the wave's own tempo, including how fast a history scrolls. |
| `color` | `SoundwaveColor` | — | The ink, as a role from the theme. Left unset the wave is drawn in the text colour of whatever it sits in, which is right on most surfaces; `ambient` defaults to `info`, since a glow in the text colour reads as a shadow. |
| `gradient` | `readonly SoundwaveColor[]` | — | Colours across the wave instead of one ink, as theme roles: left to right for the strips, up from the bottom for `ambient`. |
| `trackColor` | `SoundwaveColor` | — | The colour of the unlit dots in `dots` and `ring`, and of the part of a recording not yet played in `bars`. Defaults to the ink, faint. |
| `paused` | `boolean` | `false` | Hold the current frame. |
| `label` | `string` | — | What a screen reader calls it. Defaults to the state: "Listening". |

#### `SoundwaveCenterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'soundwave-center', className: soundwaveVariants().center({ className }) }, props),` | **required** | — |

#### `AudioLevelOptions`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `floor` | `number` | — | The quietest sound that still moves the wave, in decibels below full scale. Default `-60`. Raise it towards `-45` in a noisy room. |
| `ceiling` | `number` | — | The loudness that fills the wave, in decibels below full scale. Default `-12`. |

#### `UseMicrophoneOptions`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `constraints` | `MediaTrackConstraints` | — | Passed to `getUserMedia` as `audio`, to pick a device or change its processing. |

#### `MicrophoneControls`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `level` | `RefObject<number>` | **required** | How loud the microphone is, from 0 to 1. Pass it to `Soundwave` as `level`. |
| `stream` | `MediaStream \| null` | **required** | The live stream while listening, for a recorder or a call. `null` otherwise. |
| `status` | `MicrophoneStatus` | **required** | `requesting` while the browser asks for permission, `denied` if it was refused or there is no microphone. |
| `active` | `boolean` | **required** | Whether it is listening now. |
| `start` | `() => Promise<void>` | **required** | Ask for the microphone and start listening. Call it from a click: browsers only allow sound to start from one. |
| `stop` | `() => void` | **required** | Stop listening and release the microphone, which turns the browser's recording light off. |
| `toggle` | `() => void` | **required** | `start` when stopped, `stop` when listening. |

## Notes

#### Sound in

There are three ways to give the wave something to draw, from least work to most control.

- **`source`**: a `MediaStream` or an `<audio>` or `<video>` element. The wave measures it with the browser's audio analyser on every frame. A media file has to be on the same site or sent with CORS headers (`crossOrigin="anonymous"` on the element); otherwise the browser hides its sound from the page and the wave stays still.
- **`useMicrophone()`**: asks for the microphone on `start`, which has to be called from a click, and gives back `stream` for `source`, a `level` ref, a `status` and `stop`. The microphone is released on `stop` and when the component unmounts. A refused permission or a missing microphone sets `status` to `denied`.
- **`level`**: a number from 0 to 1, or a ref holding one. `useAudioLevel(source)` returns such a ref, for when the reading is needed elsewhere too, such as to keep a recording's shape. Use a plain number for something slow, such as a speaking flag from a server.

With none of them the wave runs its own motion for `state`, so a screen can be built before any audio exists.

The level is smoothed with a fast rise and a slow fall, so the wave jumps on a syllable and settles gently instead of flickering on every sample. `sensitivity` multiplies it before it is capped at 1, for a quiet source; `useMicrophone({ floor: -45 })` ignores more of a noisy room.

#### Drawing

Each look is one or two SVG paths, and every dot is a round end on a line of no length, so a field of several hundred dots is a single path. Each frame rewrites those paths and changes no React state.

The strips (`bars`, `line` and `dots`) take the width of their container, so give the container a width. `pills`, `radial` and `ring` size themselves from their props.

#### When it stops

The wave stops drawing when it is scrolled out of view or its tab is hidden, and starts again when it comes back. `paused` holds the current frame. With reduced motion turned on, the wave holds a still frame instead of moving.

A wave with `levels` and no `scrolling` never animates, so a list of twenty voice notes costs nothing until one plays.

#### Screen readers

The wave is one image, announced by its state ("Listening"). Pass `label` to say more, such as who is speaking. What is inside `Soundwave.Center` is part of that image and is not read separately.

## Example

```tsx
'use client';

import { Button } from '@/components/panelui/button';
import { Soundwave, useMicrophone, type MicrophoneControls } from '@/components/panelui/soundwave';

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function MicButton({ mic }: { mic: MicrophoneControls }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant={mic.active ? 'default' : 'outline'}
        size="sm"
        shape="pill"
        aria-pressed={mic.active}
        disabled={mic.status === 'requesting'}
        onClick={mic.toggle}
      >
        <MicIcon />
        {mic.active ? 'Stop listening' : 'Try it with your voice'}
      </Button>
      {mic.status === 'denied' || mic.status === 'unsupported' ? (
        <p className="text-xs text-muted-foreground">No microphone, or permission was refused.</p>
      ) : null}
    </div>
  );
}

export default function SoundwaveOverview() {
  const mic = useMicrophone();
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      {/* With no stream yet, the wave runs its own motion. */}
      <Soundwave variant="dots" color="info" height={72} source={mic.stream} />
      <MicButton mic={mic} />
    </div>
  );
}
```
