'use client';

import { PieChart } from 'panelui-web/pie-chart';

const STORAGE = [
  { label: 'Photos', value: 82 },
  { label: 'Apps', value: 41 },
  { label: 'System', value: 18 },
];

export default function PieChartDial() {
  return (
    <PieChart
      data={STORAGE}
      size={208}
      innerRadius={0.66}
      startAngle={-135}
      endAngle={135}
      padAngle={2}
      className="max-w-sm"
    >
      <PieChart.Slices cornerRadius={4} />
      <PieChart.Center defaultLabel="Used" formatValue={(gb) => `${gb.toFixed(0)} GB`} />
      <PieChart.Legend />
    </PieChart>
  );
}
