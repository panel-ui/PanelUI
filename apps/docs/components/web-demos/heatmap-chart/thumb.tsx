'use client';

import { HeatmapChart } from 'panelui-web/heatmap-chart';

const WEEKS = Array.from({ length: 14 }, (_unused, column) => ({
  bin: column,
  bins: Array.from({ length: 7 }, (_cell, bin) => ({ bin, count: (column * 3 + bin * 5) % 6 })),
}));

export default function HeatmapChartThumb() {
  return (
    <HeatmapChart data={WEEKS} layout="fill" animationDuration={0} className="w-60">
      <HeatmapChart.Cells />
    </HeatmapChart>
  );
}
