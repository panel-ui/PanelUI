'use client';

import { BumpChart } from 'panelui-web/bump-chart';
import { Frame } from 'panelui-web/frame';

const LEAGUE = [
  { week: 'w32', harbour: 3, northside: 2, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w33', harbour: 3, northside: 2, kestrel: 1, oldMill: 5, riverside: 4 },
  { week: 'w34', harbour: 2, northside: 3, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w35', harbour: 2, northside: 1, kestrel: 3, oldMill: 4, riverside: 5 },
  { week: 'w36', harbour: 1, northside: 3, kestrel: 2, oldMill: 4, riverside: 5 },
  { week: 'w37', harbour: 1, northside: 2, kestrel: 3, oldMill: 5, riverside: 4 },
  { week: 'Now', harbour: 1, northside: 2, kestrel: 3, oldMill: 4, riverside: 5 },
];

export default function BumpChartStandings() {
  return (
    <Frame variant="band" className="w-full max-w-xl">
      <Frame.Header>
        <Frame.Title>League table</Frame.Title>
        <Frame.Action>Hover to read</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <BumpChart data={LEAGUE} xDataKey="week" aspectRatio={1.45}>
          <BumpChart.Grid />
          <BumpChart.Line dataKey="harbour" label="Harbour" color="chart-2" />
          <BumpChart.Line dataKey="northside" label="Northside" color="chart-1" />
          <BumpChart.Line dataKey="kestrel" label="Kestrel" color="chart-3" />
          <BumpChart.Line dataKey="oldMill" label="Old Mill" color="chart-4" />
          <BumpChart.Line dataKey="riverside" label="Riverside" color="chart-5" />
          <BumpChart.YAxis />
          <BumpChart.XAxis />
          <BumpChart.Standings />
        </BumpChart>
      </Frame.Panel>
    </Frame>
  );
}
