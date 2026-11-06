'use client';

import { MirrorAreaChart } from 'panelui-web/mirror-area-chart';

const WEEK = [
  { day: 'M', up: 31, down: 12 },
  { day: 'T', up: 44, down: 18 },
  { day: 'W', up: 38, down: 26 },
  { day: 'T', up: 57, down: 21 },
  { day: 'F', up: 49, down: 34 },
  { day: 'S', up: 62, down: 19 },
  { day: 'S', up: 71, down: 15 },
];

export default function MirrorAreaChartThumb() {
  return (
    <MirrorAreaChart data={WEEK} xDataKey="day" className="w-60">
      <MirrorAreaChart.Area dataKey="up" />
      <MirrorAreaChart.Area dataKey="down" side="bottom" color="chart-3" />
      <MirrorAreaChart.Baseline />
    </MirrorAreaChart>
  );
}
