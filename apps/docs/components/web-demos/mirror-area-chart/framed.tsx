'use client';

import { useState } from 'react';
import { Frame } from 'panelui-web/frame';
import { MirrorAreaChart } from 'panelui-web/mirror-area-chart';

const TRAFFIC = [
  { time: '08:00', down: 38, up: 6 },
  { time: '09:00', down: 112, up: 21 },
  { time: '10:00', down: 164, up: 48 },
  { time: '11:00', down: 141, up: 74 },
  { time: '12:00', down: 96, up: 18 },
  { time: '13:00', down: 128, up: 22 },
  { time: '14:00', down: 187, up: 31 },
  { time: '15:00', down: 210, up: 96 },
  { time: '16:00', down: 172, up: 40 },
  { time: '17:00', down: 84, up: 12 },
];

export default function MirrorAreaChartFramed() {
  const [index, setIndex] = useState(-1);
  const shown = TRAFFIC[index] ?? TRAFFIC[TRAFFIC.length - 1];

  return (
    <Frame variant="band" className="w-full max-w-xl">
      <Frame.Header>
        <Frame.Title>Office network</Frame.Title>
        <Frame.Action>Today, in Mbps</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <MirrorAreaChart
          data={TRAFFIC}
          xDataKey="time"
          label="Download above the line and upload below it, in megabits per second, each hour of the working day"
          onActiveIndexChange={setIndex}
        >
          <MirrorAreaChart.Header
            value={`${shown.down} ↓ · ${shown.up} ↑`}
            caption={index < 0 ? `Latest, ${shown.time}` : shown.time}
            legend
          />
          <MirrorAreaChart.Grid />
          <MirrorAreaChart.Area dataKey="down" label="Download" />
          <MirrorAreaChart.Area dataKey="up" label="Upload" side="bottom" color="chart-3" />
          <MirrorAreaChart.Baseline />
          <MirrorAreaChart.XAxis />
          <MirrorAreaChart.Tooltip formatValue={(value) => `${value} Mbps`} />
        </MirrorAreaChart>
      </Frame.Panel>
    </Frame>
  );
}
