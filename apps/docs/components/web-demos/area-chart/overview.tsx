'use client';

import { useState } from 'react';
import { AreaChart, type AreaChartDatum } from 'panelui-web/area-chart';
import { Frame } from 'panelui-web/frame';

const SESSIONS = [
  { hour: '00:00', direct: 120, search: 60, social: 30 },
  { hour: '02:00', direct: 100, search: 45, social: 25 },
  { hour: '04:00', direct: 95, search: 40, social: 20 },
  { hour: '06:00', direct: 140, search: 90, social: 50 },
  { hour: '08:00', direct: 210, search: 220, social: 100 },
  { hour: '10:00', direct: 290, search: 400, social: 150 },
  { hour: '12:00', direct: 340, search: 520, social: 190 },
  { hour: '14:00', direct: 360, search: 560, social: 210 },
  { hour: '16:00', direct: 320, search: 480, social: 180 },
  { hour: '18:00', direct: 250, search: 330, social: 120 },
  { hour: '20:00', direct: 180, search: 160, social: 70 },
  { hour: '22:00', direct: 140, search: 90, social: 40 },
];

const LABELS = { direct: 'Direct', search: 'Search', social: 'Social' };
const rowTotal = (row: AreaChartDatum) => Number(row.direct) + Number(row.search) + Number(row.social);
const dayTotal = SESSIONS.reduce((sum, row) => sum + rowTotal(row), 0);

export default function AreaChartOverview() {
  const [active, setActive] = useState<AreaChartDatum | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Sessions by channel</Frame.Title>
        <Frame.Action>Today</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <AreaChart
          data={SESSIONS}
          xDataKey="hour"
          stacked
          label="Sessions by channel, by hour"
          onActiveIndexChange={(_index, datum) => setActive(datum)}
        >
          <AreaChart.Header
            value={(active ? rowTotal(active) : dayTotal).toLocaleString('en-US')}
            caption={active ? String(active.hour) : 'All day'}
            labels={LABELS}
            legend
          />
          <AreaChart.Grid />
          <AreaChart.Area dataKey="direct" color="primary" />
          <AreaChart.Area dataKey="search" color="info" />
          <AreaChart.Area dataKey="social" color="success" />
          <AreaChart.YAxis />
          <AreaChart.XAxis />
          <AreaChart.Tooltip labels={LABELS} formatValue={(value) => value.toLocaleString('en-US')} />
        </AreaChart>
      </Frame.Panel>
    </Frame>
  );
}
