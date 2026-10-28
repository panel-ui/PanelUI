'use client';

import { Timeline } from 'panelui-web/timeline';

export default function TimelineThumb() {
  return (
    <Timeline duration={40} defaultZoom={7} defaultTime={17} readOnly className="w-72">
      <Timeline.Viewport>
        <Timeline.Ruler />
        <Timeline.Track size="sm">
          <Timeline.Clip color="warning" start={1} end={11} />
          <Timeline.Clip color="warning" start={13} end={20} />
          <Timeline.Clip color="warning" start={24} end={34} />
        </Timeline.Track>
        <Timeline.Track>
          <Timeline.Clip color="chart-2" start={8} end={14} />
          <Timeline.Clip color="chart-2" start={26} end={31} />
        </Timeline.Track>
        <Timeline.Playhead showTime={false} />
      </Timeline.Viewport>
    </Timeline>
  );
}
