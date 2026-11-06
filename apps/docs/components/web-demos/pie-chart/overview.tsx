'use client';

import { useState } from 'react';
import { PieChart } from 'panelui-web/pie-chart';
import { Frame } from 'panelui-web/frame';

const SPEND = [
  { label: 'Rent', value: 1450 },
  { label: 'Food', value: 620 },
  { label: 'Transport', value: 210 },
  { label: 'Utilities', value: 185 },
  { label: 'Everything else', value: 240 },
];

const total = SPEND.reduce((sum, slice) => sum + slice.value, 0);
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function PieChartOverview() {
  const [active, setActive] = useState(-1);
  const slice = active >= 0 ? SPEND[active] : undefined;

  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Spending</Frame.Title>
        <Frame.Action>August</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <PieChart data={SPEND} size={208} innerRadius={0.62} onActiveIndexChange={setActive}>
          <PieChart.Header
            title={slice ? slice.label : 'All categories'}
            value={dollars(slice ? slice.value : total)}
          />
          <PieChart.Slices />
          <PieChart.Center formatValue={dollars} />
          <PieChart.Legend />
        </PieChart>
      </Frame.Panel>
    </Frame>
  );
}
