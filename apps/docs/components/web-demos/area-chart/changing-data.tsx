'use client';

import { useRef, useState } from 'react';
import { AreaChart, type AreaChartHandle } from 'panelui-web/area-chart';
import { Button } from 'panelui-web/button';

const THIS_WEEK = [310, 440, 380, 570, 490, 620, 540];
const LAST_WEEK = [260, 300, 420, 390, 510, 430, 470];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const rows = (values: number[]) => values.map((visits, index) => ({ day: DAYS[index], visits }));

export default function AreaChartChangingData() {
  const chart = useRef<AreaChartHandle>(null);
  const [thisWeek, setThisWeek] = useState(true);

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <AreaChart ref={chart} data={rows(thisWeek ? THIS_WEEK : LAST_WEEK)} xDataKey="day">
        <AreaChart.Grid />
        <AreaChart.Area dataKey="visits" color="info" />
        <AreaChart.YAxis />
        <AreaChart.XAxis />
        <AreaChart.Tooltip labels={{ visits: 'Visits' }} />
      </AreaChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setThisWeek(!thisWeek)}>
          {thisWeek ? 'Show last week' : 'Show this week'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
