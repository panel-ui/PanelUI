'use client';

import { PolarAreaChart } from 'panelui-web/polar-area-chart';

const SCORES = [
  { label: 'Speed', value: 82 },
  { label: 'Reach', value: 54 },
  { label: 'Depth', value: 71 },
  { label: 'Cost', value: 28 },
  { label: 'Care', value: 64 },
];

export default function PolarAreaChartScale() {
  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-4">
      <PolarAreaChart data={SCORES} scale="radius">
        <PolarAreaChart.Header title="radius" />
        <PolarAreaChart.Grid />
        <PolarAreaChart.Wedges />
      </PolarAreaChart>
      <PolarAreaChart data={SCORES} scale="area">
        <PolarAreaChart.Header title="area" />
        <PolarAreaChart.Grid />
        <PolarAreaChart.Wedges />
      </PolarAreaChart>
    </div>
  );
}
