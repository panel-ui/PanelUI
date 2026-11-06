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

export default function PlotScales() {
  return (
    <div className="grid w-full max-w-lg gap-6">
      <Plot data={MONTHS} xDataKey="month" aspectRatio={3}>
        <Plot.Header title="Points: the line reaches the frame" />
        <Plot.Grid rows={2} />
        <Plot.Line dataKey="revenue" color="primary" />
        <Plot.XAxis />
      </Plot>
      <Plot data={MONTHS} xDataKey="month" xScale="band" aspectRatio={3}>
        <Plot.Header title="Bands: each point is in the middle of its slice" />
        <Plot.Grid rows={2} />
        <Plot.Line dataKey="revenue" color="primary" />
        <Plot.XAxis />
      </Plot>
    </div>
  );
}
