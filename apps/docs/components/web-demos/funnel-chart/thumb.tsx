'use client';

import { FunnelChart } from 'panelui-web/funnel-chart';

const STAGES = [
  { label: 'Viewed', value: 100 },
  { label: 'Basket', value: 58 },
  { label: 'Checkout', value: 34 },
  { label: 'Paid', value: 21 },
];

export default function FunnelChartThumb() {
  return (
    <FunnelChart data={STAGES} height={120} className="w-60">
      <FunnelChart.Stages />
    </FunnelChart>
  );
}
