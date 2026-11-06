'use client';

import { useState } from 'react';
import { BumpChart, type BumpChartStatus } from 'panelui-web/bump-chart';
import { Button } from 'panelui-web/button';

const LEAGUE = [
  { week: 'w32', harbour: 3, northside: 2, kestrel: 1, oldMill: 4 },
  { week: 'w33', harbour: 2, northside: 3, kestrel: 1, oldMill: 4 },
  { week: 'w34', harbour: 2, northside: 1, kestrel: 3, oldMill: 4 },
  { week: 'w35', harbour: 1, northside: 2, kestrel: 4, oldMill: 3 },
  { week: 'Now', harbour: 1, northside: 2, kestrel: 3, oldMill: 4 },
];

export default function BumpChartLoading() {
  const [status, setStatus] = useState<BumpChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <BumpChart data={LEAGUE} xDataKey="week" status={status} defaultHighlight="harbour" aspectRatio={2}>
        <BumpChart.Grid />
        <BumpChart.Skeleton />
        <BumpChart.Line dataKey="harbour" label="Harbour" color="chart-2" />
        <BumpChart.Line dataKey="northside" label="Northside" />
        <BumpChart.Line dataKey="kestrel" label="Kestrel" />
        <BumpChart.Line dataKey="oldMill" label="Old Mill" />
        <BumpChart.YAxis />
        <BumpChart.XAxis ticks={5} />
        <BumpChart.Labels />
        <BumpChart.Tooltip />
      </BumpChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
