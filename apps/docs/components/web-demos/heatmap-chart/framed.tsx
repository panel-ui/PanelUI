'use client';

import { useState } from 'react';
import { Frame } from 'panelui-web/frame';
import { HeatmapChart, buildHeatmapCalendar, type HeatmapCell } from 'panelui-web/heatmap-chart';

/** Minutes practised: weekday sessions, longer at weekends, a week off in August. */
const minutes = (date: Date) => {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 7 && day >= 10 && day <= 17) return 0;
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const drift = Math.round(Math.sin((month * 31 + day) / 5) * 8);
  if ((day * 7 + month) % 9 === 0) return 0;
  return Math.max(0, (weekend ? 45 : 20) + drift);
};

const DAYS = Array.from({ length: 182 }, (_unused, index) => new Date(2026, 4, 1 + index));
const WEEKS = buildHeatmapCalendar(
  DAYS.map((date) => ({ date, count: minutes(date) })),
  { start: DAYS[0], end: DAYS.at(-1) }
);
const PRACTISED = DAYS.filter((date) => minutes(date) > 0).length;
const HOURS = Math.round(DAYS.reduce((sum, date) => sum + minutes(date), 0) / 60);
const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function HeatmapChartFramed() {
  const [cell, setCell] = useState<HeatmapCell | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-2xl">
      <Frame.Header>
        <Frame.Title>Piano practice</Frame.Title>
        <Frame.Action>{PRACTISED} of {DAYS.length} days</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <HeatmapChart
          data={WEEKS}
          layout="fill"
          levels={[1, 20, 35, 50]}
          onActiveCellChange={setCell}
          formatCellLabel={({ count, date }) => (date ? `${count} minutes on ${dayName.format(date)}` : null)}
          label="Minutes of piano practice each day, May to October"
        >
          <HeatmapChart.Header
            value={cell?.date ? `${cell.count} min` : `${HOURS} h`}
            caption={cell?.date ? dayName.format(cell.date) : 'May to October'}
            legend
          />
          <HeatmapChart.XAxis />
          <HeatmapChart.YAxis />
          <HeatmapChart.Cells />
          <HeatmapChart.Tooltip formatLabel={() => ''} />
        </HeatmapChart>
      </Frame.Panel>
    </Frame>
  );
}
