'use client';

import { PieChart } from 'panelui-web/pie-chart';
import { Stat } from 'panelui-web/stat';

const SPEND = [
  { label: 'Rent', value: 1450 },
  { label: 'Food', value: 620 },
  { label: 'Transport', value: 210 },
];

const total = SPEND.reduce((sum, slice) => sum + slice.value, 0);

export default function PieChartCenterDemo() {
  return (
    <PieChart data={SPEND} size={208} innerRadius={0.62} className="max-w-sm">
      <PieChart.Slices />
      <PieChart.Center>
        {(slice) => (
          <>
            <Stat.Label>{slice ? slice.label : 'August'}</Stat.Label>
            <Stat.Value size="sm">${(slice ? slice.value : total).toLocaleString('en-US')}</Stat.Value>
          </>
        )}
      </PieChart.Center>
    </PieChart>
  );
}
