'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { SankeyChart, type SankeyChartStatus, type SankeyLink, type SankeyNode } from 'panelui-web/sankey-chart';

const STAGES: SankeyNode[] = [
  { id: 'search', label: 'Search' },
  { id: 'social', label: 'Social' },
  { id: 'direct', label: 'Direct' },
  { id: 'docs', label: 'Docs' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'signup', label: 'Signed up' },
  { id: 'left', label: 'Left' },
];

const FLOWS: SankeyLink[] = [
  { source: 'search', target: 'docs', value: 26_000 },
  { source: 'search', target: 'pricing', value: 16_000 },
  { source: 'social', target: 'docs', value: 9_000 },
  { source: 'social', target: 'pricing', value: 22_000 },
  { source: 'direct', target: 'docs', value: 12_000 },
  { source: 'direct', target: 'pricing', value: 13_000 },
  { source: 'docs', target: 'signup', value: 14_000 },
  { source: 'docs', target: 'left', value: 33_000 },
  { source: 'pricing', target: 'signup', value: 21_000 },
  { source: 'pricing', target: 'left', value: 30_000 },
];

export default function SankeyChartLoading() {
  const [status, setStatus] = useState<SankeyChartStatus>('loading');

  return (
    <div className="flex w-full max-w-2xl flex-col items-start gap-4">
      <SankeyChart nodes={STAGES} links={FLOWS} height={300} status={status}>
        <SankeyChart.Skeleton />
        <SankeyChart.Links />
        <SankeyChart.Nodes />
        <SankeyChart.Labels />
      </SankeyChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
