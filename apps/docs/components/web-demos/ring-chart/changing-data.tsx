'use client';

import { useRef, useState } from 'react';
import { RingChart, type RingChartHandle } from 'panelui-web/ring-chart';
import { Button } from 'panelui-web/button';

const MORNING = [
  { label: 'Move', value: 140, maxValue: 600 },
  { label: 'Exercise', value: 6, maxValue: 30 },
];
const EVENING = [
  { label: 'Move', value: 520, maxValue: 600 },
  { label: 'Exercise', value: 27, maxValue: 30 },
];

export default function RingChartChangingData() {
  const chart = useRef<RingChartHandle>(null);
  const [evening, setEvening] = useState(false);

  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <RingChart ref={chart} data={evening ? EVENING : MORNING} size={208}>
        <RingChart.Ring index={0} />
        <RingChart.Ring index={1} />
        <RingChart.Center />
        <RingChart.Legend />
      </RingChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setEvening((current) => !current)}>
          {evening ? 'Show morning' : 'Show evening'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
