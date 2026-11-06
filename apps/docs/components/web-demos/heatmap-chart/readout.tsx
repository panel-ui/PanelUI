'use client';

import { useState } from 'react';
import { HeatmapChart, buildHeatmapCalendar, type HeatmapCell } from 'panelui-web/heatmap-chart';

const activity = (date: Date) => {
  const day = date.getDate() + date.getMonth() * 31;
  const wave = Math.sin(day / 9) + Math.sin(day / 2.3);
  return date.getDay() % 6 === 0 ? 0 : Math.max(0, Math.round((wave + 1.2) * 4));
};

const DAYS = Array.from({ length: 140 }, (_unused, index) => new Date(2026, 1, 1 + index));
const WEEKS = buildHeatmapCalendar(DAYS.map((date) => ({ date, count: activity(date) })));
const TOTAL = DAYS.reduce((sum, date) => sum + activity(date), 0);
const dayName = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });

export default function HeatmapChartReadout() {
  const [cell, setCell] = useState<HeatmapCell | null>(null);
  return (
    <HeatmapChart
      data={WEEKS}
      layout="fill"
      inactiveOpacity={0.45}
      onActiveCellChange={setCell}
      formatCellLabel={({ count, date }) => (date ? `${count} ${count === 1 ? 'deploy' : 'deploys'} on ${dayName.format(date)}` : null)}
      className="w-full max-w-xl"
    >
      <HeatmapChart.Header
        title="Deploys"
        value={(cell ? cell.count : TOTAL).toLocaleString('en-US')}
        caption={cell?.date ? dayName.format(cell.date) : 'February to June'}
        legend
      />
      <HeatmapChart.XAxis />
      <HeatmapChart.YAxis />
      <HeatmapChart.Cells />
      <HeatmapChart.Tooltip formatLabel={() => ''} />
    </HeatmapChart>
  );
}
