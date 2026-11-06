'use client';

import { useState } from 'react';
import { PolarAreaChart, type PolarAreaChartStatus } from 'panelui-web/polar-area-chart';
import { Button } from 'panelui-web/button';

const SCORES = [
  { label: 'Speed', value: 82 },
  { label: 'Reach', value: 54 },
  { label: 'Depth', value: 71 },
  { label: 'Cost', value: 28 },
  { label: 'Care', value: 64 },
];

export default function PolarAreaChartLoading() {
  const [status, setStatus] = useState<PolarAreaChartStatus>('loading');

  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <PolarAreaChart data={SCORES} size={220} status={status}>
        <PolarAreaChart.Skeleton />
        <PolarAreaChart.Grid />
        <PolarAreaChart.Wedges />
      </PolarAreaChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
