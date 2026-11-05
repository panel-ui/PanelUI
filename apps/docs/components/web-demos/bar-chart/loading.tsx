'use client';

import { useState } from 'react';
import { BarChart, type BarChartStatus } from 'panelui-web/bar-chart';
import { Button } from 'panelui-web/button';

const REVENUE = [
  { month: 'Mar', revenue: 19_800 },
  { month: 'Apr', revenue: 24_600 },
  { month: 'May', revenue: 27_100 },
  { month: 'Jun', revenue: 25_300 },
  { month: 'Jul', revenue: 29_900 },
  { month: 'Aug', revenue: 32_400 },
];

export default function BarChartLoading() {
  const [status, setStatus] = useState<BarChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <BarChart data={REVENUE} status={status} xDataKey="month">
        <BarChart.Grid />
        <BarChart.Skeleton />
        <BarChart.Bar dataKey="revenue" />
        <BarChart.XAxis />
      </BarChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
