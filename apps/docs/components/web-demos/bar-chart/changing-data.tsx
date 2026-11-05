'use client';

import { useRef, useState } from 'react';
import { BarChart, type BarChartHandle } from 'panelui-web/bar-chart';
import { Button } from 'panelui-web/button';

const MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const PERIODS = {
  'This year': [19_800, 24_600, 27_100, 25_300, 29_900, 32_400],
  'Last year': [9_200, 11_500, 10_400, 13_800, 12_900, 15_100],
};
type Period = keyof typeof PERIODS;

export default function BarChartChangingData() {
  const chart = useRef<BarChartHandle>(null);
  const [period, setPeriod] = useState<Period>('This year');
  const rows = MONTHS.map((month, index) => ({ month, revenue: PERIODS[period][index] }));

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <BarChart ref={chart} data={rows} xDataKey="month">
        <BarChart.Grid />
        <BarChart.Bar dataKey="revenue" />
        <BarChart.YAxis />
        <BarChart.XAxis />
        <BarChart.Tooltip labels={{ revenue: period }} />
      </BarChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setPeriod(period === 'This year' ? 'Last year' : 'This year')}>
          Show {period === 'This year' ? 'last year' : 'this year'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
