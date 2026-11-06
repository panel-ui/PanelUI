'use client';

import { HeatmapChart, buildHeatmapCalendar } from 'panelui-web/heatmap-chart';

const activity = (date: Date) => {
  const day = date.getDate() + date.getMonth() * 31;
  const wave = Math.sin(day / 9) + Math.sin(day / 2.3);
  return date.getDay() % 6 === 0 ? 0 : Math.max(0, Math.round((wave + 1.2) * 4));
};

const DAYS = Array.from({ length: 112 }, (_unused, index) => new Date(2026, 0, 4 + index));
const WEEKS = buildHeatmapCalendar(DAYS.map((date) => ({ date, count: activity(date) })));

export default function HeatmapChartColors() {
  return (
    <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
      <HeatmapChart data={WEEKS} layout="fill" color="success" animationDuration={0}>
        <HeatmapChart.Cells />
        <HeatmapChart.Legend />
      </HeatmapChart>
      <HeatmapChart
        data={WEEKS}
        layout="fill"
        animationDuration={0}
        levelColors={['var(--muted)', '#fde68a', '#fbbf24', '#f97316', '#dc2626']}
      >
        <HeatmapChart.Cells />
        <HeatmapChart.Legend />
      </HeatmapChart>
    </div>
  );
}
