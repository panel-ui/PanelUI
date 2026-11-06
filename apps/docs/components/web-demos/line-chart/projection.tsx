'use client';

import { LineChart } from 'panelui-web/line-chart';

const REVENUE = [
  { month: 'Jan', actual: 42 },
  { month: 'Feb', actual: 48 },
  { month: 'Mar', actual: 51 },
  { month: 'Apr', actual: 59, forecast: 59 },
  { month: 'May', forecast: 64 },
  { month: 'Jun', forecast: 72 },
];

export default function LineChartProjection() {
  return (
    <LineChart data={REVENUE} xDataKey="month" curve="linear" className="max-w-lg">
      <LineChart.Grid />
      <LineChart.Line dataKey="actual" showMarkers />
      <LineChart.Line dataKey="forecast" color="muted-foreground" dashArray="6 4" />
      <LineChart.YAxis format={(value) => `$${value}k`} />
      <LineChart.XAxis ticks={6} />
      <LineChart.Legend labels={{ actual: 'Actual', forecast: 'Forecast' }} />
      <LineChart.Tooltip
        labels={{ actual: 'Actual', forecast: 'Forecast' }}
        formatValue={(value) => `$${value}k`}
      />
    </LineChart>
  );
}
