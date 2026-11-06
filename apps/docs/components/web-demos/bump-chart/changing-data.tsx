'use client';

import { useRef, useState } from 'react';
import { BumpChart, type BumpChartHandle } from 'panelui-web/bump-chart';
import { Button } from 'panelui-web/button';

const SEASONS = {
  'This season': [
    { week: 'w32', harbour: 3, northside: 2, kestrel: 1, oldMill: 4 },
    { week: 'w33', harbour: 2, northside: 3, kestrel: 1, oldMill: 4 },
    { week: 'w34', harbour: 2, northside: 1, kestrel: 3, oldMill: 4 },
    { week: 'w35', harbour: 1, northside: 2, kestrel: 4, oldMill: 3 },
    { week: 'w36', harbour: 1, northside: 2, kestrel: 3, oldMill: 4 },
  ],
  'Last season': [
    { week: 'w32', harbour: 4, northside: 1, kestrel: 2, oldMill: 3 },
    { week: 'w33', harbour: 4, northside: 1, kestrel: 3, oldMill: 2 },
    { week: 'w34', harbour: 3, northside: 2, kestrel: 4, oldMill: 1 },
    { week: 'w35', harbour: 3, northside: 1, kestrel: 4, oldMill: 2 },
    { week: 'w36', harbour: 2, northside: 1, kestrel: 4, oldMill: 3 },
  ],
};
type Season = keyof typeof SEASONS;

export default function BumpChartChangingData() {
  const chart = useRef<BumpChartHandle>(null);
  const [season, setSeason] = useState<Season>('This season');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <BumpChart ref={chart} data={SEASONS[season]} xDataKey="week" defaultHighlight="harbour" aspectRatio={2}>
        <BumpChart.Grid />
        <BumpChart.Line dataKey="harbour" label="Harbour" color="chart-2" />
        <BumpChart.Line dataKey="northside" label="Northside" />
        <BumpChart.Line dataKey="kestrel" label="Kestrel" />
        <BumpChart.Line dataKey="oldMill" label="Old Mill" />
        <BumpChart.YAxis />
        <BumpChart.XAxis ticks={5} />
        <BumpChart.Labels />
        <BumpChart.Tooltip />
      </BumpChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setSeason(season === 'This season' ? 'Last season' : 'This season')}>
          Show {season === 'This season' ? 'last season' : 'this season'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
