'use client';

import { useState } from 'react';
import { ScatterChart, type ScatterChartPoint } from 'panelui-web/scatter-chart';
import { Frame } from 'panelui-web/frame';

const CAMPAIGNS = [
  { name: 'Spring launch', spend: 4_200, revenue: 11_800 },
  { name: 'Podcast run', spend: 6_100, revenue: 14_900 },
  { name: 'Search, brand', spend: 2_300, revenue: 9_400 },
  { name: 'Search, generic', spend: 8_800, revenue: 17_200 },
  { name: 'Newsletter swap', spend: 1_200, revenue: 4_900 },
  { name: 'Retargeting', spend: 3_400, revenue: 13_100 },
  { name: 'Video pre-roll', spend: 12_400, revenue: 19_800 },
  { name: 'Partner bundle', spend: 5_300, revenue: 18_200 },
  { name: 'Conference booth', spend: 15_600, revenue: 26_400 },
  { name: 'Webinar series', spend: 2_900, revenue: 7_600 },
  { name: 'Referral bonus', spend: 3_900, revenue: 16_300 },
  { name: 'Display, broad', spend: 9_700, revenue: 12_200 },
  { name: 'Social, video', spend: 7_400, revenue: 20_100 },
  { name: 'Social, static', spend: 4_800, revenue: 9_900 },
  { name: 'Community grants', spend: 1_800, revenue: 6_200 },
  { name: 'Print, trade', spend: 11_200, revenue: 15_400 },
  { name: 'Affiliate', spend: 6_700, revenue: 22_300 },
  { name: 'Influencer, small', spend: 2_600, revenue: 5_500 },
  { name: 'Influencer, large', spend: 14_100, revenue: 31_200 },
  { name: 'Email winback', spend: 900, revenue: 5_800 },
  { name: 'Marketplace ads', spend: 10_300, revenue: 24_700 },
  { name: 'Sponsorship', spend: 13_000, revenue: 21_500 },
  { name: 'Landing page tests', spend: 1_500, revenue: 8_300 },
  { name: 'Holiday push', spend: 8_100, revenue: 25_600 },
];

const thousands = (value: number) => `$${Math.round(value / 1000)}k`;
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

const spent = CAMPAIGNS.reduce((sum, row) => sum + row.spend, 0);
const earned = CAMPAIGNS.reduce((sum, row) => sum + row.revenue, 0);

export default function ScatterChartOverview() {
  const [active, setActive] = useState<ScatterChartPoint | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Spend against revenue</Frame.Title>
        <Frame.Action>{CAMPAIGNS.length} campaigns</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <ScatterChart
          data={CAMPAIGNS}
          xDataKey="spend"
          aspectRatio={1.3}
          label="Campaign spend against revenue"
          labelForDatum={(datum) => `${datum.name}: ${dollars(Number(datum.spend))} spent, ${dollars(Number(datum.revenue))} back`}
          onActivePointChange={setActive}
        >
          <ScatterChart.Header
            title={active ? String(active.datum.name) : 'Return on spend'}
            value={`${((active ? active.y / active.x : earned / spent)).toFixed(1)}x`}
            caption={active ? `${dollars(active.x)} spent, ${dollars(active.y)} back` : `${dollars(spent)} spent in total`}
          />
          <ScatterChart.Grid />
          <ScatterChart.Points dataKey="revenue" />
          <ScatterChart.XAxis format={thousands} />
          <ScatterChart.YAxis format={thousands} />
          <ScatterChart.Tooltip
            formatTitle={(datum) => String(datum.name)}
            formatX={dollars}
            formatY={dollars}
            labels={{ spend: 'Spend', revenue: 'Revenue' }}
          />
        </ScatterChart>
      </Frame.Panel>
    </Frame>
  );
}
