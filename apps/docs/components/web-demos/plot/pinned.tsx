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

export default function PlotPinned() {
  return (
    <Plot data={MONTHS} xDataKey="month" yDomain={[0, 'auto']} nice aspectRatio={1.7} className="max-w-lg">
      <Plot.Header title="Revenue by month" />
      <Plot.Grid />
      <Plot.Bars dataKey="revenue" color="info" />
      <Plot.Rule y={28000} label="Target" dashed labelPlacement="start" />
      <Plot.YAxis format={(value) => `$${Math.round(value / 1000)}k`} />
      <Plot.XAxis />
    </Plot>
  );
}
