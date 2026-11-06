'use client';

import { PieChart } from 'panelui-web/pie-chart';

const STORAGE = [
  { label: 'Photos', value: 82, color: 'chart-1' as const },
  { label: 'Apps', value: 41, color: 'chart-2' as const },
];

export default function PieChartKey() {
  return (
    <PieChart data={STORAGE} size={180} innerRadius={0.62} className="max-w-sm">
      <PieChart.Header title="Storage" value="123 GB" legend />
      <PieChart.Slices />
    </PieChart>
  );
}
