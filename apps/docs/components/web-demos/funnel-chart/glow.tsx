'use client';

import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';

const HIGHLIGHTED: FunnelDatum[] = [
  { label: 'Viewed', value: 41800 },
  { label: 'Basket', value: 18240 },
  { label: 'Address', value: 9420 },
  { label: 'Card', value: 6180 },
  { label: 'Paid', value: 5240, color: 'success' },
];

export default function FunnelChartGlow() {
  return (
    <div className="w-full max-w-lg">
      <FunnelChart data={HIGHLIGHTED} layers={5} height={230}>
        <FunnelChart.Header title="Order placed" value="5,240" caption="Paid, as a share of everyone who looked" />
        <FunnelChart.Stages />
        <FunnelChart.Labels />
      </FunnelChart>
    </div>
  );
}
