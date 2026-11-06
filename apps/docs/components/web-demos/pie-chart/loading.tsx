'use client';

import { useState } from 'react';
import { PieChart, type PieChartStatus } from 'panelui-web/pie-chart';
import { Button } from 'panelui-web/button';

const SPEND = [
  { label: 'Rent', value: 1450 },
  { label: 'Food', value: 620 },
  { label: 'Transport', value: 210 },
  { label: 'Everything else', value: 240 },
];

export default function PieChartLoading() {
  const [status, setStatus] = useState<PieChartStatus>('loading');

  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <PieChart data={SPEND} status={status} size={208} innerRadius={0.62}>
        <PieChart.Skeleton />
        <PieChart.Slices />
        <PieChart.Center />
      </PieChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
