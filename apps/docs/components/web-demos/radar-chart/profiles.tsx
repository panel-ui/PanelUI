'use client';

import { RadarChart } from 'panelui-web/radar-chart';

const SCORES = [
  { skill: 'Speed', you: 82, team: 64 },
  { skill: 'Reach', you: 54, team: 72 },
  { skill: 'Depth', you: 71, team: 58 },
  { skill: 'Cost', you: 38, team: 66 },
  { skill: 'Care', you: 64, team: 49 },
  { skill: 'Risk', you: 46, team: 30 },
];

export default function RadarChartProfiles() {
  return (
    <RadarChart data={SCORES} axisKey="skill" domain={[0, 100]} className="max-w-sm">
      <RadarChart.Header title="Against the team" legend />
      <RadarChart.Grid />
      <RadarChart.Axis />
      <RadarChart.Series dataKey="you" name="You" />
      <RadarChart.Series dataKey="team" name="Team" fillOpacity={0} />
      <RadarChart.Tooltip />
    </RadarChart>
  );
}
