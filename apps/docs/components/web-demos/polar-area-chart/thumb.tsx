'use client';

import { PolarAreaChart } from 'panelui-web/polar-area-chart';

const SCORES = [
  { label: 'Speed', value: 82 },
  { label: 'Reach', value: 54 },
  { label: 'Depth', value: 71 },
  { label: 'Cost', value: 28 },
  { label: 'Care', value: 64 },
];

export default function PolarAreaChartThumb() {
  return (
    <PolarAreaChart data={SCORES} size={140} className="w-60">
      <PolarAreaChart.Grid rings={3} />
      <PolarAreaChart.Wedges />
    </PolarAreaChart>
  );
}
