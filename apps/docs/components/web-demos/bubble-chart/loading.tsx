'use client';

import { useState } from 'react';
import { BubbleChart } from 'panelui-web/bubble-chart';
import { Button } from 'panelui-web/button';

const PRODUCTS = [
  { name: 'Atlas', code: 'AT', growth: 42, margin: 31, revenue: 840 },
  { name: 'Beacon', code: 'BE', growth: 18, margin: 44, revenue: 1_260 },
  { name: 'Cinder', code: 'CI', growth: 7, margin: 12, revenue: 310 },
  { name: 'Drift', code: 'DR', growth: 33, margin: 22, revenue: 520 },
  { name: 'Ember', code: 'EM', growth: 12, margin: 28, revenue: 690 },
  { name: 'Fathom', code: 'FA', growth: 54, margin: 38, revenue: 980 },
  { name: 'Gale', code: 'GA', growth: 25, margin: 16, revenue: 180 },
  { name: 'Harbor', code: 'HA', growth: 38, margin: 47, revenue: 1_480 },
  { name: 'Isle', code: 'IS', growth: 4, margin: 35, revenue: 430 },
  { name: 'Juno', code: 'JU', growth: 47, margin: 18, revenue: 260 },
];

const percent = (value: number) => `${value}%`;
const thousands = (value: number) => `$${value.toLocaleString('en-US')}k`;

export default function BubbleChartLoading() {
  const [ready, setReady] = useState(false);
  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <BubbleChart
        data={ready ? PRODUCTS : []}
        status={ready ? 'ready' : 'loading'}
        xDataKey="growth"
        yDataKey="margin"
        sizeKey="revenue"
        labelKey="code"
        aspectRatio={1.2}
        className="w-full"
      >
        <BubbleChart.Grid />
        <BubbleChart.Skeleton />
        <BubbleChart.Bubbles />
        <BubbleChart.Labels />
        <BubbleChart.XAxis format={percent} />
        <BubbleChart.YAxis format={percent} />
        <BubbleChart.Tooltip formatX={percent} formatY={percent} formatSize={thousands} />
      </BubbleChart>
      <Button variant="outline" onClick={() => setReady((current) => !current)}>
        {ready ? 'Load again' : 'Finish loading'}
      </Button>
    </div>
  );
}
