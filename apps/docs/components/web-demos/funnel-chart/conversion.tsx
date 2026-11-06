'use client';

import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';

const CHECKOUT: FunnelDatum[] = [
  { label: 'Viewed', value: 41800 },
  { label: 'Basket', value: 18240 },
  { label: 'Checkout', value: 9420 },
  { label: 'Paid', value: 5240 },
];

export default function FunnelChartConversion() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <FunnelChart data={CHECKOUT}>
        <FunnelChart.Header title="Share of the first stage" />
        <FunnelChart.Stages />
        <FunnelChart.Labels share="top" />
      </FunnelChart>
      <FunnelChart data={CHECKOUT}>
        <FunnelChart.Header title="Share of the stage above" />
        <FunnelChart.Stages />
        <FunnelChart.Labels share="previous" />
      </FunnelChart>
    </div>
  );
}
