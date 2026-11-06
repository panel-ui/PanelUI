'use client';

import { BumpChart } from 'panelui-web/bump-chart';

const TAKINGS = [
  { month: 'Jan', quay: 41_200, market: 38_900, station: 29_400, college: 22_100 },
  { month: 'Feb', quay: 39_800, market: 40_300, station: 31_200, college: 24_600 },
  { month: 'Mar', quay: 37_500, market: 42_100, station: 33_800, college: 34_200 },
  { month: 'Apr', quay: 44_900, market: 41_600, station: 36_100, college: 31_700 },
  { month: 'May', quay: 46_300, market: 39_200, station: 41_500, college: 30_400 },
  { month: 'Jun', quay: 48_700, market: 40_800, station: 43_900, college: 29_800 },
];

export default function BumpChartScores() {
  return (
    <BumpChart data={TAKINGS} xDataKey="month" values="score" aspectRatio={1.8} className="max-w-lg">
      <BumpChart.Header title="Top shop in June" value="Quay" />
      <BumpChart.Grid />
      <BumpChart.Line dataKey="quay" label="Quay" color="chart-2" strokeWidth={2} />
      <BumpChart.Line dataKey="market" label="Market" color="chart-1" strokeWidth={2} />
      <BumpChart.Line dataKey="station" label="Station" color="chart-3" strokeWidth={2} />
      <BumpChart.Line dataKey="college" label="College" color="chart-4" strokeWidth={2} />
      <BumpChart.YAxis />
      <BumpChart.XAxis ticks={6} />
      <BumpChart.Labels pressable={false} />
      <BumpChart.Tooltip />
    </BumpChart>
  );
}
