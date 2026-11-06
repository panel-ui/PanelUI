'use client';

import { PyramidChart } from 'panelui-web/pyramid-chart';

const INCIDENTS = [
  { region: 'North', opened: 412, closed: 398 },
  { region: 'East', opened: 3, closed: 2 },
  { region: 'South', opened: 186, closed: -4 },
  { region: 'West', opened: 240, closed: 251 },
];

export default function PyramidChartSmallValues() {
  return (
    <PyramidChart data={INCIDENTS} xDataKey="region" minBarLength={6} maxValue={500} aspectRatio={1.6} className="w-full max-w-lg">
      <PyramidChart.Grid />
      <PyramidChart.Bar dataKey="opened" side="start" />
      <PyramidChart.Bar dataKey="closed" side="end" />
      <PyramidChart.XAxis />
      <PyramidChart.YAxis />
      <PyramidChart.Tooltip />
    </PyramidChart>
  );
}
