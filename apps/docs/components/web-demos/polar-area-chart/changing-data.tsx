'use client';

import { useRef, useState } from 'react';
import { PolarAreaChart, type PolarAreaChartHandle } from 'panelui-web/polar-area-chart';
import { Button } from 'panelui-web/button';

const Q3 = [
  { label: 'Speed', value: 82 },
  { label: 'Reach', value: 54 },
  { label: 'Depth', value: 71 },
  { label: 'Cost', value: 28 },
];
const Q4 = [
  { label: 'Speed', value: 46 },
  { label: 'Reach', value: 88 },
  { label: 'Depth', value: 60 },
  { label: 'Cost', value: 74 },
];

export default function PolarAreaChartChangingData() {
  const chart = useRef<PolarAreaChartHandle>(null);
  const [later, setLater] = useState(false);

  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <PolarAreaChart ref={chart} data={later ? Q4 : Q3} size={220} maxValue={100}>
        <PolarAreaChart.Grid />
        <PolarAreaChart.Wedges />
        <PolarAreaChart.Labels />
        <PolarAreaChart.Legend />
      </PolarAreaChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setLater((current) => !current)}>
          {later ? 'Show Q3' : 'Show Q4'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
