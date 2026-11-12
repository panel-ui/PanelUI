'use client';

import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';

const APPLICATIONS: FunnelDatum[] = [
  { label: 'Applied', value: 412 },
  { label: 'Screened', value: 138 },
  { label: 'Interviewed', value: 41 },
  { label: 'Offered', value: 9 },
  { label: 'Hired', value: 6 },
];

export default function FunnelChartBarsCompact() {
  return (
    <FunnelChart
      data={APPLICATIONS}
      shape="bars"
      rowHeight={40}
      minWidth={0.06}
      color="chart-4"
      className="w-full max-w-xs"
      label="Hiring funnel for one role"
    >
      <FunnelChart.Stages />
      <FunnelChart.Labels formatValue={(value) => value.toLocaleString('en-US')} />
    </FunnelChart>
  );
}
