'use client';

import { SankeyChart, type SankeyLink, type SankeyNode } from 'panelui-web/sankey-chart';

const COUNTRIES = ['USA', 'Germany', 'Brazil', 'Japan', 'India', 'France', 'Spain', 'Mexico', 'Canada', 'Italy', 'Norway', 'Chile'];

const STAGES: SankeyNode[] = [
  ...COUNTRIES.map((id) => ({ id })),
  { id: 'free', label: 'Free' },
  { id: 'pro', label: 'Pro' },
];

const FLOWS: SankeyLink[] = COUNTRIES.flatMap((source, index) => [
  { source, target: 'free', value: 900 - index * 70 },
  { source, target: 'pro', value: 420 - index * 30 },
]);

export default function SankeyChartCollapse() {
  return (
    <SankeyChart nodes={STAGES} links={FLOWS} height={320} collapse={{ maxPerColumn: 6 }} className="max-w-2xl">
      <SankeyChart.Links />
      <SankeyChart.Nodes />
      <SankeyChart.Labels />
      <SankeyChart.Legend />
    </SankeyChart>
  );
}
