'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { HexChart } from 'panelui-web/hex-chart';

const ATTRIBUTION = [
  { label: 'Organic', value: 2_880 },
  { label: 'Paid search', value: 1_740 },
  { label: 'Referral', value: 1_120 },
  { label: 'Email', value: 640 },
  { label: 'Social', value: 370 },
];

export default function HexChartLoading() {
  const [ready, setReady] = useState(false);
  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <HexChart data={ready ? ATTRIBUTION : []} status={ready ? 'ready' : 'loading'} className="w-full">
        <HexChart.Skeleton />
        <HexChart.Cells />
        <HexChart.Tooltip />
      </HexChart>
      <Button variant="outline" onClick={() => setReady((current) => !current)}>
        {ready ? 'Load again' : 'Finish loading'}
      </Button>
    </div>
  );
}
