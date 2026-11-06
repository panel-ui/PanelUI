'use client';

import { PyramidChart } from 'panelui-web/pyramid-chart';

const ROWS = [
  { band: 'a', left: 34, right: 28 },
  { band: 'b', left: 56, right: 49 },
  { band: 'c', left: 73, right: 66 },
  { band: 'd', left: 48, right: 58 },
];

export default function PyramidChartThumb() {
  return (
    <PyramidChart data={ROWS} xDataKey="band" aspectRatio={2} className="w-60">
      <PyramidChart.Bar dataKey="left" side="start" />
      <PyramidChart.Bar dataKey="right" side="end" />
    </PyramidChart>
  );
}
