'use client';

import { BubbleChart } from 'panelui-web/bubble-chart';

const FIELD = [
  { x: 6, y: 12, s: 40 },
  { x: 14, y: 30, s: 90 },
  { x: 24, y: 18, s: 60 },
  { x: 32, y: 36, s: 140 },
  { x: 42, y: 24, s: 30 },
  { x: 50, y: 42, s: 100 },
];

export default function BubbleChartThumb() {
  return (
    <BubbleChart data={FIELD} sizeKey="s" sizeRange={[4, 14]} aspectRatio={1.6} className="w-60">
      <BubbleChart.Grid rows={3} columns={3} />
      <BubbleChart.Bubbles />
    </BubbleChart>
  );
}
