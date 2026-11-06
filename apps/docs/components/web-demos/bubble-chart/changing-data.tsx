'use client';

import { useRef, useState } from 'react';
import { BubbleChart, type BubbleChartHandle } from 'panelui-web/bubble-chart';
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

const NEXT = PRODUCTS.map((product, index) => ({
  ...product,
  growth: product.growth + (index % 2 ? 14 : -3),
  margin: product.margin + (index % 3 ? 6 : -5),
  revenue: Math.round(product.revenue * (index % 2 ? 1.5 : 0.7)),
}));

export default function BubbleChartChangingData() {
  const chart = useRef<BubbleChartHandle>(null);
  const [later, setLater] = useState(false);
  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <BubbleChart
        ref={chart}
        data={later ? NEXT : PRODUCTS}
        xDataKey="growth"
        yDataKey="margin"
        sizeKey="revenue"
        labelKey="code"
        aspectRatio={1.2}
        className="w-full"
      >
        <BubbleChart.Grid />
        <BubbleChart.Quadrants />
        <BubbleChart.Bubbles />
        <BubbleChart.Labels />
        <BubbleChart.XAxis format={percent} />
        <BubbleChart.YAxis format={percent} />
        <BubbleChart.Tooltip formatX={percent} formatY={percent} formatSize={thousands} />
      </BubbleChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setLater((current) => !current)}>
          {later ? 'Back to this year' : 'Next year'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
