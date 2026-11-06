'use client';

import { useState } from 'react';
import { RingChart } from 'panelui-web/ring-chart';
import { Button } from 'panelui-web/button';

const GOALS = [
  { label: 'Move', value: 486, maxValue: 600 },
  { label: 'Exercise', value: 24, maxValue: 30 },
  { label: 'Stand', value: 9, maxValue: 12 },
];

export default function RingChartSelecting() {
  const [active, setActive] = useState(-1);

  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <RingChart data={GOALS} size={208} activeIndex={active} onActiveIndexChange={setActive}>
        <RingChart.Ring index={0} />
        <RingChart.Ring index={1} />
        <RingChart.Ring index={2} />
        <RingChart.Center />
        <RingChart.Legend />
      </RingChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setActive(1)}>
          Show exercise
        </Button>
        <Button variant="ghost" onClick={() => setActive(-1)}>
          Clear
        </Button>
      </div>
    </div>
  );
}
