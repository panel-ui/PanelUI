'use client';

import { PieChart } from 'panelui-web/pie-chart';

const SOURCES = [
  { label: 'Search', value: 6420 },
  { label: 'Direct', value: 3180 },
  { label: 'Social', value: 1240 },
  { label: 'Email', value: 36 },
];

export default function PieChartSegments() {
  return (
    <PieChart data={SOURCES} size={208} innerRadius={0.58} padAngle={3} minAngle={6} className="max-w-sm">
      <PieChart.Slices cornerRadius={6} />
      <PieChart.Center defaultLabel="Sessions" />
      <PieChart.Legend />
    </PieChart>
  );
}
