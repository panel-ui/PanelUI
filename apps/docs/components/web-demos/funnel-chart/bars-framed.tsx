'use client';

import { useState } from 'react';
import { FunnelChart, type FunnelDatum } from 'panelui-web/funnel-chart';
import { Frame } from 'panelui-web/frame';

const ORDERS: FunnelDatum[] = [
  { label: 'Product page', value: 52300 },
  { label: 'Added to bag', value: 14900 },
  { label: 'Checkout', value: 8120 },
  { label: 'Payment', value: 6340 },
  { label: 'Order placed', value: 5870 },
];

const OVERALL = (ORDERS.at(-1)!.value / ORDERS[0]!.value) * 100;

export default function FunnelChartBarsFramed() {
  const [index, setIndex] = useState(-1);
  const stage = ORDERS[index];

  return (
    <Frame variant="band" className="w-full max-w-xl">
      <Frame.Header>
        <Frame.Title>Store funnel</Frame.Title>
        <Frame.Action>{OVERALL.toFixed(1)}% bought</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <FunnelChart
          data={ORDERS}
          shape="bars"
          rowHeight={52}
          color="chart-1"
          label="Store funnel for the last 30 days"
          onActiveIndexChange={setIndex}
        >
          <FunnelChart.Header
            title={stage ? stage.label : 'Product page'}
            value={(stage ?? ORDERS[0]!).value.toLocaleString('en-US')}
            caption="Last 30 days"
          />
          <FunnelChart.Stages />
          <FunnelChart.Labels />
        </FunnelChart>
      </Frame.Panel>
    </Frame>
  );
}
