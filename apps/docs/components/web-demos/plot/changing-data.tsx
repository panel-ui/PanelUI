'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { Plot, type PlotHandle, type PlotStatus } from 'panelui-web/plot';

const MONTHS = [
  { month: 'Jan', revenue: 18400, costs: 12100 },
  { month: 'Feb', revenue: 21200, costs: 13300 },
  { month: 'Mar', revenue: 19800, costs: 14200 },
  { month: 'Apr', revenue: 24600, costs: 14800 },
  { month: 'May', revenue: 27100, costs: 16200 },
  { month: 'Jun', revenue: 25300, costs: 17100 },
  { month: 'Jul', revenue: 29800, costs: 17600 },
  { month: 'Aug', revenue: 31500, costs: 18900 },
];

const SMALLER = MONTHS.map((row) => ({ ...row, revenue: row.revenue / 3, costs: row.costs / 4 }));

const money = (value: number) => `$${(value / 1000).toFixed(1)}k`;

export default function PlotChangingData() {
  const plot = useRef<PlotHandle>(null);
  const [status, setStatus] = useState<PlotStatus>('loading');
  const [smaller, setSmaller] = useState(false);

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <Plot ref={plot} data={smaller ? SMALLER : MONTHS} xDataKey="month" status={status} aspectRatio={1.9}>
        <Plot.Grid />
        <Plot.Bars dataKey="costs" color="info" />
        <Plot.Line dataKey="revenue" color="primary" />
        <Plot.Rule y={8000} dashed />
        <Plot.YAxis format={(value) => `$${Math.round(value / 1000)}k`} />
        <Plot.XAxis />
        <Plot.Cursor />
        <Plot.Tooltip formatValue={money} />
      </Plot>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStatus(status === 'ready' ? 'loading' : 'ready')}>
          {status === 'ready' ? 'Load again' : 'Finish loading'}
        </Button>
        <Button variant="outline" onClick={() => setSmaller(!smaller)}>
          {smaller ? 'Show larger' : 'Show smaller'}
        </Button>
        <Button variant="ghost" onClick={() => plot.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
