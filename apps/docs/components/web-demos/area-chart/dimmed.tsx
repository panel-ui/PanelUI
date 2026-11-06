'use client';

import { useState } from 'react';

import { AreaChart } from 'panelui-web/area-chart';

const SPEND = [
  { week: 'W1', rent: 300, food: 120, travel: 60 },
  { week: 'W2', rent: 300, food: 160, travel: 40 },
  { week: 'W3', rent: 300, food: 140, travel: 180 },
  { week: 'W4', rent: 300, food: 190, travel: 90 },
  { week: 'W5', rent: 300, food: 150, travel: 130 },
];

const CATEGORIES = [
  { key: 'rent', color: '#0ea5e9' },
  { key: 'food', color: '#f97316' },
  { key: 'travel', color: '#a855f7' },
];

const LABELS = { rent: 'Rent', food: 'Food', travel: 'Travel' };

/** How far the series that are not picked fade. */
const DIMMED = 0.25;

export default function AreaChartDimmed() {
  const [picked, setPicked] = useState('food');
  return (
    <AreaChart
      data={SPEND}
      xDataKey="week"
      stacked
      className="max-w-2xl"
      aspectRatio={2.4}
      label="Spending per week by category. Choose a category to pick it out."
      onSelect={setPicked}
    >
      <AreaChart.Grid />
      {CATEGORIES.map(({ key, color }) => (
        <AreaChart.Area key={key} dataKey={key} color={color} opacity={key === picked ? 1 : DIMMED} />
      ))}
      <AreaChart.YAxis />
      <AreaChart.XAxis />
      <AreaChart.Labels labels={LABELS} />
      <AreaChart.Tooltip labels={LABELS} />
    </AreaChart>
  );
}
