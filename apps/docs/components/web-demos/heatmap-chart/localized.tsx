'use client';

import { HeatmapChart, buildHeatmapCalendar, type HeatmapCell } from 'panelui-web/heatmap-chart';

const SPENDING: { date: Date; count: number }[] = Array.from({ length: 84 }, (_unused, index) => ({
  date: new Date(2026, 2, 2 + index),
  count: index % 4 === 0 ? 0 : ((index * 37) % 90) + 4,
}));

const START = new Date(2026, 2, 2);
const END = new Date(2026, 4, 24);
const MONDAY = 1;

const month = new Intl.DateTimeFormat('es', { month: 'short' });
const weekday = new Intl.DateTimeFormat('es', { weekday: 'narrow' });
const fullDay = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });
const amount = new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' });

// 2026-03-02 was a Monday, so these run from the top row down.
const WEEKDAYS = Array.from({ length: 7 }, (_unused, row) => weekday.format(new Date(2026, 2, 2 + row)));
const WEEKS = buildHeatmapCalendar(SPENDING, { start: START, end: END, weekStartDay: MONDAY });

const dayLabel = (cell: HeatmapCell) => (cell.date ? `${amount.format(cell.count)} el ${fullDay.format(cell.date)}` : 'Sin datos');

export default function HeatmapChartLocalized() {
  return (
    <HeatmapChart
      data={WEEKS}
      layout="fill"
      weekStartDay={MONDAY}
      color="--chart-3"
      label="Gasto diario"
      formatCellLabel={(cell) => (cell.date && cell.count > 0 ? dayLabel(cell) : null)}
      className="w-full max-w-md"
    >
      <HeatmapChart.XAxis formatLabel={(date) => month.format(date)} />
      <HeatmapChart.YAxis labelFormat="initial" labels={WEEKDAYS} />
      <HeatmapChart.Cells />
      <HeatmapChart.Tooltip formatLabel={dayLabel} />
      <HeatmapChart.Legend lessLabel="Menos" moreLabel="Más" />
    </HeatmapChart>
  );
}
