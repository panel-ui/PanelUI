'use client';

import { Plot } from 'panelui-web/plot';

const DELTAS = [
  { month: 'Jan', delta: -1800 },
  { month: 'Feb', delta: -900 },
  { month: 'Mar', delta: -2400 },
  { month: 'Apr', delta: 300 },
  { month: 'May', delta: 1900 },
  { month: 'Jun', delta: 1200 },
  { month: 'Jul', delta: 2800 },
  { month: 'Aug', delta: 3400 },
];

export default function PlotMarking() {
  return (
    <Plot data={DELTAS} xDataKey="month" nice aspectRatio={1.7} className="max-w-lg">
      <Plot.Header title="Change against plan" />
      <Plot.Grid />
      <Plot.Bars dataKey="delta" baseline={0} color="info" />
      <Plot.Rule x={3} label="Shipped" dashed labelPlacement="start" />
      <Plot.YAxis />
      <Plot.XAxis />
    </Plot>
  );
}
