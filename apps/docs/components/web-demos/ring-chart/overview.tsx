'use client';

import { useState } from 'react';
import { RingChart } from 'panelui-web/ring-chart';
import { Frame } from 'panelui-web/frame';

const GOALS = [
  { label: 'Move', value: 486, maxValue: 600 },
  { label: 'Exercise', value: 24, maxValue: 30 },
  { label: 'Stand', value: 9, maxValue: 12 },
];

export default function RingChartOverview() {
  const [active, setActive] = useState(-1);
  const ring = GOALS[active] ?? GOALS[0]!;

  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Activity</Frame.Title>
        <Frame.Action>Today</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <RingChart data={GOALS} size={208} onActiveIndexChange={setActive}>
          <RingChart.Header title={ring.label} value={`${ring.value} of ${ring.maxValue}`} />
          <RingChart.Ring index={0} />
          <RingChart.Ring index={1} />
          <RingChart.Ring index={2} />
          <RingChart.Center />
          <RingChart.Legend />
        </RingChart>
      </Frame.Panel>
    </Frame>
  );
}
