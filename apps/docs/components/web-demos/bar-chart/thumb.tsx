'use client';

import { BarChart } from 'panelui-web/bar-chart';

const WEEK = [
  { day: 'M', visits: 31 },
  { day: 'T', visits: 44 },
  { day: 'W', visits: 38 },
  { day: 'T', visits: 57 },
  { day: 'F', visits: 49 },
  { day: 'S', visits: 22 },
  { day: 'S', visits: 26 },
];

export default function BarChartThumb() {
  return (
    <BarChart data={WEEK} xDataKey="day" className="w-60">
      <BarChart.Grid rows={3} />
      <BarChart.Bar dataKey="visits" />
      <BarChart.XAxis />
    </BarChart>
  );
}
