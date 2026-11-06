'use client';

import { BumpChart } from 'panelui-web/bump-chart';

const LEAGUE = [
  { week: 'w1', a: 3, b: 2, c: 1, d: 4 },
  { week: 'w2', a: 2, b: 3, c: 1, d: 4 },
  { week: 'w3', a: 2, b: 1, c: 3, d: 4 },
  { week: 'w4', a: 1, b: 2, c: 4, d: 3 },
  { week: 'w5', a: 1, b: 2, c: 3, d: 4 },
];

export default function BumpChartThumb() {
  return (
    <BumpChart data={LEAGUE} xDataKey="week" defaultHighlight="a" compact className="w-60">
      <BumpChart.Line dataKey="a" color="chart-2" />
      <BumpChart.Line dataKey="b" />
      <BumpChart.Line dataKey="c" />
      <BumpChart.Line dataKey="d" />
    </BumpChart>
  );
}
