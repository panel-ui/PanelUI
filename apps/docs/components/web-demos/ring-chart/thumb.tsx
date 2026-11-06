'use client';

import { RingChart } from 'panelui-web/ring-chart';

const GOALS = [
  { label: 'Move', value: 486, maxValue: 600 },
  { label: 'Exercise', value: 24, maxValue: 30 },
  { label: 'Stand', value: 9, maxValue: 12 },
];

export default function RingChartThumb() {
  return (
    <RingChart data={GOALS} size={140} className="w-60">
      <RingChart.Ring index={0} />
      <RingChart.Ring index={1} />
      <RingChart.Ring index={2} />
    </RingChart>
  );
}
