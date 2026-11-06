'use client';

import { useState } from 'react';
import { MirrorAreaChart } from 'panelui-web/mirror-area-chart';

const LOAD = [
  { time: '09:00', jobs: 420, high: 96, share: 23 },
  { time: '10:00', jobs: 560, high: 148, share: 26 },
  { time: '11:00', jobs: 780, high: 264, share: 34 },
  { time: '12:00', jobs: 640, high: 186, share: 29 },
  { time: '13:00', jobs: 720, high: 302, share: 42 },
  { time: '14:00', jobs: 910, high: 446, share: 49 },
  { time: '15:00', jobs: 850, high: 357, share: 42 },
  { time: '16:00', jobs: 610, high: 183, share: 30 },
];

export default function MirrorAreaChartOverview() {
  const [active, setActive] = useState<(typeof LOAD)[number] | null>(null);
  const shown = active ?? LOAD[LOAD.length - 1];

  return (
    <MirrorAreaChart
      data={LOAD}
      xDataKey="time"
      className="max-w-xl"
      label="Jobs per hour above the baseline, and the share that were high priority below it"
      onActiveIndexChange={(index) => setActive(LOAD[index] ?? null)}
    >
      <MirrorAreaChart.Header title="Queue" value={`${shown.jobs} jobs`} caption={`${shown.share}% high priority at ${shown.time}`} legend />
      <MirrorAreaChart.Grid />
      <MirrorAreaChart.Area dataKey="jobs" label="Jobs" muted />
      <MirrorAreaChart.Area dataKey="high" label="High priority" />
      <MirrorAreaChart.Area dataKey="share" label="% high" side="bottom" color="chart-3" />
      <MirrorAreaChart.Baseline />
      <MirrorAreaChart.XAxis />
      <MirrorAreaChart.Tooltip formatValue={(value, key) => (key === 'share' ? `${value}%` : String(value))} />
    </MirrorAreaChart>
  );
}
