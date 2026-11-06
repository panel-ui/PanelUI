'use client';

import { RadarChart } from 'panelui-web/radar-chart';

const LOW = [
  { axis: 'North', value: 12 },
  { axis: 'East', value: 30 },
  { axis: 'South', value: 22 },
  { axis: 'West', value: 8 },
  { axis: 'Up', value: 18 },
];

export default function RadarChartDomain() {
  return (
    <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
      <RadarChart data={LOW} size={140}>
        <RadarChart.Header title="From the data" />
        <RadarChart.Grid />
        <RadarChart.Axis />
        <RadarChart.Series dataKey="value" />
      </RadarChart>
      <RadarChart data={LOW} size={140} domain={[0, 100]}>
        <RadarChart.Header title="Out of 100" />
        <RadarChart.Grid />
        <RadarChart.Axis />
        <RadarChart.Series dataKey="value" />
      </RadarChart>
    </div>
  );
}
