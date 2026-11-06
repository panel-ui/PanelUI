'use client';

import { useState } from 'react';
import { BumpChart, bumpRanks, type BumpChartDatum } from 'panelui-web/bump-chart';
import { Frame } from 'panelui-web/frame';

const CLUBS = [
  { key: 'harbour', label: 'Harbour', color: 'chart-2' },
  { key: 'northside', label: 'Northside', color: 'chart-1' },
  { key: 'kestrel', label: 'Kestrel', color: 'chart-3' },
  { key: 'oldMill', label: 'Old Mill', color: 'chart-4' },
  { key: 'riverside', label: 'Riverside', color: 'chart-5' },
] as const;

const LEAGUE = [
  { week: 'w32', harbour: 3, northside: 2, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w33', harbour: 3, northside: 2, kestrel: 1, oldMill: 5, riverside: 4 },
  { week: 'w34', harbour: 2, northside: 3, kestrel: 1, oldMill: 4, riverside: 5 },
  { week: 'w35', harbour: 2, northside: 1, kestrel: 3, oldMill: 4, riverside: 5 },
  { week: 'w36', harbour: 1, northside: 3, kestrel: 2, oldMill: 4, riverside: 5 },
  { week: 'w37', harbour: 1, northside: 2, kestrel: 3, oldMill: 5, riverside: 4 },
  { week: 'Now', harbour: 1, northside: 2, kestrel: 3, oldMill: 4, riverside: 5 },
];

const RANKS = bumpRanks(LEAGUE, CLUBS.map(({ key }) => key));

export default function BumpChartOverview() {
  const [picked, setPicked] = useState<string | null>('harbour');
  const [active, setActive] = useState<{ index: number; datum: BumpChartDatum } | null>(null);

  const club = CLUBS.find(({ key }) => key === picked);
  const column = active ? active.index : LEAGUE.length - 1;
  const rank = club ? RANKS[club.key]?.[column] : null;

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>League table</Frame.Title>
        <Frame.Action>{picked ? 'Press again to clear' : 'Press a name'}</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <BumpChart
          data={LEAGUE}
          xDataKey="week"
          highlight={picked}
          onHighlightChange={setPicked}
          onActiveIndexChange={(index, datum) => setActive(datum ? { index, datum } : null)}
        >
          <BumpChart.Header
            title={club ? club.label : 'No club picked'}
            value={rank ? `#${rank}` : 'None'}
            caption={LEAGUE[column]?.week}
          />
          <BumpChart.Grid />
          {CLUBS.map(({ key, label, color }) => (
            <BumpChart.Line key={key} dataKey={key} label={label} color={color} />
          ))}
          <BumpChart.YAxis />
          <BumpChart.XAxis />
          <BumpChart.Labels />
          <BumpChart.Tooltip />
        </BumpChart>
      </Frame.Panel>
    </Frame>
  );
}
