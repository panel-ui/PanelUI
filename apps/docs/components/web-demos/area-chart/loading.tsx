'use client';

import { useState } from 'react';
import { AreaChart, type AreaChartStatus } from 'panelui-web/area-chart';
import { Button } from 'panelui-web/button';

const SESSIONS = [
  { hour: '08:00', direct: 210, search: 220 },
  { hour: '10:00', direct: 290, search: 400 },
  { hour: '12:00', direct: 340, search: 520 },
  { hour: '14:00', direct: 360, search: 560 },
  { hour: '16:00', direct: 320, search: 480 },
  { hour: '18:00', direct: 250, search: 330 },
];

export default function AreaChartLoading() {
  const [status, setStatus] = useState<AreaChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <AreaChart data={SESSIONS} status={status} xDataKey="hour" stacked>
        <AreaChart.Grid />
        <AreaChart.Skeleton />
        <AreaChart.Area dataKey="direct" color="primary" />
        <AreaChart.Area dataKey="search" color="info" />
        <AreaChart.XAxis />
      </AreaChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
