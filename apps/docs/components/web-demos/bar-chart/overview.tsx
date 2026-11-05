'use client';

import { useState } from 'react';
import { BarChart, type BarChartDatum } from 'panelui-web/bar-chart';
import { Frame } from 'panelui-web/frame';

const REVENUE = [
  { month: 'Jan', revenue: 18_400 },
  { month: 'Feb', revenue: 21_200 },
  { month: 'Mar', revenue: 19_800 },
  { month: 'Apr', revenue: 24_600 },
  { month: 'May', revenue: 27_100 },
  { month: 'Jun', revenue: 25_300 },
  { month: 'Jul', revenue: 29_900 },
  { month: 'Aug', revenue: 32_400 },
];

const total = REVENUE.reduce((sum, row) => sum + row.revenue, 0);
const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function BarChartOverview() {
  const [active, setActive] = useState<BarChartDatum | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Revenue</Frame.Title>
        <Frame.Action>2026</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <BarChart data={REVENUE} xDataKey="month" onActiveIndexChange={(_index, datum) => setActive(datum)}>
          <BarChart.Header
            title={active ? String(active.month) : 'January to August'}
            value={dollars(active ? Number(active.revenue) : total)}
          />
          <BarChart.Grid />
          <BarChart.Bar dataKey="revenue" />
          <BarChart.YAxis />
          <BarChart.XAxis />
          <BarChart.Tooltip labels={{ revenue: 'Revenue' }} formatValue={dollars} />
        </BarChart>
      </Frame.Panel>
    </Frame>
  );
}
