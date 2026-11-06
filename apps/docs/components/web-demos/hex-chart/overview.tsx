'use client';

import { useState } from 'react';
import { HexChart } from 'panelui-web/hex-chart';
import { Frame } from 'panelui-web/frame';

const ATTRIBUTION = [
  { label: 'Organic', value: 2_880 },
  { label: 'Paid search', value: 1_740 },
  { label: 'Referral', value: 1_120 },
  { label: 'Email', value: 640 },
  { label: 'Social', value: 370 },
];

const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

const total = ATTRIBUTION.reduce((sum, { value }) => sum + value, 0);

export default function HexChartOverview() {
  const [active, setActive] = useState(-1);
  const series = ATTRIBUTION[active];
  return (
    <Frame className="w-full max-w-lg" variant="band">
      <Frame.Header>
        <Frame.Title>Attribution</Frame.Title>
        <Frame.Action>This quarter</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <HexChart data={ATTRIBUTION} label="Revenue by channel" onActiveIndexChange={setActive}>
          <HexChart.Header
            title={series ? series.label : 'Attributed revenue'}
            value={dollars(series ? series.value : total)}
            caption={series ? `${Math.round((series.value / total) * 100)}% of the total` : 'Across five channels'}
          />
          <HexChart.Cells />
          <HexChart.Tooltip formatValue={dollars} />
          <HexChart.Legend />
        </HexChart>
      </Frame.Panel>
    </Frame>
  );
}
