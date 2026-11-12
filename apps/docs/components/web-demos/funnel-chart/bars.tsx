'use client';

import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';

const SIGNUP: FunnelDatum[] = [
  { label: 'Opened the invite', value: 18400 },
  { label: 'Created an account', value: 6120 },
  { label: 'Verified email', value: 3870 },
  { label: 'Invited a teammate', value: 1240 },
];

export default function FunnelChartBars() {
  return (
    <FunnelChart data={SIGNUP} shape="bars" color="chart-2" className="w-full max-w-xl" label="Team sign-up funnel">
      <FunnelChart.Stages />
      <FunnelChart.Labels />
    </FunnelChart>
  );
}
