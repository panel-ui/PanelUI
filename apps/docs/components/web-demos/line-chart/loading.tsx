'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { LineChart, type LineChartStatus } from 'panelui-web/line-chart';

const VISITS = [
  { date: 'Mar', visits: 1_240 },
  { date: 'Apr', visits: 1_480 },
  { date: 'May', visits: 1_390 },
  { date: 'Jun', visits: 1_720 },
  { date: 'Jul', visits: 1_660 },
  { date: 'Aug', visits: 2_040 },
];

export default function LineChartLoading() {
  const [status, setStatus] = useState<LineChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <LineChart data={VISITS} status={status}>
        <LineChart.Grid />
        <LineChart.Skeleton />
        <LineChart.Area dataKey="visits" />
        <LineChart.Line dataKey="visits" />
        <LineChart.XAxis />
      </LineChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
