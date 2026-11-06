'use client';

import { LineChart } from 'panelui-web/line-chart';

const WEEK = [
  { day: 'M', visits: 31 },
  { day: 'T', visits: 44 },
  { day: 'W', visits: 38 },
  { day: 'T', visits: 57 },
  { day: 'F', visits: 49 },
  { day: 'S', visits: 62 },
  { day: 'S', visits: 71 },
];

export default function LineChartThumb() {
  return (
    <LineChart data={WEEK} xDataKey="day" className="w-60">
      <LineChart.Grid rows={3} />
      <LineChart.Area dataKey="visits" />
      <LineChart.Line dataKey="visits" />
      <LineChart.XAxis />
    </LineChart>
  );
}
