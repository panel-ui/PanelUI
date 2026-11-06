'use client';

import { useState } from 'react';
import { ScatterChart, type ScatterChartStatus } from 'panelui-web/scatter-chart';
import { Button } from 'panelui-web/button';

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
];

const thousands = (value: number) => `$${Math.round(value / 1000)}k`;

export default function ScatterChartLoading() {
  const [status, setStatus] = useState<ScatterChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <ScatterChart data={CAMPAIGNS} status={status} xDataKey="spend" aspectRatio={1.5}>
        <ScatterChart.Grid />
        <ScatterChart.Skeleton />
        <ScatterChart.Points dataKey="revenue" />
        <ScatterChart.XAxis format={thousands} />
        <ScatterChart.YAxis format={thousands} />
      </ScatterChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
