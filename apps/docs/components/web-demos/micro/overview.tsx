'use client';

import { useEffect, useState } from 'react';
import {
  BookmarkIcon,
  CheckIcon,
  ClockIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  Share2Icon,
  SkipBackIcon,
  SkipForwardIcon,
} from 'lucide-react';
import { Micro } from 'panelui-web/micro';

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
          {playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="fill-current" />}
        </Micro.Button>
        <Micro.Button
          variant="ghost"
          aria-label="Back 15 seconds"
          onClick={() => setTime((value) => Math.max(0, value - 15))}
        >
          <SkipBackIcon />
        </Micro.Button>
        <Micro.Button
          variant="ghost"
          aria-label="Forward 15 seconds"
          onClick={() => setTime((value) => Math.min(LENGTH, value + 15))}
        >
          <SkipForwardIcon />
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
          <PlusIcon />
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
          <BookmarkIcon />
        </Micro.Button>
        <Micro.Button variant="ghost" aria-label="Share">
          <Share2Icon />
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
            <CheckIcon />
          ) : exporting ? (
            <PauseIcon className="fill-current" />
          ) : (
            <PlayIcon className="fill-current" />
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
        <CheckIcon className="size-4 text-success-foreground" aria-hidden="true" />
      </Micro>

      <Micro className="w-80">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Micro.Input placeholder="Find a word in this episode" aria-label="Find in episode" />
        <Micro.Kbd>⌘F</Micro.Kbd>
      </Micro>
      <Micro>
        <Micro.Text value="Remove noise" label="this episode only" />
        <Micro.Switch checked={denoise} onCheckedChange={setDenoise} label="Remove noise" color="info" />
      </Micro>
      <Micro>
        <ClockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Micro.Mono>3,180</Micro.Mono>
        <Micro.Label>minutes left</Micro.Label>
      </Micro>
    </div>
  );
}
