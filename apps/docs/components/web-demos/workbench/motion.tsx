'use client';

import { PauseIcon, PlayIcon, RepeatIcon } from 'lucide-react';
import { useState } from 'react';
import { Timeline, useTimeline, type TimelineColor } from 'panelui-web/timeline';
import { Toolbar } from 'panelui-web/toolbar';
import { Workbench } from 'panelui-web/workbench';

type Tween = { name: string; color: TimelineColor; start: number; end: number; from: number; to: number };

const TWEENS: Tween[] = [
  { name: 'Opacity', color: 'chart-2', start: 0, end: 0.35, from: 0, to: 1 },
  { name: 'Lift', color: 'info', start: 0.05, end: 0.75, from: 48, to: 0 },
  { name: 'Scale', color: 'destructive', start: 0.15, end: 0.95, from: 0.86, to: 1 },
  { name: 'Blur', color: 'warning', start: 0, end: 0.5, from: 10, to: 0 },
];

/** Where a tween is at a time: eased out, so it arrives softly. */
const at = (tween: Tween, time: number) => {
  const progress = Math.min(Math.max((time - tween.start) / (tween.end - tween.start), 0), 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  return tween.from + (tween.to - tween.from) * eased;
};

function Transport() {
  const { playing, setPlaying, time, duration, setTime } = useTimeline();
  return (
    <Toolbar variant="inline" size="sm" aria-label="Playback">
      <Toolbar.Button
        label={playing ? 'Pause' : 'Play'}
        onClick={() => {
          if (!playing && time >= duration) setTime(0);
          setPlaying(!playing);
        }}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </Toolbar.Button>
      <Toolbar.Button label="Replay" onClick={() => (setTime(0), setPlaying(true))}>
        <RepeatIcon />
      </Toolbar.Button>
    </Toolbar>
  );
}

export default function WorkbenchMotion() {
  const [tweens, setTweens] = useState(TWEENS);
  const [time, setTime] = useState(0.45);
  const value = (name: string) => at(tweens.find((tween) => tween.name === name)!, time);

  return (
    <Workbench className="h-[600px]" defaultTimelineHeight={232}>
      <Workbench.Canvas>
        <Workbench.Artboard aspect="16 / 10" className="[container-type:inline-size]">
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            {/* The card the tweens animate, drawn at the playhead's moment. */}
            <div
              className="flex w-[44cqw] flex-col gap-[2.2cqw] rounded-[3cqw] bg-card p-[2.6cqw] shadow-xl ring-1 ring-foreground/10"
              style={{
                opacity: value('Opacity'),
                transform: `translateY(${value('Lift')}%) scale(${value('Scale')})`,
                filter: `blur(${value('Blur')}px)`,
              }}
            >
              <span className="aspect-[16/7] w-full rounded-[1.8cqw]" style={{ background: 'linear-gradient(120deg, var(--chart-2), var(--chart-4))' }} />
              <span className="h-[1.8cqw] w-3/4 rounded-full bg-foreground/70" />
              <span className="h-[1.3cqw] w-1/2 rounded-full bg-muted-foreground/40" />
              <span className="mt-[1cqw] h-[4.4cqw] w-[34%] rounded-full bg-primary" />
            </div>
          </div>
        </Workbench.Artboard>
      </Workbench.Canvas>

      <Workbench.Timeline>
        <Timeline duration={1.2} time={time} onTimeChange={setTime} defaultZoom={760} minZoom={300} maxZoom={1400}>
          <Timeline.Header>
            <Transport />
            <Timeline.Time />
            <Timeline.Zoom />
          </Timeline.Header>
          <Timeline.Viewport>
            <Timeline.Ruler />
            {tweens.map((tween, index) => (
              <Timeline.Track key={tween.name} size="sm" label={tween.name}>
                <Timeline.Clip
                  variant="bar"
                  label={tween.name}
                  color={tween.color}
                  start={tween.start}
                  end={tween.end}
                  onChange={(span) => setTweens((all) => all.map((each, i) => (i === index ? { ...each, ...span } : each)))}
                >
                  <Timeline.ClipLabel className="text-[11px]">{tween.name}</Timeline.ClipLabel>
                </Timeline.Clip>
              </Timeline.Track>
            ))}
            <Timeline.Playhead />
          </Timeline.Viewport>
        </Timeline>
      </Workbench.Timeline>
    </Workbench>
  );
}
