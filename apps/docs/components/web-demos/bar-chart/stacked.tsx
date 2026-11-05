'use client';

import { BarChart } from 'panelui-web/bar-chart';

const REVENUE = [
  { month: 'Mar', revenue: 19_800, costs: 12_100 },
  { month: 'Apr', revenue: 24_600, costs: 13_400 },
  { month: 'May', revenue: 27_100, costs: 14_900 },
  { month: 'Jun', revenue: 25_300, costs: 15_200 },
  { month: 'Jul', revenue: 29_900, costs: 16_800 },
  { month: 'Aug', revenue: 32_400, costs: 17_300 },
];

export default function BarChartStacked() {
  return (
    <BarChart data={REVENUE} xDataKey="month" stacked stackGap={2} className="max-w-lg">
      <BarChart.Grid />
      <BarChart.Bar dataKey="costs" color="chart-3" />
      <BarChart.Bar dataKey="revenue" />
      <BarChart.XAxis />
      <BarChart.Tooltip labels={{ revenue: 'Revenue', costs: 'Costs' }} />
    </BarChart>
  );
}
