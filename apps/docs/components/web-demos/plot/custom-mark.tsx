'use client';

import { Plot, usePlot, yOf } from 'panelui-web/plot';

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

/** A shaded band between two values, on the chart's own geometry. */
function BandBetween({ low, high }: { low: number; high: number }) {
  const { plot, domainMin, domainMax } = usePlot();
  const top = yOf(high, plot, domainMin, domainMax);
  const bottom = yOf(low, plot, domainMin, domainMax);
  return <rect x={plot.left} y={top} width={plot.width} height={bottom - top} fill="var(--success)" fillOpacity={0.14} />;
}

export default function PlotCustomMark() {
  return (
    <Plot data={MONTHS} xDataKey="month" aspectRatio={1.7} className="max-w-lg">
      <Plot.Header title="Revenue" caption="Shaded where the month was within the plan" />
      <Plot.Grid />
      <Plot.Layer>
        <BandBetween low={20000} high={28000} />
      </Plot.Layer>
      <Plot.Area dataKey="revenue" color="primary" />
      <Plot.Line dataKey="revenue" color="primary" />
      <Plot.YAxis format={(value) => `$${Math.round(value / 1000)}k`} />
      <Plot.XAxis />
    </Plot>
  );
}
