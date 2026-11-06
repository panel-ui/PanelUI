'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { FunnelChart, type FunnelChartHandle, type FunnelDatum } from 'panelui-web/funnel-chart';

const PERIODS: Record<'This week' | 'Last week', FunnelDatum[]> = {
  'This week': [
    { label: 'Viewed', value: 41800 },
    { label: 'Basket', value: 18240 },
    { label: 'Checkout', value: 9420 },
    { label: 'Paid', value: 5240 },
  ],
  'Last week': [
    { label: 'Viewed', value: 36200 },
    { label: 'Basket', value: 21100 },
    { label: 'Checkout', value: 7300 },
    { label: 'Paid', value: 2900 },
  ],
};

export default function FunnelChartChangingData() {
  const chart = useRef<FunnelChartHandle>(null);
  const [period, setPeriod] = useState<keyof typeof PERIODS>('This week');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <FunnelChart ref={chart} data={PERIODS[period]} className="w-full">
        <FunnelChart.Header title={period} />
        <FunnelChart.Stages />
        <FunnelChart.Labels />
      </FunnelChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setPeriod(period === 'This week' ? 'Last week' : 'This week')}>
          Show {period === 'This week' ? 'last week' : 'this week'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
