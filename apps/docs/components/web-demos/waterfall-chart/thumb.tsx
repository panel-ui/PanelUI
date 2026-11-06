'use client';

import { WaterfallChart, type WaterfallDatum } from 'panelui-web/waterfall-chart';

const RUN: WaterfallDatum[] = [
  { label: 'a', value: 60, total: true },
  { label: 'b', value: 24 },
  { label: 'c', value: 12 },
  { label: 'd', value: -30 },
  { label: 'e', value: 0, total: true },
];

export default function WaterfallChartThumb() {
  return (
    <WaterfallChart data={RUN} compact className="w-60">
      <WaterfallChart.Connectors />
      <WaterfallChart.Bars />
    </WaterfallChart>
  );
}
