# Workbench

The frame of an editor: a canvas with the work on it, a toolbar over it, an inspector beside it and a timeline under it.

```tsx
import { Workbench } from "@/components/panelui/workbench"
```

From npm the path is `panelui-web/workbench`. Install with `npx shadcn@latest add @panelui/workbench`.

## When to use it

Use it as the frame of an editor in the browser: a screen-recording editor, a poster designer, an animation tool. It lays out the canvas with the work on it, a toolbar floating over the canvas, an [Inspector](/docs/web/components/inspector) beside it, a sidebar before it and a [Timeline](/docs/web/components/timeline) under it. Use only the parts the editor needs; a column that is not there takes no room.

It fills the box it is given, so give it a height: `h-dvh` for a whole page, a fixed height in a layout.

Below 760 pixels wide, `compactBelow` by default, the inspector leaves its column and opens as a [Sheet](/docs/web/components/sheet) from the side; put a `Workbench.InspectorTrigger` in the bar to open it. Focus slides every panel away and gives the canvas the room, and `\` toggles it.

## Usage

```tsx
<Workbench className="h-dvh">
  <Workbench.Bar>
    <Toolbar>…</Toolbar>
  </Workbench.Bar>
  <Workbench.Canvas>
    <Workbench.Artboard aspect="16 / 10">…</Workbench.Artboard>
  </Workbench.Canvas>
  <Workbench.Inspector>
    <Inspector>…</Inspector>
  </Workbench.Inspector>
  <Workbench.Timeline>
    <Timeline duration={130}>…</Timeline>
  </Workbench.Timeline>
</Workbench>
```

## Parts

```tsx
<Workbench>
  <Workbench.Bar>
    <Toolbar>
      <Workbench.InspectorTrigger />
    </Toolbar>
  </Workbench.Bar>
  <Workbench.Sidebar />
  <Workbench.Canvas>
    <Workbench.Artboard />
  </Workbench.Canvas>
  <Workbench.Inspector>
    <Inspector />
  </Workbench.Inspector>
  <Workbench.Timeline>
    <Timeline />
  </Workbench.Timeline>
</Workbench>
```

- `Workbench.Bar` — The strip floating at the top of the canvas, for a [Toolbar](/docs/web/components/toolbar). The canvas keeps the room under it clear, so the work is never behind it.
- `Workbench.Sidebar` — A column before the canvas, for layers, pages or assets. It is left out on a narrow screen and slides away in focus.
- `Workbench.Canvas` — The stage: a field of dots with the work centred on it.
- `Workbench.Artboard` — The work, at the largest size its `aspect` fits on the canvas, with a shadow to stand off the dots.
- `Workbench.Inspector` — The column after the canvas, for an Inspector. On a narrow screen the same children open in a sheet from the side, headed by `title`.
- `Workbench.InspectorTrigger` — The button that opens the inspector's sheet. It only renders while the inspector is a sheet, so it can sit in the bar on every size.
- `Workbench.Timeline` — The row under everything, for a Timeline. Dragging its top edge, or the arrow keys on it, makes it taller or shorter.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `WorkbenchProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `focus` | `boolean` | — | Whether the panels are cleared away, when the caller holds it. |
| `defaultFocus` | `boolean` | `false` | Whether it starts in focus. Default false. |
| `onFocusChange` | `(focus: boolean) => void` | — | Called when focus turns on or off. |
| `focusShortcut` | `boolean` | `true` | Toggle focus with the `\` key while nothing is being typed. Default true. |
| `compactBelow` | `number` | `760` | Below this many pixels wide, the inspector opens as a sheet. Default 760. |
| `inspectorWidth` | `number` | `348` | The inspector column's width in pixels. Default 348, a rail and a panel. |
| `sidebarWidth` | `number` | `240` | The sidebar's width in pixels. Default 240. |
| `defaultTimelineHeight` | `number` | `232` | The timeline's height in pixels to start at. Default 232. |

#### `WorkbenchArtboardProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `aspect` | `string` | — | The work's shape, as a CSS aspect ratio such as `16 / 9` or `4 / 5`. Default `16 / 9`. |

#### `WorkbenchInspectorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `string` | — | The sheet's heading on a narrow screen, read out when it opens. Default `Inspector`. |

#### `WorkbenchTimelineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `resizable` | `boolean` | — | Let its top edge be dragged to make it taller or shorter. Default true. |
| `minHeight` | `number` | — | The shortest it can be dragged to, in pixels. Default 140. |

## In a Server Component

`Workbench` is a client component. A Server Component cannot read `Workbench.Bar` off the import, so import each part by name: `WorkbenchBar`, `WorkbenchSidebar`, `WorkbenchCanvas`, `WorkbenchArtboard`, `WorkbenchInspector`, `WorkbenchInspectorTrigger`, `WorkbenchTimeline`.

## Notes

#### Focus

`\` toggles focus while nothing is being typed; `focusShortcut={false}` turns that off. `focus`, `defaultFocus` and `onFocusChange` hold it, and `useWorkbench()` gives a toolbar button the same switch, as in the first example. Panels that have slid away cannot be reached with the keyboard.

#### Sizes

`inspectorWidth` and `sidebarWidth` set the columns, 348 and 240 pixels by default; 348 fits an Inspector with its rail. `defaultTimelineHeight` sets where the timeline starts, and it can be dragged from 140 pixels up to 60% of the workbench.

#### Narrow screens

The width that decides is the workbench's own, not the window's, so a workbench in a pane changes with the pane.

With reduced motion turned on, panels appear and disappear without sliding.

## Example

```tsx
'use client';

import {
  CropIcon,
  HandIcon,
  ImageIcon,
  Maximize2Icon,
  Minimize2Icon,
  MousePointer2Icon,
  PauseIcon,
  PlayIcon,
  Redo2Icon,
  ScanSearchIcon,
  TypeIcon,
  Undo2Icon,
  VideoIcon,
  Volume2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { ChoiceCards } from '@/components/panelui/choice-cards';
import { Inspector } from '@/components/panelui/inspector';
import { Slider } from '@/components/panelui/slider';
import { Switch } from '@/components/panelui/switch';
import { Timeline, useTimeline } from '@/components/panelui/timeline';
import { Toolbar } from '@/components/panelui/toolbar';
import { Workbench, useWorkbench } from '@/components/panelui/workbench';
import { XYPad, type XYPadPoint } from '@/components/panelui/xy-pad';

type Span = { id: string; start: number; end: number };

const PERCENT = { style: 'unit', unit: 'percent' } as const;
const BACKDROPS = {
  lagoon: 'linear-gradient(140deg, var(--chart-2), var(--chart-3))',
  dusk: 'linear-gradient(140deg, var(--chart-1), var(--chart-4))',
  plain: 'var(--muted)',
};
const CUTS: Span[] = [
  { id: 'c1', start: 3, end: 19 },
  { id: 'c2', start: 22, end: 37 },
  { id: 'c3', start: 50, end: 63 },
  { id: 'c4', start: 75, end: 94 },
  { id: 'c5', start: 98, end: 118 },
];
const ZOOMS: Span[] = [
  { id: 'z1', start: 12, end: 20 },
  { id: 'z2', start: 56, end: 66.4 },
  { id: 'z3', start: 101, end: 109 },
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
const PEAKS = speech(240, 3);

/** The recording on the artboard: an app window on the backdrop, with the pointer where the lead puts it. */
function Recording({ backdrop, padding, lead }: { backdrop: keyof typeof BACKDROPS; padding: number; lead: XYPadPoint }) {
  return (
    <div className="absolute inset-0" style={{ background: BACKDROPS[backdrop] }}>
      <div
        className="absolute flex flex-col overflow-hidden rounded-[6%/9%] bg-card shadow-2xl ring-1 ring-black/10 transition-[inset] duration-300"
        style={{ inset: `${padding}%` }}
      >
        <div className="flex h-[9%] shrink-0 items-center gap-[1.2%] border-b px-[2.5%]">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="aspect-square h-[34%] rounded-full bg-muted-foreground/30" />
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[22%_1fr] gap-[3%] p-[3%]">
          <div className="flex flex-col gap-[9%]">
            {[70, 55, 80, 45, 62].map((width, at) => (
              <span key={at} className="h-[6%] rounded-full bg-muted" style={{ width: `${width}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-[4%]">
            {['chart-1', 'chart-2', 'chart-5', 'chart-3', 'chart-4', 'chart-2'].map((tone, at) => (
              <span key={at} className="rounded-[10%] bg-muted p-[8%]">
                <span className="block h-1/3 w-2/3 rounded-full opacity-70" style={{ background: `var(--${tone})` }} />
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* The pointer, placed by the inspector's lead pad. */}
      <span
        className="absolute aspect-square w-[4.5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 transition-[left,top] duration-300 ring-[3px] ring-white"
        style={{ left: `${50 + lead.x * 40}%`, top: `${50 - lead.y * 40}%` }}
      />
    </div>
  );
}

function Tools() {
  const { focus, setFocus } = useWorkbench();
  return (
    <Toolbar aria-label="Editor">
      <Toolbar.Group defaultValue="select" aria-label="Tools">
        <Toolbar.Tool value="select" label="Select" shortcut="V">
          <MousePointer2Icon />
        </Toolbar.Tool>
        <Toolbar.Tool value="pan" label="Pan" shortcut="H">
          <HandIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="crop" label="Crop" shortcut="C">
          <CropIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="zoom" label="Add a zoom" shortcut="Z">
          <ScanSearchIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="text" label="Text" shortcut="T">
          <TypeIcon />
        </Toolbar.Tool>
      </Toolbar.Group>
      <Toolbar.Separator />
      <Toolbar.Button label={focus ? 'Leave focus' : 'Focus'} shortcut="\" onClick={() => setFocus(!focus)}>
        {focus ? <Minimize2Icon /> : <Maximize2Icon />}
      </Toolbar.Button>
      <Workbench.InspectorTrigger />
    </Toolbar>
  );
}

function Transport() {
  const { playing, setPlaying } = useTimeline();
  return (
    <Toolbar variant="inline" size="sm" aria-label="Playback">
      <Toolbar.Button label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>
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

export default function WorkbenchOverview() {
  const [backdrop, setBackdrop] = useState<keyof typeof BACKDROPS>('lagoon');
  const [padding, setPadding] = useState(9);
  const [lead, setLead] = useState<XYPadPoint>({ x: 0.3, y: -0.15 });
  const [cuts, setCuts] = useState(CUTS);
  const [zooms, setZooms] = useState(ZOOMS);
  const [take, setTake] = useState({ start: 0, end: 124 });
  const update = (set: typeof setCuts, id: string) => (span: { start: number; end: number }) =>
    set((all) => all.map((each) => (each.id === id ? { ...each, ...span } : each)));

  return (
    <Workbench className="h-[720px]" defaultTimelineHeight={272}>
      <Workbench.Bar>
        <Tools />
      </Workbench.Bar>

      <Workbench.Canvas>
        <Workbench.Artboard aspect="16 / 10">
          <Recording backdrop={backdrop} padding={padding} lead={lead} />
        </Workbench.Artboard>
      </Workbench.Canvas>

      <Workbench.Inspector>
        <Inspector defaultValue="pointer">
          <Inspector.Rail>
            <Inspector.Tab value="backdrop" label="Backdrop">
              <ImageIcon />
            </Inspector.Tab>
            <Inspector.Tab value="pointer" label="Pointer">
              <MousePointer2Icon />
            </Inspector.Tab>
            <Inspector.Tab value="camera" label="Camera">
              <VideoIcon />
            </Inspector.Tab>
            <Inspector.Tab value="audio" label="Audio">
              <Volume2Icon />
            </Inspector.Tab>
          </Inspector.Rail>
          <Inspector.Panel>
            <Inspector.Page value="pointer">
              <Inspector.Section>
                <Inspector.SectionTitle>Click sound</Inspector.SectionTitle>
                <Inspector.SectionAction>
                  <Switch size="sm" label="Click sound" defaultChecked />
                </Inspector.SectionAction>
                <Inspector.SectionContent>
                  <Slider label="Volume" defaultValue={36} format={PERCENT} />
                </Inspector.SectionContent>
              </Inspector.Section>
              <Inspector.Separator />
              <Inspector.Section>
                <Inspector.SectionTitle>Lead</Inspector.SectionTitle>
                <Inspector.SectionContent>
                  <XYPad label="Lead" value={lead} onValueChange={setLead} aspect="16 / 10" />
                  <Slider label="Smoothing" defaultValue={64} format={PERCENT} />
                  <Slider label="Size" min={0.5} max={3} step={0.05} defaultValue={1.4} format={(v) => `${v.toFixed(2)}×`} />
                </Inspector.SectionContent>
              </Inspector.Section>
            </Inspector.Page>
            <Inspector.Page value="backdrop">
              <Inspector.Section>
                <Inspector.SectionTitle>Backdrop</Inspector.SectionTitle>
                <Inspector.SectionContent>
                  <ChoiceCards
                    value={backdrop}
                    onValueChange={(value) => setBackdrop(value as keyof typeof BACKDROPS)}
                    aspect="1 / 1"
                    aria-label="Backdrop"
                  >
                    {(Object.keys(BACKDROPS) as (keyof typeof BACKDROPS)[]).map((key) => (
                      <ChoiceCards.Item key={key} value={key}>
                        <ChoiceCards.Media>
                          <span className="size-full" style={{ background: BACKDROPS[key] }} />
                        </ChoiceCards.Media>
                        <ChoiceCards.Label className="capitalize">{key}</ChoiceCards.Label>
                      </ChoiceCards.Item>
                    ))}
                  </ChoiceCards>
                  <Slider label="Padding" min={0} max={20} value={padding} onValueChange={setPadding} format={PERCENT} />
                </Inspector.SectionContent>
              </Inspector.Section>
            </Inspector.Page>
            <Inspector.Page value="camera">
              <Inspector.Section>
                <Inspector.SectionTitle>Show camera</Inspector.SectionTitle>
                <Inspector.SectionAction>
                  <Switch size="sm" label="Show camera" />
                </Inspector.SectionAction>
              </Inspector.Section>
            </Inspector.Page>
            <Inspector.Page value="audio">
              <Inspector.Section>
                <Inspector.SectionTitle>Levels</Inspector.SectionTitle>
                <Inspector.SectionContent>
                  <Slider label="Voice" defaultValue={82} format={PERCENT} />
                  <Slider label="Music" defaultValue={20} format={PERCENT} />
                </Inspector.SectionContent>
              </Inspector.Section>
            </Inspector.Page>
          </Inspector.Panel>
        </Inspector>
      </Workbench.Inspector>

      <Workbench.Timeline>
        <Timeline duration={130} defaultZoom={7} defaultTime={54}>
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
                <Timeline.Clip key={zoom.id} label="Zoom" color="chart-2" start={zoom.start} end={zoom.end} onChange={update(setZooms, zoom.id)} />
              ))}
            </Timeline.Track>
            <Timeline.Track size="lg" label="Recording">
              <Timeline.Clip label="Onboarding walkthrough" color="info" start={take.start} end={take.end} onChange={setTake}>
                <Timeline.Waveform peaks={PEAKS} />
                <Timeline.ClipLabel>
                  <VideoIcon />
                  Onboarding walkthrough
                </Timeline.ClipLabel>
              </Timeline.Clip>
            </Timeline.Track>
            <Timeline.Playhead />
          </Timeline.Viewport>
        </Timeline>
      </Workbench.Timeline>
    </Workbench>
  );
}
```
