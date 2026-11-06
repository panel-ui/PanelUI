'use client';

import { LineChart } from 'panelui-web/line-chart';

/** A month's budget: what is left moves when money is spent, and the plan falls evenly. */
const BUDGET = [
  { day: '1', left: 900, plan: 900 },
  { day: '5', left: 900, plan: 780 },
  { day: '10', left: 620, plan: 630 },
  { day: '15', left: 540, plan: 480 },
  { day: '20', left: 210, plan: 330 },
  { day: '25', left: 210, plan: 180 },
  { day: '30', left: 95, plan: 0 },
];
const NAMES = { left: 'Left', plan: 'Plan' };

const money = (value: number) => `$${value}`;

export default function LineChartSteps() {
  return (
    <LineChart data={BUDGET} xDataKey="day" curve="linear" yDomain={[0, 1000]} className="max-w-lg" label="Budget left against an even plan, by day">
      <LineChart.Header title="Food budget" value="$95 left" caption="$95 ahead of plan" labels={NAMES} legend />
      <LineChart.Grid />
      <LineChart.Line dataKey="plan" color="muted-foreground" strokeWidth={1.5} dashArray="6 4" />
      <LineChart.Line dataKey="left" curve="step" />
      <LineChart.YAxis format={money} />
      <LineChart.XAxis />
      <LineChart.Tooltip labels={NAMES} formatValue={money} />
    </LineChart>
  );
}
