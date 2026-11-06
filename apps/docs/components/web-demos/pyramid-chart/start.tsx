'use client';

import { PyramidChart } from 'panelui-web/pyramid-chart';

const TRAFFIC = [
  { path: '/pricing', desktop: 8400, mobile: 5200 },
  { path: '/docs', desktop: 12100, mobile: 3900 },
  { path: '/blog', desktop: 4300, mobile: 6800 },
  { path: '/about', desktop: 1900, mobile: 1200 },
];

const LABELS = { desktop: 'Desktop', mobile: 'Mobile' };

export default function PyramidChartStart() {
  return (
    <PyramidChart data={TRAFFIC} xDataKey="path" labelPlacement="start" aspectRatio={1.8} className="w-full max-w-lg">
      <PyramidChart.Legend labels={LABELS} />
      <PyramidChart.Grid />
      <PyramidChart.Bar dataKey="desktop" side="start" />
      <PyramidChart.Bar dataKey="mobile" side="end" />
      <PyramidChart.XAxis />
      <PyramidChart.YAxis />
      <PyramidChart.Tooltip labels={LABELS} />
    </PyramidChart>
  );
}
