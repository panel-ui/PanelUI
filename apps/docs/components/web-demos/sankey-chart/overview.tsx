'use client';

import { Frame } from 'panelui-web/frame';
import { SankeyChart, useSankeyChart, type SankeyLink, type SankeyNode } from 'panelui-web/sankey-chart';

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

const TOTAL = 98_000;

function Reading() {
  const { activeLabel, activeValue, activeLink } = useSankeyChart();
  if (activeLink) {
    return (
      <SankeyChart.Header
        title={`${activeLink.source.label} to ${activeLink.target.label}`}
        value={activeLink.value.toLocaleString('en-US')}
      />
    );
  }
  return (
    <SankeyChart.Header
      title={activeLabel ? `${activeLabel}, ${Math.round((activeValue / TOTAL) * 100)}% of sessions` : 'Sessions'}
      value={(activeLabel ? activeValue : TOTAL).toLocaleString('en-US')}
    />
  );
}

export default function SankeyChartOverview() {
  return (
    <Frame variant="band" className="w-full max-w-2xl">
      <Frame.Header>
        <Frame.Title>Traffic</Frame.Title>
        <Frame.Action>November</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <SankeyChart nodes={STAGES} links={FLOWS} height={300} label="Sessions from source to outcome">
          <Reading />
          <SankeyChart.Links />
          <SankeyChart.Nodes />
          <SankeyChart.Labels showValue />
          <SankeyChart.Breakdown formatValue={(value) => value.toLocaleString('en-US')} />
        </SankeyChart>
      </Frame.Panel>
    </Frame>
  );
}
