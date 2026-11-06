'use client';

import { WaterfallChart, type WaterfallDatum } from 'panelui-web/waterfall-chart';

const BRIDGE: WaterfallDatum[] = [
  { label: 'Q3', value: 482000, total: true },
  { label: 'New', value: 96400 },
  { label: 'Upsell', value: 41200 },
  { label: 'Churn', value: -58700 },
  { label: 'Down', value: -19300 },
  { label: 'Q4', value: 0, total: true },
];

export default function WaterfallChartValues() {
  return (
    <WaterfallChart data={BRIDGE} aspectRatio={1.5} className="w-full max-w-lg">
      <WaterfallChart.Grid />
      <WaterfallChart.YAxis />
      <WaterfallChart.Connectors />
      <WaterfallChart.Bars />
      <WaterfallChart.Values />
      <WaterfallChart.XAxis />
      <WaterfallChart.Tooltip />
    </WaterfallChart>
  );
}
