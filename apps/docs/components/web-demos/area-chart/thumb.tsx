'use client';

import { AreaChart } from 'panelui-web/area-chart';

const WEEK = [
  { day: 'M', direct: 31, search: 18 },
  { day: 'T', direct: 44, search: 26 },
  { day: 'W', direct: 38, search: 32 },
  { day: 'T', direct: 57, search: 41 },
  { day: 'F', direct: 49, search: 36 },
  { day: 'S', direct: 22, search: 15 },
  { day: 'S', direct: 26, search: 20 },
];

export default function AreaChartThumb() {
  return (
    <AreaChart data={WEEK} xDataKey="day" stacked className="w-60">
      <AreaChart.Grid rows={3} />
      <AreaChart.Area dataKey="direct" color="primary" />
      <AreaChart.Area dataKey="search" color="info" />
      <AreaChart.XAxis />
    </AreaChart>
  );
}
