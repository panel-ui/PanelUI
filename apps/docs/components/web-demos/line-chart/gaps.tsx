'use client';

import { LineChart } from 'panelui-web/line-chart';

const READINGS = [
  { day: 'Mon', temperature: 21.4 },
  { day: 'Tue', temperature: 22.1 },
  { day: 'Wed', temperature: 21.8 },
  { day: 'Thu', temperature: null },
  { day: 'Fri', temperature: null },
  { day: 'Sat', temperature: 23.5 },
  { day: 'Sun', temperature: 22.9 },
];

export default function LineChartGaps() {
  return (
    <LineChart data={READINGS} xDataKey="day" className="max-w-lg">
      <LineChart.Grid />
      <LineChart.Line dataKey="temperature" color="chart-2" />
      <LineChart.YAxis format={(value) => `${value}°`} />
      <LineChart.XAxis ticks={7} />
      <LineChart.Tooltip labels={{ temperature: 'Temperature' }} formatValue={(value) => `${value}°C`} />
    </LineChart>
  );
}
