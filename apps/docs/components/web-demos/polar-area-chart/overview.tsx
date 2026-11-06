'use client';

import { PolarAreaChart } from 'panelui-web/polar-area-chart';
import { Frame } from 'panelui-web/frame';

const SCORES = [
  { label: 'Speed', value: 82 },
  { label: 'Reach', value: 54 },
  { label: 'Depth', value: 71 },
  { label: 'Cost', value: 28 },
  { label: 'Care', value: 64 },
];

export default function PolarAreaChartOverview() {
  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Team scores</Frame.Title>
        <Frame.Action>Q3</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <PolarAreaChart data={SCORES} size={240}>
          <PolarAreaChart.Grid />
          <PolarAreaChart.Wedges />
          <PolarAreaChart.Labels />
          <PolarAreaChart.Tooltip />
          <PolarAreaChart.Legend />
        </PolarAreaChart>
      </Frame.Panel>
    </Frame>
  );
}
