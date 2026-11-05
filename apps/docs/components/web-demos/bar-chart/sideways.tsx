'use client';

import { BarChart } from 'panelui-web/bar-chart';

const CHANNELS = [
  { name: 'Newsletter', sent: 4_200 },
  { name: 'Push', sent: 3_100 },
  { name: 'Product', sent: 2_400 },
  { name: 'Referrals', sent: 1_800 },
  { name: 'Search', sent: 900 },
];

export default function BarChartSideways() {
  return (
    <BarChart data={CHANNELS} orientation="horizontal" barGap={0.35} className="max-w-lg">
      <BarChart.Grid />
      <BarChart.Bar dataKey="sent" color="chart-2" />
      <BarChart.YAxis />
      <BarChart.Tooltip labels={{ sent: 'Sent' }} />
    </BarChart>
  );
}
