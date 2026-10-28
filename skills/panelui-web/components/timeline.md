# Timeline

Time laid out left to right: tracks of clips under a ruler, with a playhead.

```tsx
import { Timeline } from "@/components/panelui/timeline"
```

From npm the path is `panelui-web/timeline`. Install with `npx shadcn@latest add @panelui/timeline`.

## When to use it

Use it to edit or show things placed in time: the cuts and zooms of a screen recording, the tweens of an animation, the voices of a podcast. Tracks of clips sit under a ruler, and a playhead marks the current moment.

A clip given `onChange` can be moved by its middle and trimmed by either end. It stops at its neighbours on the same track, and snaps to other clips' edges, the playhead and the ends, with a guide line while it does.

It needs a width to lay time across; the height follows the tracks. For a value that moves along a range without clips, use a [Slider](/docs/web/components/slider).

## Usage

```tsx
<Timeline duration={140} defaultZoom={7}>
  <Timeline.Header>
    <Timeline.Time />
    <Timeline.Zoom />
  </Timeline.Header>
  <Timeline.Viewport>
    <Timeline.Ruler />
    <Timeline.Track label="Zooms">
      <Timeline.Clip color="chart-4" start={zoom.start} end={zoom.end} onChange={setZoom} />
    </Timeline.Track>
    <Timeline.Track size="lg" label="Recording">
      <Timeline.Clip color="info" start={0} end={128}>
        <Timeline.Waveform peaks={peaks} />
        <Timeline.ClipLabel>Take 3</Timeline.ClipLabel>
      </Timeline.Clip>
    </Timeline.Track>
    <Timeline.Playhead />
  </Timeline.Viewport>
</Timeline>
```

## Parts

```tsx
<Timeline>
  <Timeline.Header>
    <Timeline.Time />
    <Timeline.Zoom />
  </Timeline.Header>
  <Timeline.Viewport>
    <Timeline.Ruler />
    <Timeline.Track>
      <Timeline.Clip>
        <Timeline.Waveform />
        <Timeline.ClipLabel />
      </Timeline.Clip>
    </Timeline.Track>
    <Timeline.Playhead />
  </Timeline.Viewport>
</Timeline>
```

- `Timeline.Header` — A row above the tracks, for a toolbar, the time and the zoom. `useTimeline()` gives a toolbar placed here the time, playback and zoom.
- `Timeline.Time` — The playhead's time, in minutes, seconds and tenths, and the length after it.
- `Timeline.Zoom` — A line [Slider](/docs/web/components/slider) between zoom out and zoom in. It runs on a log scale, so each stretch of it zooms by the same factor.
- `Timeline.Viewport` — The part that scrolls sideways, holding the ruler, the tracks and the playhead. Pinch, or ⌘ or Ctrl with the wheel, zooms about the pointer. A strip of diagonal lines marks the time past the end.
- `Timeline.Ruler` — Ticks and times along the top. Its labels stay at least 64 pixels apart at any zoom. Pressing or dragging on it moves the playhead.
- `Timeline.Track` — A row of clips that cannot overlap. `size` sets its height: `sm` for bars, `md` for blocks, `lg` for media. `label` names it for a screen reader.
- `Timeline.Clip` — One clip from `start` to `end`, in seconds. `variant` is `bar`, `block` or `media`, and follows the track's size unless set. `color` takes a theme colour. With `onChange` it can be moved and trimmed, and `onRemove` is called on Delete.
- `Timeline.ClipLabel` — Words on a clip, with an icon: its length, its name, its speed. A block with a label leaves out its grips.
- `Timeline.Waveform` — Loudness across a media clip, from `peaks` between 0 and 1, drawn mirrored about the middle.
- `Timeline.Playhead` — The line at the current time. Its head shows the time and can be dragged, and with focus the arrow keys step it and Space plays and pauses.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `TimelineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `duration` | `number` | **required** | How long the timeline is, in seconds. |
| `time` | `number` | — | Where the playhead is, in seconds, when the caller holds it. |
| `defaultTime` | `number` | `0` | Where the playhead starts, when the caller does not hold it. Default 0. |
| `onTimeChange` | `(time: number) => void` | — | Called with the new time when the playhead moves: scrubbed, stepped or playing. |
| `zoom` | `number` | — | Pixels per second, when the caller holds it. |
| `defaultZoom` | `number` | `12` | Pixels per second to start at. Default 12. |
| `onZoomChange` | `(zoom: number) => void` | — | Called with the new zoom. |
| `minZoom` | `number` | `2` | The furthest out it zooms, in pixels per second. Default 2. |
| `maxZoom` | `number` | `120` | The furthest in it zooms, in pixels per second. Default 120. |
| `playing` | `boolean` | — | Whether time is running, when the caller holds it. |
| `onPlayingChange` | `(playing: boolean) => void` | — | Called when playback starts or stops, including when it reaches the end. |
| `loop` | `boolean` | `false` | Start again from the beginning on reaching the end, instead of stopping. |
| `snap` | `boolean` | `true` | Snap clip edges to other edges, the playhead and the ends. Default true. |
| `readOnly` | `boolean` | `false` | Show it without letting clips be moved or trimmed. The playhead still moves. |

#### `TimelineTimeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `showDuration` | `boolean` | — | Show the length after the time, as `1:32 / 2:30`. Default true. |

#### `TimelineTrackProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `TimelineTrackSize` | — | The height of the row: `sm` for bars, `md` for blocks, `lg` for media. Default `md`. |
| `label` | `string` | — | What the track holds, for a screen reader: "Zooms", "Voice". |

#### `TimelineClipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `start` | `number` | **required** | Where it starts, in seconds. |
| `end` | `number` | **required** | Where it ends, in seconds. |
| `onChange` | `(span: { start: number; end: number }) => void` | — | Called with the new span while it is moved or trimmed. Without it the clip stays put. |
| `onChangeEnd` | `(span: { start: number; end: number }) => void` | — | Called once a move or a trim ends. |
| `onRemove` | `() => void` | — | Called on Delete or Backspace while the clip has focus. |
| `variant` | `TimelineClipVariant` | — | `bar`, `block` or `media`. Default: `bar` on a small track, `media` on a large one, `block` otherwise. |
| `color` | `TimelineColor` | `'primary'` | Its colour, from the theme. Default `primary`. |
| `label` | `string` | — | What a screen reader calls it, before its times. |

#### `TimelineWaveformProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `peaks` | `number[]` | **required** | Loudness along the clip, each from 0 to 1. Drawn mirrored about the middle. |

#### `TimelinePlayheadProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `TimelineColor` | `'primary'` | The colour of the line and its head. Default `primary`. |
| `showTime` | `boolean` | — | Write the time in the head. Default true. |

## In a Server Component

`Timeline` is a client component. A Server Component cannot read `Timeline.Header` off the import, so import each part by name: `TimelineHeader`, `TimelineTime`, `TimelineZoom`, `TimelineViewport`, `TimelineRuler`, `TimelineTrack`, `TimelineClip`, `TimelineClipLabel`, `TimelineWaveform`, `TimelinePlayhead`.

## Notes

#### Snapping

While a clip is moved or trimmed, an edge within 8 pixels of another clip's edge, the playhead or either end of the timeline snaps to it, and a guide line marks where. `snap={false}` turns it off.

#### Keyboard

A clip takes focus. The left and right arrows move it by a tenth of a second, a second with Shift, and Delete calls `onRemove`. The playhead's head is a slider: the arrows step it, Home and End go to the ends, and Space plays and pauses.

#### Time and zoom

Times are in seconds. `zoom` is in pixels per second, from `minZoom` to `maxZoom`; at 7, a two-minute recording is about 840 pixels wide. `time`, `zoom` and `playing` can each be held by the caller, with `onTimeChange`, `onZoomChange` and `onPlayingChange`.

With reduced motion turned on, clips do not swell while they are dragged.

## Example

```tsx
'use client';

import { PauseIcon, PlayIcon, Redo2Icon, ScanSearchIcon, Undo2Icon, VideoIcon } from 'lucide-react';
import { useState } from 'react';
import { Timeline, useTimeline } from '@/components/panelui/timeline';
import { Toolbar } from '@/components/panelui/toolbar';

type Span = { id: string; start: number; end: number };

const CUTS: Span[] = [
  { id: 'c1', start: 4, end: 21 },
  { id: 'c2', start: 24, end: 38 },
  { id: 'c3', start: 52, end: 61 },
  { id: 'c4', start: 77, end: 96 },
  { id: 'c5', start: 99, end: 108 },
  { id: 'c6', start: 121, end: 139 },
];
const ZOOMS: Span[] = [
  { id: 'z1', start: 15, end: 22.5 },
  { id: 'z2', start: 63, end: 70 },
  { id: 'z3', start: 112, end: 121.4 },
];

/** Loudness for speech: phrases with breaths between them. Seeded, so every render draws the same. */
function speech(count: number, seed: number) {
  let state = seed;
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const peaks: number[] = [];
  for (let at = 0, left = 0, phrase = 1, pause = false; at < count; at++, left--) {
    if (left <= 0) {
      pause = !pause && random() < 0.35;
      left = phrase = pause ? 2 + Math.floor(random() * 4) : 10 + Math.floor(random() * 22);
    }
    const swell = Math.sin(Math.PI * (1 - left / phrase)) * 0.55 + 0.3;
    peaks.push(pause ? 0.04 + random() * 0.05 : Math.min(1, swell * (0.55 + random() * 0.6)));
  }
  return peaks;
}

const PEAKS = speech(260, 7);

/** The play button reads and drives the timeline it sits in. */
function Transport() {
  const { playing, setPlaying } = useTimeline();
  return (
    <Toolbar variant="inline" size="sm" aria-label="Playback">
      <Toolbar.Button label={playing ? 'Pause' : 'Play'} shortcut="Space" onClick={() => setPlaying(!playing)}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </Toolbar.Button>
      <Toolbar.Separator />
      <Toolbar.Button label="Undo" shortcut="⌘Z">
        <Undo2Icon />
      </Toolbar.Button>
      <Toolbar.Button label="Redo" shortcut="⇧⌘Z" disabled>
        <Redo2Icon />
      </Toolbar.Button>
    </Toolbar>
  );
}

export default function TimelineOverview() {
  const [cuts, setCuts] = useState(CUTS);
  const [zooms, setZooms] = useState(ZOOMS);
  const [take, setTake] = useState({ start: 0, end: 128 });
  const update = (set: typeof setCuts, id: string) => (span: { start: number; end: number }) =>
    set((all) => all.map((each) => (each.id === id ? { ...each, ...span } : each)));

  return (
    <Timeline duration={140} defaultTime={58} defaultZoom={7}>
      <Timeline.Header>
        <Transport />
        <Timeline.Time />
        <Timeline.Zoom />
      </Timeline.Header>
      <Timeline.Viewport>
        <Timeline.Ruler />
        <Timeline.Track size="sm" label="Cuts">
          {cuts.map((cut) => (
            <Timeline.Clip key={cut.id} label="Cut" color="warning" start={cut.start} end={cut.end} onChange={update(setCuts, cut.id)} />
          ))}
        </Timeline.Track>
        <Timeline.Track label="Zooms">
          {zooms.map((zoom) => (
            <Timeline.Clip key={zoom.id} label="Zoom" color="chart-4" start={zoom.start} end={zoom.end} onChange={update(setZooms, zoom.id)}>
              {zoom.end - zoom.start >= 9 ? (
                <Timeline.ClipLabel>
                  <ScanSearchIcon />
                  {(zoom.end - zoom.start).toFixed(1)}s
                </Timeline.ClipLabel>
              ) : null}
            </Timeline.Clip>
          ))}
        </Timeline.Track>
        <Timeline.Track size="lg" label="Recording">
          <Timeline.Clip label="Take 3" color="info" start={take.start} end={take.end} onChange={setTake}>
            <Timeline.Waveform peaks={PEAKS} />
            <Timeline.ClipLabel>
              <VideoIcon />
              Take 3 · {Math.floor((take.end - take.start) / 60)}m {String(Math.round((take.end - take.start) % 60)).padStart(2, '0')}s
            </Timeline.ClipLabel>
          </Timeline.Clip>
        </Timeline.Track>
        <Timeline.Playhead />
      </Timeline.Viewport>
    </Timeline>
  );
}
```
