'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { HexChart, type HexChartHandle } from 'panelui-web/hex-chart';

const ATTRIBUTION = [
  { label: 'Organic', value: 2_880 },
  { label: 'Paid search', value: 1_740 },
  { label: 'Referral', value: 1_120 },
  { label: 'Email', value: 640 },
  { label: 'Social', value: 370 },
];

const NEXT = [
  { label: 'Organic', value: 1_900 },
  { label: 'Paid search', value: 2_600 },
  { label: 'Referral', value: 700 },
  { label: 'Email', value: 1_300 },
  { label: 'Social', value: 620 },
];

export default function HexChartChangingData() {
  const chart = useRef<HexChartHandle>(null);
  const [later, setLater] = useState(false);
  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <HexChart ref={chart} data={later ? NEXT : ATTRIBUTION} className="w-full">
        <HexChart.Cells />
        <HexChart.Tooltip />
        <HexChart.Legend />
      </HexChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setLater((current) => !current)}>
          {later ? 'Back to this quarter' : 'Next quarter'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
