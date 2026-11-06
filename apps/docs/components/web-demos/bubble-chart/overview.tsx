'use client';

import { useState } from 'react';
import { BubbleChart, type BubbleChartPoint } from 'panelui-web/bubble-chart';
import { Frame } from 'panelui-web/frame';

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

const total = PRODUCTS.reduce((sum, { revenue }) => sum + revenue, 0);

export default function BubbleChartOverview() {
  const [active, setActive] = useState<BubbleChartPoint | null>(null);
  return (
    <Frame className="w-full max-w-lg" variant="band">
      <Frame.Header>
        <Frame.Title>Product portfolio</Frame.Title>
        <Frame.Action>{PRODUCTS.length} products</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <BubbleChart
          data={PRODUCTS}
          xDataKey="growth"
          yDataKey="margin"
          sizeKey="revenue"
          labelKey="code"
          aspectRatio={1.2}
          label="Products by growth, margin and revenue"
          labelForDatum={(datum) => `${datum.name}: ${datum.growth}% growth, ${datum.margin}% margin, ${thousands(Number(datum.revenue))} revenue`}
          onActivePointChange={setActive}
        >
          <BubbleChart.Header
            title={active ? String(active.datum.name) : 'Revenue'}
            value={thousands(active?.size ?? total)}
            caption={active ? `${active.x}% growth, ${active.y}% margin` : 'Area shows revenue'}
          />
          <BubbleChart.Grid />
          <BubbleChart.Bubbles />
          <BubbleChart.Labels />
          <BubbleChart.XAxis format={percent} />
          <BubbleChart.YAxis format={percent} />
          <BubbleChart.Tooltip
            formatX={percent}
            formatY={percent}
            formatSize={thousands}
            labels={{ growth: 'Growth', margin: 'Margin', revenue: 'Revenue' }}
          />
        </BubbleChart>
      </Frame.Panel>
    </Frame>
  );
}
