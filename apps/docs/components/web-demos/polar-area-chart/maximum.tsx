'use client';

import { PolarAreaChart } from 'panelui-web/polar-area-chart';

const LOW = [
  { label: 'North', value: 12 },
  { label: 'East', value: 30 },
  { label: 'South', value: 22 },
  { label: 'West', value: 8 },
];

export default function PolarAreaChartMaximum() {
  return (
    <PolarAreaChart data={LOW} size={240} maxValue={100} className="max-w-sm">
      <PolarAreaChart.Header title="Out of 100" />
      <PolarAreaChart.Grid />
      <PolarAreaChart.Wedges />
      <PolarAreaChart.Tooltip />
    </PolarAreaChart>
  );
}
