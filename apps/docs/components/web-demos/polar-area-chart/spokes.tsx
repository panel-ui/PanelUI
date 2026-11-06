'use client';

import { PolarAreaChart } from 'panelui-web/polar-area-chart';

const SCORES = [
  { label: 'Speed', value: 82 },
  { label: 'Reach', value: 54 },
  { label: 'Depth', value: 71 },
  { label: 'Cost', value: 28 },
  { label: 'Care', value: 64 },
];

export default function PolarAreaChartSpokes() {
  return (
    <PolarAreaChart data={SCORES} size={240} padAngle={4} startAngle={-30} className="max-w-sm">
      <PolarAreaChart.Grid spokes />
      <PolarAreaChart.Wedges cornerRadius={4} />
      <PolarAreaChart.Labels />
    </PolarAreaChart>
  );
}
