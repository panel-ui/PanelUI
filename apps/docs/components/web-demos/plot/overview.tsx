'use client';

import { Plot } from 'panelui-web/plot';

const MONTHS = [
  { month: 'Jan', revenue: 18400, costs: 12100 },
  { month: 'Feb', revenue: 21200, costs: 13300 },
  { month: 'Mar', revenue: 19800, costs: 14200 },
  { month: 'Apr', revenue: 24600, costs: 14800 },
  { month: 'May', revenue: 27100, costs: 16200 },
  { month: 'Jun', revenue: 25300, costs: 17100 },
  { month: 'Jul', revenue: 29800, costs: 17600 },
  { month: 'Aug', revenue: 31500, costs: 18900 },
];

const money = (value: number) => `$${(value / 1000).toFixed(1)}k`;

export default function PlotOverview() {
  return (
    <Plot data={MONTHS} xDataKey="month" aspectRatio={1.7} className="max-w-lg">
      <Plot.Header title="Revenue" value="$198.1k" />
      <Plot.Legend labels={{ costs: 'Costs', revenue: 'Revenue' }} />
      <Plot.Grid />
      <Plot.Bars dataKey="costs" color="info" />
      <Plot.Line dataKey="revenue" color="primary" />
      <Plot.Dots dataKey="revenue" color="primary" />
      <Plot.YAxis format={(value) => `$${Math.round(value / 1000)}k`} />
      <Plot.XAxis />
      <Plot.Cursor />
      <Plot.Tooltip formatValue={money} />
    </Plot>
  );
}
