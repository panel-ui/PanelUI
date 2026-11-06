'use client';

import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';

const SIGNUP: FunnelDatum[] = [
  { label: 'Visited', value: 12400 },
  { label: 'Signed up', value: 4310 },
  { label: 'Verified', value: 2980 },
  { label: 'Active', value: 1640 },
];

export default function FunnelChartCompact() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <FunnelChart data={SIGNUP} height={120} gap={3}>
        <FunnelChart.Stages />
        <FunnelChart.Legend />
      </FunnelChart>
      <FunnelChart data={SIGNUP} height={120} gap={3}>
        <FunnelChart.Stages />
        <FunnelChart.Legend layout="inline" />
      </FunnelChart>
    </div>
  );
}
