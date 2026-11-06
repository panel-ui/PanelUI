'use client';

import { RingChart } from 'panelui-web/ring-chart';
import { Stat } from 'panelui-web/stat';

const GOALS = [
  { label: 'Move', value: 486, maxValue: 600 },
  { label: 'Exercise', value: 24, maxValue: 30 },
  { label: 'Stand', value: 9, maxValue: 12 },
];

export default function RingChartCenterDemo() {
  return (
    <RingChart data={GOALS} size={208} className="max-w-sm">
      <RingChart.Ring index={0} />
      <RingChart.Ring index={1} />
      <RingChart.Ring index={2} />
      <RingChart.Center>
        {(ring) => (
          <>
            <Stat.Label>{ring ? ring.label : 'Today'}</Stat.Label>
            <Stat.Value size="sm">{ring ? ring.value : '3 goals'}</Stat.Value>
          </>
        )}
      </RingChart.Center>
    </RingChart>
  );
}
