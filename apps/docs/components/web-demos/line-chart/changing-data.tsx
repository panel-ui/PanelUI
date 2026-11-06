'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { LineChart, type LineChartHandle } from 'panelui-web/line-chart';

const MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const PERIODS = {
  'This year': [19_800, 24_600, 27_100, 25_300, 29_900, 32_400],
  'Last year': [9_200, 11_500, 10_400, 13_800, 12_900, 15_100],
};
type Period = keyof typeof PERIODS;

export default function LineChartChangingData() {
  const chart = useRef<LineChartHandle>(null);
  const [period, setPeriod] = useState<Period>('This year');
  const rows = MONTHS.map((month, index) => ({ month, revenue: PERIODS[period][index] }));

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <LineChart ref={chart} data={rows} xDataKey="month">
        <LineChart.Grid />
        <LineChart.Area dataKey="revenue" />
        <LineChart.Line dataKey="revenue" />
        <LineChart.YAxis />
        <LineChart.XAxis />
        <LineChart.Tooltip labels={{ revenue: period }} />
      </LineChart>
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
