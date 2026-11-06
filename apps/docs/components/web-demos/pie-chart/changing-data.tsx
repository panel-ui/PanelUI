'use client';

import { useRef, useState } from 'react';
import { PieChart, type PieChartHandle } from 'panelui-web/pie-chart';
import { Button } from 'panelui-web/button';

const NAMES = ['Rent', 'Food', 'Transport', 'Everything else'];
const MONTHS = {
  August: [1450, 620, 210, 240],
  July: [1450, 410, 480, 690],
};
type Month = keyof typeof MONTHS;

export default function PieChartChangingData() {
  const chart = useRef<PieChartHandle>(null);
  const [month, setMonth] = useState<Month>('August');
  const rows = NAMES.map((label, index) => ({ label, value: MONTHS[month][index] ?? 0 }));

  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <PieChart ref={chart} data={rows} size={208} innerRadius={0.62}>
        <PieChart.Slices />
        <PieChart.Center defaultLabel={month} />
        <PieChart.Legend />
      </PieChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setMonth(month === 'August' ? 'July' : 'August')}>
          Show {month === 'August' ? 'July' : 'August'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
