'use client';

import { useState } from 'react';
import { PyramidChart, type PyramidChartDatum } from 'panelui-web/pyramid-chart';
import { Frame } from 'panelui-web/frame';

const PENGUINS = [
  { species: 'Adelie', male: 73, female: 73 },
  { species: 'Chinstrap', male: 34, female: 34 },
  { species: 'Gentoo', male: 61, female: 58 },
];

const LABELS = { male: 'Male', female: 'Female' };

export default function PyramidChartOverview() {
  const [active, setActive] = useState<PyramidChartDatum | null>(null);
  const total = active ? Number(active.male) + Number(active.female) : 333;

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Penguins observed</Frame.Title>
        <Frame.Action>Hover to read</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <PyramidChart
          data={PENGUINS}
          xDataKey="species"
          aspectRatio={1.4}
          onActiveIndexChange={(_index, datum) => setActive(datum)}
        >
          <PyramidChart.Header
            value={String(total)}
            caption={active ? String(active.species) : 'Three species'}
            labels={LABELS}
            legend
          />
          <PyramidChart.Grid />
          <PyramidChart.Bar dataKey="male" side="start" />
          <PyramidChart.Bar dataKey="female" side="end" />
          <PyramidChart.XAxis />
          <PyramidChart.YAxis />
          <PyramidChart.Tooltip labels={LABELS} />
        </PyramidChart>
      </Frame.Panel>
    </Frame>
  );
}
