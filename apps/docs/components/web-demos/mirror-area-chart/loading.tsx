'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { MirrorAreaChart, type MirrorAreaChartStatus } from 'panelui-web/mirror-area-chart';

const SIGNUPS = [
  { week: 'W1', signups: 310, churned: 42 },
  { week: 'W2', signups: 380, churned: 48 },
  { week: 'W3', signups: 352, churned: 61 },
  { week: 'W4', signups: 447, churned: 55 },
  { week: 'W5', signups: 512, churned: 73 },
  { week: 'W6', signups: 498, churned: 66 },
];

export default function MirrorAreaChartLoading() {
  const [status, setStatus] = useState<MirrorAreaChartStatus>('loading');

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-4">
      <MirrorAreaChart data={SIGNUPS} xDataKey="week" status={status}>
        <MirrorAreaChart.Grid />
        <MirrorAreaChart.Skeleton />
        <MirrorAreaChart.Area dataKey="signups" label="Signups" />
        <MirrorAreaChart.Area dataKey="churned" label="Churned" side="bottom" color="chart-3" />
        <MirrorAreaChart.Baseline />
        <MirrorAreaChart.XAxis />
        <MirrorAreaChart.Tooltip />
      </MirrorAreaChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
