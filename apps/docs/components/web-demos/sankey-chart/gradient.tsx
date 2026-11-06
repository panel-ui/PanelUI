'use client';

import { SankeyChart, type SankeyLink, type SankeyNode } from 'panelui-web/sankey-chart';

const STAGES: SankeyNode[] = [
  { id: 'search', label: 'Search' },
  { id: 'social', label: 'Social' },
  { id: 'direct', label: 'Direct' },
  { id: 'docs', label: 'Docs' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'signup', label: 'Signed up' },
  { id: 'left', label: 'Left' },
];

const FLOWS: SankeyLink[] = [
  { source: 'search', target: 'docs', value: 26_000 },
  { source: 'search', target: 'pricing', value: 16_000 },
  { source: 'social', target: 'docs', value: 9_000 },
  { source: 'social', target: 'pricing', value: 22_000 },
  { source: 'direct', target: 'docs', value: 12_000 },
  { source: 'direct', target: 'pricing', value: 13_000 },
  { source: 'docs', target: 'signup', value: 14_000 },
  { source: 'docs', target: 'left', value: 33_000 },
  { source: 'pricing', target: 'signup', value: 21_000 },
  { source: 'pricing', target: 'left', value: 30_000 },
];

export default function SankeyChartGradient() {
  return (
    <SankeyChart nodes={STAGES} links={FLOWS} height={300} className="max-w-2xl">
      <SankeyChart.Links gradient />
      <SankeyChart.Nodes />
      <SankeyChart.Labels showValue />
      <SankeyChart.Breakdown />
    </SankeyChart>
  );
}
