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
import { ChoiceCards } from 'panelui-web/choice-cards';
import { Inspector } from 'panelui-web/inspector';
import { Slider } from 'panelui-web/slider';
import { Switch } from 'panelui-web/switch';
import { Timeline, useTimeline } from 'panelui-web/timeline';
import { Toolbar } from 'panelui-web/toolbar';
import { Workbench, useWorkbench } from 'panelui-web/workbench';
import { XYPad, type XYPadPoint } from 'panelui-web/xy-pad';

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
