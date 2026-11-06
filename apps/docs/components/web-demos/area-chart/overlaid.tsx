'use client';

import { AreaChart } from 'panelui-web/area-chart';

const SIGNUPS = [
  { week: 'W1', free: 420, team: 180 },
  { week: 'W2', free: 480, team: 240 },
  { week: 'W3', free: 450, team: 310 },
  { week: 'W4', free: 530, team: 290 },
  { week: 'W5', free: 610, team: 370 },
  { week: 'W6', free: 580, team: 460 },
  { week: 'W7', free: 640, team: 520 },
];

const LABELS = { free: 'Free', team: 'Team' };

export default function AreaChartOverlaid() {
  return (
    <AreaChart data={SIGNUPS} xDataKey="week" className="max-w-lg" label="Signups per week, by plan">
      <AreaChart.Header title="Signups per week" labels={LABELS} legend />
      <AreaChart.Grid />
      <AreaChart.Area dataKey="free" color="primary" />
      <AreaChart.Area dataKey="team" color="info" />
      <AreaChart.YAxis />
      <AreaChart.XAxis />
      <AreaChart.Tooltip labels={LABELS} />
    </AreaChart>
  );
}
