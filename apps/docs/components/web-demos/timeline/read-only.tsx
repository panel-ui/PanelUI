'use client';

import { CaptionsIcon, MusicIcon } from 'lucide-react';
import { Timeline } from 'panelui-web/timeline';

export default function TimelineReadOnly() {
  return (
    <Timeline duration={95} defaultZoom={7} defaultTime={31} readOnly>
      <Timeline.Viewport>
        <Timeline.Ruler />
        <Timeline.Track size="sm" label="Captions">
          {[
            [2, 9],
            [10, 18],
            [21, 30],
            [33, 41],
            [44, 57],
            [60, 66],
            [70, 83],
            [86, 93],
          ].map(([start, end]) => (
            <Timeline.Clip key={start} color="chart-3" start={start!} end={end!} label="Caption" />
          ))}
        </Timeline.Track>
        <Timeline.Track label="Music">
          <Timeline.Clip variant="media" color="chart-5" start={0} end={64} label="Opening theme">
            <Timeline.ClipLabel>
              <MusicIcon />
              Opening theme
            </Timeline.ClipLabel>
          </Timeline.Clip>
          <Timeline.Clip variant="media" color="chart-2" start={64} end={95} label="Outro">
            <Timeline.ClipLabel>
              <CaptionsIcon />
              Outro
            </Timeline.ClipLabel>
          </Timeline.Clip>
        </Timeline.Track>
        <Timeline.Playhead />
      </Timeline.Viewport>
    </Timeline>
  );
}
