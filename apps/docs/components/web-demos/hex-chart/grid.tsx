'use client';

import { HexChart } from 'panelui-web/hex-chart';

const SEATS = [
  { label: 'Engineering', value: 48 },
  { label: 'Sales', value: 26 },
  { label: 'Support', value: 14 },
  { label: 'Design', value: 12 },
];

export default function HexChartGrid() {
  return (
    <HexChart data={SEATS} shape="grid" columns={14} aspectRatio={2} className="w-full max-w-lg">
      <HexChart.Cells />
      <HexChart.Tooltip showCells formatValue={(value) => `${value} seats`} />
      <HexChart.Legend />
    </HexChart>
  );
}
