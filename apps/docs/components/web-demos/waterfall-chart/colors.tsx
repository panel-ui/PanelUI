'use client';

import { WaterfallChart, type WaterfallDatum } from 'panelui-web/waterfall-chart';

const VARIANCE: WaterfallDatum[] = [
  { label: 'Budget', value: 210000, total: true },
  { label: 'Salaries', value: 18200 },
  { label: 'Contractors', value: -9400 },
  { label: 'Travel', value: 6300, color: 'chart-2' },
  { label: 'Software', value: -2700 },
  { label: 'Actual', value: 0, total: true },
];

export default function WaterfallChartColors() {
  return (
    <WaterfallChart
      data={VARIANCE}
      yDomain={[180000, 240000]}
      riseColor="info"
      fallColor="chart-3"
      totalColor="chart-5"
      aspectRatio={1.7}
      className="w-full max-w-lg"
    >
      <WaterfallChart.Header title="Budget variance" value="$12,400 over" legend />
      <WaterfallChart.Connectors />
      <WaterfallChart.Bars />
      <WaterfallChart.XAxis />
      <WaterfallChart.Tooltip />
    </WaterfallChart>
  );
}
