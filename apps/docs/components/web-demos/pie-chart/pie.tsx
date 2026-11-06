'use client';

import { PieChart } from 'panelui-web/pie-chart';

const SPEND = [
  { label: 'Rent', value: 1450 },
  { label: 'Food', value: 620 },
  { label: 'Transport', value: 210 },
  { label: 'Utilities', value: 185 },
];

export default function PieChartPie() {
  return (
    <PieChart data={SPEND} className="max-w-60">
      <PieChart.Slices />
      <PieChart.Legend />
    </PieChart>
  );
}
