'use client';

import { SankeyChart, type SankeyLink, type SankeyNode } from 'panelui-web/sankey-chart';

const STAGES: SankeyNode[] = [
  { id: 'a' },
  { id: 'b' },
  { id: 'c' },
  { id: 'd' },
  { id: 'e' },
];

const FLOWS: SankeyLink[] = [
  { source: 'a', target: 'c', value: 5 },
  { source: 'a', target: 'd', value: 2 },
  { source: 'b', target: 'c', value: 2 },
  { source: 'b', target: 'd', value: 4 },
  { source: 'c', target: 'e', value: 7 },
  { source: 'd', target: 'e', value: 6 },
];

export default function SankeyChartThumb() {
  return (
    <SankeyChart nodes={STAGES} links={FLOWS} height={120} className="w-60">
      <SankeyChart.Links />
      <SankeyChart.Nodes />
    </SankeyChart>
  );
}
