'use client';

import { ScatterChart } from 'panelui-web/scatter-chart';

const FIELD = [
  { x: 4, y: 9 },
  { x: 9, y: 14 },
  { x: 14, y: 11 },
  { x: 18, y: 22 },
  { x: 23, y: 19 },
  { x: 27, y: 30 },
  { x: 32, y: 26 },
  { x: 36, y: 38 },
  { x: 41, y: 33 },
  { x: 45, y: 44 },
  { x: 12, y: 24 },
  { x: 30, y: 16 },
];

export default function ScatterChartThumb() {
  return (
    <ScatterChart data={FIELD} aspectRatio={1.6} className="w-60">
      <ScatterChart.Grid rows={3} columns={3} />
      <ScatterChart.Points dataKey="y" />
    </ScatterChart>
  );
}
