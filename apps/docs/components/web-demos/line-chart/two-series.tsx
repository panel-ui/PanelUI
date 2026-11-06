'use client';

import { LineChart } from 'panelui-web/line-chart';

const LATENCY = [
  { hour: '09:00', p50: 112, p95: 248 },
  { hour: '10:00', p50: 118, p95: 276 },
  { hour: '11:00', p50: 131, p95: 322 },
  { hour: '12:00', p50: 126, p95: 298 },
  { hour: '13:00', p50: 142, p95: 364 },
  { hour: '14:00', p50: 137, p95: 331 },
  { hour: '15:00', p50: 121, p95: 284 },
];
const NAMES = { p50: 'Median', p95: '95th percentile' };

export default function LineChartTwoSeries() {
  return (
    <LineChart data={LATENCY} xDataKey="hour" className="max-w-lg">
      <LineChart.Header title="Response time" value="137 ms" caption="Median at 14:00" labels={NAMES} legend />
      <LineChart.Grid />
      <LineChart.Line dataKey="p95" color="chart-3" />
      <LineChart.Line dataKey="p50" />
      <LineChart.YAxis format={(value) => `${value} ms`} />
      <LineChart.XAxis />
      <LineChart.Tooltip labels={NAMES} formatValue={(value) => `${value} ms`} />
    </LineChart>
  );
}
