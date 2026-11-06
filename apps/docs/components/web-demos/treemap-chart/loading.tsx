'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { TreemapChart, type TreemapChartStatus } from 'panelui-web/treemap-chart';

const SPEND = [
  { label: 'Compute', value: 18_300 },
  { label: 'Storage', value: 8_200 },
  { label: 'Network', value: 6_100 },
  { label: 'Database', value: 5_400 },
  { label: 'Logs', value: 3_700 },
  { label: 'CDN', value: 2_900 },
  { label: 'Backups', value: 2_100 },
  { label: 'Email', value: 1_500 },
];

const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function TreemapChartLoading() {
  const [status, setStatus] = useState<TreemapChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <TreemapChart data={status === 'loading' ? [] : SPEND} status={status} color="primary">
        <TreemapChart.Skeleton />
        <TreemapChart.Tiles />
        <TreemapChart.Labels formatValue={dollars} />
      </TreemapChart>
      <Button variant="outline" className="self-start" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
