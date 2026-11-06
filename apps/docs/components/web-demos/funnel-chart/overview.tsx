'use client';

import { useState } from 'react';
import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';
import { Frame } from 'panelui-web/frame';

const CHECKOUT: FunnelDatum[] = [
  { label: 'Viewed', value: 41800 },
  { label: 'Basket', value: 18240 },
  { label: 'Address', value: 9420 },
  { label: 'Card', value: 6180 },
  { label: 'Paid', value: 5240 },
];

export default function FunnelChartOverview() {
  const [active, setActive] = useState<FunnelDatum | null>(null);
  const stage = active ?? CHECKOUT[0]!;

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Checkout</Frame.Title>
        <Frame.Action>Hover to read</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <FunnelChart data={CHECKOUT} height={240} onActiveIndexChange={(_index, next) => setActive(next)}>
          <FunnelChart.Header title={stage.label} value={stage.value.toLocaleString('en')} caption="Last 30 days" />
          <FunnelChart.Stages />
          <FunnelChart.Labels />
        </FunnelChart>
      </Frame.Panel>
    </Frame>
  );
}
