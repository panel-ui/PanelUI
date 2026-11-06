'use client';

import { ScatterChart } from 'panelui-web/scatter-chart';

const CAMPAIGNS = [
  { name: 'Spring launch', spend: 4_200, revenue: 11_800, leads: 310 },
  { name: 'Podcast run', spend: 6_100, revenue: 14_900, leads: 240 },
  { name: 'Search, brand', spend: 2_300, revenue: 9_400, leads: 520 },
  { name: 'Search, generic', spend: 8_800, revenue: 17_200, leads: 610 },
  { name: 'Newsletter swap', spend: 1_200, revenue: 4_900, leads: 180 },
  { name: 'Retargeting', spend: 3_400, revenue: 13_100, leads: 280 },
  { name: 'Video pre-roll', spend: 12_400, revenue: 19_800, leads: 390 },
  { name: 'Partner bundle', spend: 5_300, revenue: 18_200, leads: 450 },
  { name: 'Conference booth', spend: 15_600, revenue: 26_400, leads: 720 },
  { name: 'Webinar series', spend: 2_900, revenue: 7_600, leads: 340 },
  { name: 'Referral bonus', spend: 3_900, revenue: 16_300, leads: 410 },
  { name: 'Display, broad', spend: 9_700, revenue: 12_200, leads: 150 },
  { name: 'Social, video', spend: 7_400, revenue: 20_100, leads: 560 },
  { name: 'Social, static', spend: 4_800, revenue: 9_900, leads: 230 },
  { name: 'Community grants', spend: 1_800, revenue: 6_200, leads: 120 },
  { name: 'Print, trade', spend: 11_200, revenue: 15_400, leads: 170 },
  { name: 'Affiliate', spend: 6_700, revenue: 22_300, leads: 640 },
  { name: 'Influencer, small', spend: 2_600, revenue: 5_500, leads: 200 },
  { name: 'Influencer, large', spend: 14_100, revenue: 31_200, leads: 830 },
  { name: 'Email winback', spend: 900, revenue: 5_800, leads: 90 },
  { name: 'Marketplace ads', spend: 10_300, revenue: 24_700, leads: 580 },
  { name: 'Sponsorship', spend: 13_000, revenue: 21_500, leads: 300 },
  { name: 'Landing page tests', spend: 1_500, revenue: 8_300, leads: 260 },
  { name: 'Holiday push', spend: 8_100, revenue: 25_600, leads: 690 },
];

const thousands = (value: number) => `$${Math.round(value / 1000)}k`;
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function ScatterChartBubbles() {
  return (
    <ScatterChart data={CAMPAIGNS} xDataKey="spend" aspectRatio={1.5} className="w-full max-w-lg">
      <ScatterChart.Grid />
      <ScatterChart.Points dataKey="revenue" sizeKey="leads" sizeRange={[3, 18]} opacity={0.55} />
      <ScatterChart.XAxis format={thousands} />
      <ScatterChart.YAxis format={thousands} />
      <ScatterChart.Tooltip
        formatTitle={(datum) => `${datum.name}, ${datum.leads} leads`}
        formatX={dollars}
        formatY={dollars}
        labels={{ spend: 'Spend', revenue: 'Revenue' }}
      />
    </ScatterChart>
  );
}
