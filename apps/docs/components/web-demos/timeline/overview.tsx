'use client';

import { PauseIcon, PlayIcon, Redo2Icon, ScanSearchIcon, Undo2Icon, VideoIcon } from 'lucide-react';
import { useState } from 'react';
import { Timeline, useTimeline } from 'panelui-web/timeline';
import { Toolbar } from 'panelui-web/toolbar';

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
            <Timeline.Clip key={zoom.id} label="Zoom" color="chart-2" start={zoom.start} end={zoom.end} onChange={update(setZooms, zoom.id)}>
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
