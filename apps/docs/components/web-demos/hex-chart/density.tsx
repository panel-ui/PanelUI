'use client';

import { HexChart } from 'panelui-web/hex-chart';

const ATTRIBUTION = [
  { label: 'Organic', value: 2_880 },
  { label: 'Paid search', value: 1_740 },
  { label: 'Referral', value: 1_120 },
  { label: 'Email', value: 640 },
  { label: 'Social', value: 370 },
];

export default function HexChartDensity() {
  return (
    <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
      <HexChart data={ATTRIBUTION} columns={12} density={0.7} aspectRatio={1.3}>
        <HexChart.Header title="12 columns, 70% full" />
        <HexChart.Cells />
        <HexChart.Tooltip />
      </HexChart>
      <HexChart data={ATTRIBUTION} columns={30} density={0.4} aspectRatio={1.3}>
        <HexChart.Header title="30 columns, 40% full" />
        <HexChart.Cells />
        <HexChart.Tooltip />
      </HexChart>
    </div>
  );
}
