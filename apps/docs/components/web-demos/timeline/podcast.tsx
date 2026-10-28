'use client';

import { useState } from 'react';
import { Timeline, type TimelineColor } from 'panelui-web/timeline';

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

const VOICES: { name: string; color: TimelineColor; parts: [number, number][]; seed: number }[] = [
  { name: 'Mariam', color: 'chart-1', parts: [[0, 34], [61, 96], [140, 172]], seed: 11 },
  { name: 'Joel', color: 'chart-2', parts: [[33, 62], [97, 118], [171, 200]], seed: 29 },
  { name: 'Ines', color: 'chart-3', parts: [[118, 141]], seed: 53 },
];

export default function TimelinePodcast() {
  const [voices, setVoices] = useState(VOICES);
  return (
    <Timeline duration={200} defaultZoom={4.2} defaultTime={64}>
      <Timeline.Header>
        <Timeline.Time />
        <Timeline.Zoom />
      </Timeline.Header>
      <Timeline.Viewport>
        <Timeline.Ruler />
        {voices.map((voice, v) => (
          <Timeline.Track key={voice.name} size="md" label={voice.name}>
            {voice.parts.map(([start, end], p) => (
              <Timeline.Clip
                key={p}
                variant="media"
                color={voice.color}
                label={voice.name}
                start={start}
                end={end}
                onChange={(span) =>
                  setVoices((all) =>
                    all.map((each, i) =>
                      i === v ? { ...each, parts: each.parts.map((part, j) => (j === p ? [span.start, span.end] : part)) } : each
                    )
                  )
                }
              >
                <Timeline.Waveform peaks={speech(Math.round((end - start) * 1.6), voice.seed + p)} />
                {p === 0 ? <Timeline.ClipLabel className="absolute start-1">{voice.name}</Timeline.ClipLabel> : null}
              </Timeline.Clip>
            ))}
          </Timeline.Track>
        ))}
        <Timeline.Playhead color="destructive" />
      </Timeline.Viewport>
    </Timeline>
  );
}
