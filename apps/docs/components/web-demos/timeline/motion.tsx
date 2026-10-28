'use client';

import { useState } from 'react';
import { Timeline, type TimelineColor } from 'panelui-web/timeline';

/** Each property of a card's entrance, tweened over its own stretch of time. */
const PROPERTIES: { name: string; color: TimelineColor; start: number; end: number }[] = [
  { name: 'Opacity', color: 'chart-2', start: 0, end: 0.4 },
  { name: 'Lift', color: 'info', start: 0.1, end: 0.9 },
  { name: 'Scale', color: 'destructive', start: 0.25, end: 1.1 },
  { name: 'Blur', color: 'warning', start: 0, end: 0.6 },
];

export default function TimelineMotion() {
  const [tweens, setTweens] = useState(PROPERTIES);
  return (
    <Timeline duration={1.6} defaultZoom={300} minZoom={150} maxZoom={600} defaultTime={0.5}>
      <Timeline.Header>
        <Timeline.Time />
        <Timeline.Zoom />
      </Timeline.Header>
      <Timeline.Viewport>
        <Timeline.Ruler />
        {tweens.map((tween, at) => (
          <Timeline.Track key={tween.name} size="sm" label={tween.name}>
            <Timeline.Clip
              variant="bar"
              label={tween.name}
              color={tween.color}
              start={tween.start}
              end={tween.end}
              onChange={(span) => setTweens((all) => all.map((each, i) => (i === at ? { ...each, ...span } : each)))}
            >
              <Timeline.ClipLabel className="text-[11px]">{tween.name}</Timeline.ClipLabel>
            </Timeline.Clip>
          </Timeline.Track>
        ))}
        <Timeline.Playhead />
      </Timeline.Viewport>
    </Timeline>
  );
}
