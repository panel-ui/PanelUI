'use client';

import { TreemapChart } from 'panelui-web/treemap-chart';

const SESSIONS = [
  ['United States', 64_200],
  ['Germany', 28_400],
  ['United Kingdom', 22_100],
  ['France', 16_300],
  ['Canada', 13_900],
  ['Japan', 11_200],
  ['Brazil', 8_400],
  ['India', 7_900],
  ['Spain', 5_200],
  ['Italy', 4_700],
  ['Mexico', 3_900],
  ['Poland', 3_100],
  ['Sweden', 2_500],
  ['Norway', 1_800],
  ['Portugal', 1_400],
  ['Ireland', 1_200],
].map(([label, value]) => ({ label: String(label), value: Number(value) }));

export default function TreemapChartLongTail() {
  return (
    <TreemapChart data={SESSIONS} maxTiles={8} otherLabel="Rest of world" className="max-w-lg">
      <TreemapChart.Tiles />
      <TreemapChart.Labels showShare />
      <TreemapChart.Tooltip />
      <TreemapChart.Legend limit={6} />
    </TreemapChart>
  );
}
