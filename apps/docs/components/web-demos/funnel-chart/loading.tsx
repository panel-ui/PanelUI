'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { FunnelChart, type FunnelChartStatus, type FunnelDatum } from 'panelui-web/funnel-chart';

const CHECKOUT: FunnelDatum[] = [
  { label: 'Viewed', value: 41800 },
  { label: 'Basket', value: 18240 },
  { label: 'Checkout', value: 9420 },
  { label: 'Paid', value: 5240 },
];

export default function FunnelChartLoading() {
  const [status, setStatus] = useState<FunnelChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <FunnelChart data={status === 'loading' ? [] : CHECKOUT} status={status}>
        <FunnelChart.Header title="Viewed" value={status === 'loading' ? 'None yet' : '41,800'} />
        <FunnelChart.Skeleton />
        <FunnelChart.Stages />
        <FunnelChart.Labels />
      </FunnelChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
