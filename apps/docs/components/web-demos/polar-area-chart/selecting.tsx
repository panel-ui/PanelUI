'use client';

import { useState } from 'react';
import { PolarAreaChart } from 'panelui-web/polar-area-chart';
import { Button } from 'panelui-web/button';

const SCORES = [
  { label: 'Speed', value: 82 },
  { label: 'Reach', value: 54 },
  { label: 'Depth', value: 71 },
  { label: 'Cost', value: 28 },
  { label: 'Care', value: 64 },
];

export default function PolarAreaChartSelecting() {
  const [active, setActive] = useState(-1);

  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <PolarAreaChart data={SCORES} size={220} activeIndex={active} onActiveIndexChange={setActive}>
        <PolarAreaChart.Grid />
        <PolarAreaChart.Wedges />
        <PolarAreaChart.Tooltip />
        <PolarAreaChart.Legend />
      </PolarAreaChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setActive(3)}>
          Show cost
        </Button>
        <Button variant="ghost" onClick={() => setActive(-1)}>
          Clear
        </Button>
      </div>
    </div>
  );
}
