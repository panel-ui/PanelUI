'use client';

import { HeatmapChart, buildHeatmapCalendar } from 'panelui-web/heatmap-chart';

const activity = (date: Date) => {
  const day = date.getDate() + date.getMonth() * 31;
  const wave = Math.sin(day / 9) + Math.sin(day / 2.3);
  return date.getDay() % 6 === 0 ? 0 : Math.max(0, Math.round((wave + 1.2) * 4));
};

const START = new Date(2026, 0, 1);
const DAYS = Array.from({ length: 180 }, (_unused, index) => new Date(2026, 0, 1 + index));
const WEEKS = buildHeatmapCalendar(
  DAYS.map((date) => ({ date, count: activity(date) })),
  { start: START, end: DAYS.at(-1) }
);
const TOTAL = DAYS.reduce((sum, date) => sum + activity(date), 0);

export default function HeatmapChartOverview() {
  return (
    <HeatmapChart data={WEEKS} layout="fill" className="w-full max-w-2xl">
      <HeatmapChart.Header title="Contributions" value={TOTAL.toLocaleString('en-US')} caption="January to June" />
      <HeatmapChart.XAxis />
      <HeatmapChart.YAxis />
      <HeatmapChart.Cells />
      <HeatmapChart.Tooltip />
      <HeatmapChart.Legend />
    </HeatmapChart>
  );
}
