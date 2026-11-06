'use client';

import { useState } from 'react';
import { BubbleChart } from 'panelui-web/bubble-chart';

const SPEND = [
  { team: 'Ads', spend: 12, signups: 310, cost: 40 },
  { team: 'Search', spend: 24, signups: 480, cost: 70 },
  { team: 'Video', spend: 31, signups: 520, cost: 110 },
  { team: 'Events', spend: 44, signups: 590, cost: 180 },
  { team: 'Radio', spend: 52, signups: 760, cost: 90 },
  { team: 'Print', spend: 63, signups: 820, cost: 60 },
  { team: 'Partners', spend: 71, signups: 1_010, cost: 150 },
  { team: 'Social', spend: 84, signups: 1_120, cost: 130 },
];

export default function BubbleChartTrendDemo() {
  const [tightness, setTightness] = useState(0);
  return (
    <BubbleChart data={SPEND} xDataKey="spend" yDataKey="signups" sizeKey="cost" labelKey="team" aspectRatio={1.2} className="w-full max-w-lg">
      <BubbleChart.Header title="Signups against spend" value={`r = ${tightness.toFixed(2)}`} caption="How tightly the teams sit on the line" />
      <BubbleChart.Grid />
      <BubbleChart.Trend onFit={({ r }) => setTightness(r)} />
      <BubbleChart.Bubbles color="chart-2" />
      <BubbleChart.XAxis />
      <BubbleChart.YAxis />
      <BubbleChart.Tooltip />
    </BubbleChart>
  );
}
