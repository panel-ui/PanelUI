'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { WaterfallChart, type WaterfallChartStatus, type WaterfallDatum } from 'panelui-web/waterfall-chart';

const BRIDGE: WaterfallDatum[] = [
  { label: 'Q3', value: 482000, total: true },
  { label: 'New', value: 96400 },
  { label: 'Upsell', value: 41200 },
  { label: 'Churn', value: -58700 },
  { label: 'Down', value: -19300 },
  { label: 'Q4', value: 0, total: true },
];

export default function WaterfallChartLoading() {
  const [status, setStatus] = useState<WaterfallChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <WaterfallChart data={BRIDGE} status={status}>
        <WaterfallChart.Grid />
        <WaterfallChart.Skeleton />
        <WaterfallChart.Connectors />
        <WaterfallChart.Bars />
        <WaterfallChart.XAxis />
      </WaterfallChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
