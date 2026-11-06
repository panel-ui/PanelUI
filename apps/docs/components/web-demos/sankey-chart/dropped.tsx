'use client';

import { useState } from 'react';
import { Alert } from 'panelui-web/alert';
import { SankeyChart, type SankeyLink, type SankeyNode } from 'panelui-web/sankey-chart';

const STAGES: SankeyNode[] = [
  { id: 'ads', label: 'Ads' },
  { id: 'store', label: 'Store' },
  { id: 'bought', label: 'Bought' },
  { id: 'left', label: 'Left' },
];

const FLOWS: SankeyLink[] = [
  { source: 'ads', target: 'store', value: 800 },
  { source: 'store', target: 'bought', value: 240 },
  { source: 'store', target: 'left', value: 560 },
  { source: 'store', target: 'wishlist', value: 90 },
  { source: 'bought', target: 'ads', value: 40 },
];

export default function SankeyChartDropped() {
  const [dropped, setDropped] = useState(0);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      {dropped > 0 ? (
        <Alert tone="warning">
          <Alert.Title>{dropped} rows could not be drawn</Alert.Title>
        </Alert>
      ) : null}
      <SankeyChart nodes={STAGES} links={FLOWS} height={240} onDropLinks={setDropped}>
        <SankeyChart.Links />
        <SankeyChart.Nodes />
        <SankeyChart.Labels />
      </SankeyChart>
    </div>
  );
}
