'use client';

import { PyramidChart } from 'panelui-web/pyramid-chart';

const POPULATION = [
  { band: '70+', men: 4.1, women: 5.6 },
  { band: '60-69', men: 6.2, women: 6.8 },
  { band: '50-59', men: 7.9, women: 8.1 },
  { band: '40-49', men: 8.6, women: 8.4 },
  { band: '30-39', men: 9.4, women: 9 },
  { band: '20-29', men: 8.8, women: 8.3 },
  { band: '0-19', men: 11.2, women: 10.6 },
];

const LABELS = { men: 'Men', women: 'Women' };

export default function PyramidChartBetween() {
  return (
    <PyramidChart data={POPULATION} xDataKey="band" labelPlacement="center" aspectRatio={1.5} barGap={0.3} className="w-full max-w-lg">
      <PyramidChart.Header title="Population, millions" labels={LABELS} legend />
      <PyramidChart.Grid />
      <PyramidChart.Bar dataKey="men" side="start" color="info" />
      <PyramidChart.Bar dataKey="women" side="end" color="warning" />
      <PyramidChart.XAxis format={(value) => `${value}M`} />
      <PyramidChart.YAxis />
      <PyramidChart.Tooltip labels={LABELS} formatValue={(value) => `${value}M`} />
    </PyramidChart>
  );
}
