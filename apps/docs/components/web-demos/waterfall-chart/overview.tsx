'use client';

import { useState } from 'react';
import { Frame } from 'panelui-web/frame';
import { WaterfallChart, type WaterfallDatum, type WaterfallStep } from 'panelui-web/waterfall-chart';

const BRIDGE: WaterfallDatum[] = [
  { label: 'Q3', value: 482000, total: true },
  { label: 'New', value: 96400 },
  { label: 'Upsell', value: 41200 },
  { label: 'Churn', value: -58700 },
  { label: 'Down', value: -19300 },
  { label: 'Q4', value: 0, total: true },
];

const money = (value: number) => `$${Math.abs(value).toLocaleString('en')}`;

export default function WaterfallChartOverview() {
  const [step, setStep] = useState<WaterfallStep | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Revenue bridge</Frame.Title>
        <Frame.Action>Hover to read</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <WaterfallChart data={BRIDGE} aspectRatio={1.6} onActiveIndexChange={(_index, next) => setStep(next)}>
          <WaterfallChart.Header
            title={step ? step.label : 'Closing'}
            value={money(step ? step.value : 541600)}
            caption={step && step.kind !== 'total' ? `Balance after: ${money(step.end)}` : 'Annual run rate'}
            legend
          />
          <WaterfallChart.Grid />
          <WaterfallChart.YAxis />
          <WaterfallChart.Connectors />
          <WaterfallChart.Bars />
          <WaterfallChart.XAxis />
          <WaterfallChart.Tooltip />
        </WaterfallChart>
      </Frame.Panel>
    </Frame>
  );
}
