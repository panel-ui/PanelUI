'use client';

import { useState } from 'react';
import { Frame } from 'panelui-web/frame';
import { LineChart, type LineChartDatum } from 'panelui-web/line-chart';

const VISITS = [
  { date: 'Mar 1', visits: 1_240 },
  { date: 'Mar 8', visits: 1_480 },
  { date: 'Mar 15', visits: 1_390 },
  { date: 'Mar 22', visits: 1_720 },
  { date: 'Mar 29', visits: 1_660 },
  { date: 'Apr 5', visits: 2_040 },
  { date: 'Apr 12', visits: 1_910 },
  { date: 'Apr 19', visits: 2_380 },
  { date: 'Apr 26', visits: 2_610 },
];

const latest = VISITS[VISITS.length - 1];
const count = (value: number) => value.toLocaleString('en-US');

export default function LineChartOverview() {
  const [active, setActive] = useState<LineChartDatum | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Weekly visits</Frame.Title>
        <Frame.Action>Drag to inspect</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <LineChart data={VISITS} onActiveIndexChange={(_index, datum) => setActive(datum)}>
          <LineChart.Header
            value={count(Number((active ?? latest).visits))}
            caption={active ? `Week of ${active.date}` : 'Latest week'}
          />
          <LineChart.Grid />
          <LineChart.Area dataKey="visits" />
          <LineChart.Line dataKey="visits" />
          <LineChart.YAxis />
          <LineChart.XAxis />
          <LineChart.Tooltip showLabel={false} />
        </LineChart>
      </Frame.Panel>
    </Frame>
  );
}
