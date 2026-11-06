'use client';

import { BubbleChart } from 'panelui-web/bubble-chart';

const REGIONS = [
  { name: 'North', x: 12, y: 40, people: 80, tone: 'success' },
  { name: 'South', x: 28, y: 22, people: 140, tone: 'warning' },
  { name: 'East', x: 41, y: 51, people: 60, tone: 'info' },
  { name: 'West', x: 55, y: 30, people: 110, tone: 3 },
  { name: 'Centre', x: 33, y: 36, people: 170, tone: 'oklch(0.65 0.2 320)' },
];

export default function BubbleChartColors() {
  return (
    <BubbleChart data={REGIONS} sizeKey="people" labelKey="name" colorKey="tone" sizeRange={[16, 36]} aspectRatio={1.2} className="w-full max-w-lg">
      <BubbleChart.Grid />
      <BubbleChart.Bubbles />
      <BubbleChart.Labels />
      <BubbleChart.XAxis />
      <BubbleChart.YAxis />
      <BubbleChart.Tooltip />
      <BubbleChart.Legend />
    </BubbleChart>
  );
}
