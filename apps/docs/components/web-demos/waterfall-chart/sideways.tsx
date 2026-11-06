'use client';

import { WaterfallChart, type WaterfallDatum } from 'panelui-web/waterfall-chart';

const CASH_FLOW: WaterfallDatum[] = [
  { label: 'Opening', value: 128000, total: true },
  { label: 'Receipts', value: 74500 },
  { label: 'Payroll', value: -61200 },
  { label: 'Hosting', value: -14800 },
  { label: 'Marketing', value: -22400 },
  { label: 'Tax', value: -18600 },
  { label: 'Closing', value: 0, total: true },
];

export default function WaterfallChartSideways() {
  return (
    <WaterfallChart data={CASH_FLOW} orientation="horizontal" aspectRatio={1.2} className="w-full max-w-lg">
      <WaterfallChart.Grid />
      <WaterfallChart.Connectors />
      <WaterfallChart.Bars />
      <WaterfallChart.YAxis />
      <WaterfallChart.Tooltip />
    </WaterfallChart>
  );
}
