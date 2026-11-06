'use client';

import { useRef, useState } from 'react';
import { ScatterChart, type ScatterChartHandle } from 'panelui-web/scatter-chart';
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
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

// The same campaigns a quarter later: spend is up and returns have thinned.
const NEXT_QUARTER = CAMPAIGNS.map((row, index) => ({
  ...row,
  spend: Math.round(row.spend * (1.5 + (index % 5) * 0.2)),
  revenue: Math.round(row.revenue * (1.1 + (index % 4) * 0.25)),
}));

export default function ScatterChartChangingData() {
  const chart = useRef<ScatterChartHandle>(null);
  const [later, setLater] = useState(false);

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <ScatterChart ref={chart} data={later ? NEXT_QUARTER : CAMPAIGNS} xDataKey="spend" aspectRatio={1.5}>
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
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setLater(!later)}>
          {later ? 'Back to this quarter' : 'Next quarter'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
