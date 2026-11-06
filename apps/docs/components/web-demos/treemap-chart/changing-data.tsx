'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { TreemapChart, type TreemapChartHandle } from 'panelui-web/treemap-chart';

const MONTHS = {
  October: { Compute: 15_100, Storage: 9_800, Network: 7_300, Database: 3_200, Logs: 2_400 },
  November: { Compute: 18_300, Storage: 8_200, Network: 6_100, Database: 5_400, Logs: 3_700 },
};

type Month = keyof typeof MONTHS;

export default function TreemapChartChangingData() {
  const chart = useRef<TreemapChartHandle>(null);
  const [month, setMonth] = useState<Month>('November');
  const data = Object.entries(MONTHS[month]).map(([label, value]) => ({ id: label, label, value }));

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <TreemapChart ref={chart} data={data} aspectRatio={2} color="primary">
        <TreemapChart.Tiles />
        <TreemapChart.Labels />
        <TreemapChart.Tooltip />
      </TreemapChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setMonth(month === 'November' ? 'October' : 'November')}>
          Show {month === 'November' ? 'October' : 'November'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
