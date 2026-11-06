'use client';

import { SankeyChart, type SankeyLink, type SankeyNode } from 'panelui-web/sankey-chart';

const STAGES: SankeyNode[] = [
  { id: 'visit', label: 'Visited' },
  { id: 'bounce', label: 'Bounced' },
  { id: 'trial', label: 'Started a trial' },
  { id: 'paid', label: 'Paid' },
  { id: 'lapsed', label: 'Lapsed' },
];

const FLOWS: SankeyLink[] = [
  { source: 'visit', target: 'bounce', value: 62_000 },
  { source: 'visit', target: 'trial', value: 38_000 },
  { source: 'trial', target: 'paid', value: 11_000 },
  { source: 'trial', target: 'lapsed', value: 27_000 },
];

export default function SankeyChartAlign() {
  return (
    <SankeyChart nodes={STAGES} links={FLOWS} height={300} align="left" className="max-w-2xl">
      <SankeyChart.Links />
      <SankeyChart.Nodes />
      <SankeyChart.Labels showValue />
    </SankeyChart>
  );
}
