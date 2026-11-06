'use client';

import { AreaChart } from 'panelui-web/area-chart';

/** Running totals through a month, so the income line steps up on payday. */
const MONTH = [
  { day: '1', rent: 1200, food: 40, travel: 0, income: 2600 },
  { day: '5', rent: 1200, food: 190, travel: 60, income: 2600 },
  { day: '10', rent: 1200, food: 340, travel: 60, income: 2600 },
  { day: '15', rent: 1200, food: 470, travel: 310, income: 5200 },
  { day: '20', rent: 1200, food: 620, travel: 380, income: 5200 },
  { day: '25', rent: 1200, food: 760, travel: 690, income: 5200 },
  { day: '30', rent: 1200, food: 910, travel: 720, income: 5200 },
];

const LABELS = { rent: 'Rent', food: 'Food', travel: 'Travel', income: 'Income' };

const money = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function AreaChartAnnotated() {
  return (
    <AreaChart data={MONTH} xDataKey="day" stacked className="max-w-2xl" label="Spending against income, by day">
      <AreaChart.Grid />
      <AreaChart.Area dataKey="rent" color="info" />
      <AreaChart.Area dataKey="food" color="success" />
      <AreaChart.Area dataKey="travel" color="warning" />
      <AreaChart.Line dataKey="income" curve="step" />
      <AreaChart.ReferenceLine y={2000} label="Budget $2,000" />
      <AreaChart.Marker index={4} label="Over budget" />
      <AreaChart.YAxis />
      <AreaChart.XAxis />
      <AreaChart.Labels
        labels={LABELS}
        formatValue={money}
        extra={[{ id: 'kept', label: 'Kept', value: 2370, at: 4015 }]}
      />
      <AreaChart.Tooltip labels={LABELS} formatValue={money} />
    </AreaChart>
  );
}
