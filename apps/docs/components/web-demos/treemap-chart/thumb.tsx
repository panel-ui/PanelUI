'use client';

import { TreemapChart } from 'panelui-web/treemap-chart';

const PARTS = [
  { label: 'A', value: 38 },
  { label: 'B', value: 17 },
  { label: 'C', value: 13 },
  { label: 'D', value: 11 },
  { label: 'E', value: 8 },
  { label: 'F', value: 6 },
  { label: 'G', value: 4 },
];

export default function TreemapChartThumb() {
  return (
    <TreemapChart data={PARTS} color="primary" aspectRatio={1.7} className="w-60">
      <TreemapChart.Tiles />
    </TreemapChart>
  );
}
