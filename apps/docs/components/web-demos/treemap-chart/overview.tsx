'use client';

import { useState } from 'react';
import { Frame } from 'panelui-web/frame';
import { TreemapChart, type TreemapTile } from 'panelui-web/treemap-chart';

const SPEND = [
  { label: 'Compute', value: 18_300 },
  { label: 'Storage', value: 8_200 },
  { label: 'Network', value: 6_100 },
  { label: 'Database', value: 5_400 },
  { label: 'Logs', value: 3_700 },
  { label: 'CDN', value: 2_900 },
  { label: 'Backups', value: 2_100 },
  { label: 'Email', value: 1_500 },
];

const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

const total = SPEND.reduce((sum, part) => sum + part.value, 0);

export default function TreemapChartOverview() {
  const [active, setActive] = useState<TreemapTile | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Infrastructure</Frame.Title>
        <Frame.Action>November</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <TreemapChart data={SPEND} color="primary" onActiveIndexChange={(_index, tile) => setActive(tile)}>
          <TreemapChart.Header
            title={active ? active.label : 'Spend this month'}
            value={dollars(active ? active.value : total)}
            caption={active ? `${Math.round(active.share * 100)}% of spend` : 'Compute is 38% of it'}
          />
          <TreemapChart.Tiles />
          <TreemapChart.Labels formatValue={dollars} />
          <TreemapChart.Tooltip formatValue={dollars} />
        </TreemapChart>
      </Frame.Panel>
    </Frame>
  );
}
