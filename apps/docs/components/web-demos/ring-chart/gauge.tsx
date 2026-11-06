'use client';

import { RingChart } from 'panelui-web/ring-chart';

const STORAGE = [{ label: 'Storage', value: 141, maxValue: 200 }];

export default function RingChartGauge() {
  return (
    <RingChart data={STORAGE} size={208} strokeWidth={16} startAngle={-120} endAngle={120} className="max-w-sm">
      <RingChart.Ring index={0} />
      <RingChart.Center formatValue={(value) => `${value} GB`} />
    </RingChart>
  );
}
