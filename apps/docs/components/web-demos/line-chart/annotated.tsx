'use client';

import { LineChart } from 'panelui-web/line-chart';

const SPENDING = [
  { month: 'Jan', spent: 1_840 },
  { month: 'Feb', spent: 1_620 },
  { month: 'Mar', spent: 2_110 },
  { month: 'Apr', spent: 1_930 },
  { month: 'May', spent: 2_480 },
  { month: 'Jun', spent: 1_760 },
];

const money = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function LineChartAnnotated() {
  return (
    <LineChart data={SPENDING} xDataKey="month" className="max-w-lg" label="Spending by month, with the average and a move marked">
      <LineChart.Grid />
      <LineChart.Line dataKey="spent" />
      <LineChart.ReferenceLine y={1_957} label="Average $1,957" />
      <LineChart.Marker index={4} label="Moved flat" />
      <LineChart.YAxis format={money} />
      <LineChart.XAxis ticks={6} />
      <LineChart.Tooltip labels={{ spent: 'Spent' }} formatValue={money} />
    </LineChart>
  );
}
