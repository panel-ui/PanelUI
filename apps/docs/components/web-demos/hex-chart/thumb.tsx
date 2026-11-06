'use client';

import { HexChart } from 'panelui-web/hex-chart';

const SPLIT = [
  { label: 'One', value: 50 },
  { label: 'Two', value: 30 },
  { label: 'Three', value: 20 },
];

export default function HexChartThumb() {
  return (
    <HexChart data={SPLIT} columns={13} className="w-60">
      <HexChart.Cells />
    </HexChart>
  );
}
