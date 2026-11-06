'use client';

import { HeatmapChart, buildHeatmapCalendar } from 'panelui-web/heatmap-chart';

const activity = (date: Date) => {
  const day = date.getDate() + date.getMonth() * 31;
  const wave = Math.sin(day / 9) + Math.sin(day / 2.3);
  return date.getDay() % 6 === 0 ? 0 : Math.max(0, Math.round((wave + 1.2) * 4));
};

const END = new Date(2026, 11, 31);
const DAYS = Array.from({ length: 365 }, (_unused, index) => new Date(2026, 0, 1 + index));
const WEEKS = buildHeatmapCalendar(DAYS.map((date) => ({ date, count: activity(date) })), { end: END });

export default function HeatmapChartScrolling() {
  return (
    <div className="w-full max-w-xl overflow-x-auto pb-1">
      <HeatmapChart data={WEEKS}>
        <HeatmapChart.Header title="A year of commits" legend />
        <HeatmapChart.XAxis />
        <HeatmapChart.YAxis />
        <HeatmapChart.Separator every="quarter" />
        <HeatmapChart.Cells />
        <HeatmapChart.Tooltip />
      </HeatmapChart>
    </div>
  );
}
