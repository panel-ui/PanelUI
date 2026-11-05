'use client';

import { BarChart } from 'panelui-web/bar-chart';

const REVENUE = [
  { month: 'Mar', costs: 12_100, profit: 7_700 },
  { month: 'Apr', costs: 13_400, profit: 11_200 },
  { month: 'May', costs: 14_900, profit: 12_200 },
  { month: 'Jun', costs: 15_200, profit: 10_100 },
  { month: 'Jul', costs: 16_800, profit: 13_100 },
  { month: 'Aug', costs: 17_300, profit: 15_100 },
];

export default function BarChartStacked() {
  return (
    <BarChart data={REVENUE} xDataKey="month" stacked stackGap={2} className="max-w-lg">
      <BarChart.Grid />
      <BarChart.Bar dataKey="costs" color="chart-3" />
      <BarChart.Bar dataKey="profit" />
      <BarChart.XAxis />
      <BarChart.Tooltip labels={{ costs: 'Costs', profit: 'Profit' }} />
    </BarChart>
  );
}
