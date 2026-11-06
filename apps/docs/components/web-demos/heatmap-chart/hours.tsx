'use client';

import { HeatmapChart, type HeatmapCell } from 'panelui-web/heatmap-chart';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_unused, hour) => (hour % 6 === 0 ? `${hour}:00` : ''));

// Twenty-four columns of hours, seven rows of days, and no dates at all.
const LOAD = HOURS.map((_label, hour) => ({
  bin: hour,
  bins: WEEKDAYS.map((_day, day) => ({
    bin: day,
    count: Math.max(0, Math.round(10 * Math.sin(((hour - 6) / 24) * Math.PI * 2) * (day > 4 ? 0.4 : 1) + 4)),
  })),
}));

const describe = (cell: HeatmapCell) => `${cell.count} ${cell.count === 1 ? 'request' : 'requests'}, ${WEEKDAYS[cell.row]} at ${cell.column}:00`;

export default function HeatmapChartHours() {
  return (
    <HeatmapChart data={LOAD} layout="fill" formatCellLabel={describe} className="w-full max-w-lg">
      <HeatmapChart.XAxis labels={HOURS} />
      <HeatmapChart.YAxis labels={WEEKDAYS} tickFilter="all" />
      <HeatmapChart.Cells />
      <HeatmapChart.Tooltip formatLabel={describe} />
    </HeatmapChart>
  );
}
