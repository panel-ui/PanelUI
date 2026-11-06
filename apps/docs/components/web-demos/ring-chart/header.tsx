'use client';

import { RingChart } from 'panelui-web/ring-chart';

const GOALS = [
  { label: 'Protein', value: 92, maxValue: 120 },
  { label: 'Fibre', value: 18, maxValue: 30 },
];

export default function RingChartHeaderDemo() {
  return (
    <RingChart data={GOALS} size={180} className="max-w-sm">
      <RingChart.Header title="Today" value="1,640 kcal" caption="Goal 2,100" legend />
      <RingChart.Ring index={0} />
      <RingChart.Ring index={1} />
      <RingChart.Center />
    </RingChart>
  );
}
