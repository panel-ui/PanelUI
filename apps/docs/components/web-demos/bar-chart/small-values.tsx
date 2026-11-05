'use client';

import { BarChart } from 'panelui-web/bar-chart';

const ERRORS = [
  { day: 'Mon', count: 1 },
  { day: 'Tue', count: 212 },
  { day: 'Wed', count: 4 },
  { day: 'Thu', count: 0 },
  { day: 'Fri', count: 96 },
  { day: 'Sat', count: 2 },
  { day: 'Sun', count: 1 },
];

export default function BarChartSmallValues() {
  return (
    <BarChart data={ERRORS} xDataKey="day" minBarLength={3} className="max-w-lg">
      <BarChart.Bar dataKey="count" color="destructive" />
      <BarChart.XAxis />
      <BarChart.Tooltip labels={{ count: 'Errors' }} />
    </BarChart>
  );
}
