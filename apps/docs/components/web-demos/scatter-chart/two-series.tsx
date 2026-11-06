'use client';

import { ScatterChart } from 'panelui-web/scatter-chart';

const TRIALS = [
  { dose: 5, control: 12, treated: 14 },
  { dose: 10, control: 13, treated: 19 },
  { dose: 15, control: 15, treated: 26 },
  { dose: 20, control: 14, treated: 31 },
  { dose: 25, control: 17, treated: 38 },
  { dose: 30, control: 16, treated: 41 },
  { dose: 35, control: 19, treated: 47 },
  { dose: 40, control: 18, treated: 44 },
  { dose: 45, control: 21, treated: 52 },
  { dose: 50, control: 20, treated: 55 },
];

const LABELS = { dose: 'Dose', control: 'Control', treated: 'Treated' };

export default function ScatterChartTwoSeries() {
  return (
    <ScatterChart data={TRIALS} xDataKey="dose" aspectRatio={1.5} className="w-full max-w-lg">
      <ScatterChart.Header title="Response by dose" legend labels={LABELS} />
      <ScatterChart.Grid />
      <ScatterChart.Points dataKey="control" color="chart-1" />
      <ScatterChart.Points dataKey="treated" color="chart-2" />
      <ScatterChart.XAxis format={(value) => `${value} mg`} />
      <ScatterChart.YAxis />
      <ScatterChart.Tooltip labels={LABELS} formatX={(value) => `${value} mg`} />
    </ScatterChart>
  );
}
