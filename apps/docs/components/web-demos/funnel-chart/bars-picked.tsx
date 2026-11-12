'use client';

import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';

const ONBOARDING: FunnelDatum[] = [
  { label: 'Installed', value: 9600 },
  { label: 'Opened twice', value: 5100 },
  // The biggest drop in the run, in a colour of its own.
  { label: 'Connected a bank', value: 1480, color: 'destructive' },
  { label: 'Set a budget', value: 1210 },
];

export default function FunnelChartBarsPicked() {
  return (
    <FunnelChart data={ONBOARDING} shape="bars" color="chart-3" className="w-full max-w-xl" label="App onboarding funnel">
      <FunnelChart.Stages />
      <FunnelChart.Labels />
    </FunnelChart>
  );
}
