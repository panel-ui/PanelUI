'use client';

import { RingChart } from 'panelui-web/ring-chart';

const SESSIONS = [{ label: 'Sessions', value: 8, maxValue: 12 }];

export default function RingChartSegments() {
  return (
    <RingChart data={SESSIONS} size={208} strokeWidth={14} className="max-w-sm">
      <RingChart.Ring index={0} segments={12} />
      <RingChart.Center />
    </RingChart>
  );
}
