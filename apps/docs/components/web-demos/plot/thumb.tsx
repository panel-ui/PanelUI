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

export default function PlotThumb() {
  return (
    <Plot data={MONTHS} xDataKey="month" className="w-60">
      <Plot.Grid rows={3} />
      <Plot.Bars dataKey="costs" color="info" />
      <Plot.Line dataKey="revenue" color="primary" />
    </Plot>
  );
}
