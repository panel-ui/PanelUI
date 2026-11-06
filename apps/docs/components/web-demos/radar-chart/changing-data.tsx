'use client';

import { useRef, useState } from 'react';
import { RadarChart, type RadarChartHandle } from 'panelui-web/radar-chart';
import { Button } from 'panelui-web/button';

const Q3 = [
  { skill: 'Speed', score: 82 },
  { skill: 'Reach', score: 54 },
  { skill: 'Depth', score: 71 },
  { skill: 'Cost', score: 38 },
  { skill: 'Care', score: 64 },
];
const Q4 = [
  { skill: 'Speed', score: 46 },
  { skill: 'Reach', score: 88 },
  { skill: 'Depth', score: 60 },
  { skill: 'Cost', score: 74 },
  { skill: 'Care', score: 30 },
];

export default function RadarChartChangingData() {
  const chart = useRef<RadarChartHandle>(null);
  const [later, setLater] = useState(false);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <RadarChart ref={chart} data={later ? Q4 : Q3} axisKey="skill" domain={[0, 100]}>
        <RadarChart.Grid />
        <RadarChart.Axis />
        <RadarChart.Series dataKey="score" showDots />
      </RadarChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setLater((current) => !current)}>
          {later ? 'Show Q3' : 'Show Q4'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
