'use client';

import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';

const SIGNUP: FunnelDatum[] = [
  { label: 'Visited', value: 12400 },
  { label: 'Signed up', value: 4310 },
  { label: 'Verified', value: 2980 },
  { label: 'Active', value: 1640 },
];

export default function FunnelChartStraight() {
  return (
    <div className="w-full max-w-lg">
      <FunnelChart data={SIGNUP} edges="straight" layers={1} color="info" gap={2}>
        <FunnelChart.Stages />
        <FunnelChart.Labels />
      </FunnelChart>
    </div>
  );
}
