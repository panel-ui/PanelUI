'use client';

import { RadarChart } from 'panelui-web/radar-chart';
import { Frame } from 'panelui-web/frame';

const SCORES = [
  { skill: 'Speed', you: 82, team: 64 },
  { skill: 'Reach', you: 54, team: 72 },
  { skill: 'Depth', you: 71, team: 58 },
  { skill: 'Cost', you: 38, team: 66 },
  { skill: 'Care', you: 64, team: 49 },
  { skill: 'Risk', you: 46, team: 30 },
];

export default function RadarChartOverview() {
  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Your profile</Frame.Title>
        <Frame.Action>Q3</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <RadarChart data={SCORES} axisKey="skill" domain={[0, 100]} label="Your scores out of 100">
          <RadarChart.Grid />
          <RadarChart.Axis />
          <RadarChart.Series dataKey="you" name="You" showDots />
          <RadarChart.Tooltip />
        </RadarChart>
      </Frame.Panel>
    </Frame>
  );
}
