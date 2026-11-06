'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { TreemapChart } from 'panelui-web/treemap-chart';

const BUDGET = [
  { label: 'Salaries', value: 42_000 },
  { label: 'Contractors', value: 18_500, color: 'destructive' },
  { label: 'Licences', value: 9_400 },
  { label: 'Travel', value: 6_100 },
  { label: 'Equipment', value: 4_800 },
  { label: 'Training', value: 2_600 },
];

export default function TreemapChartPicked() {
  const [selected, setSelected] = useState(-1);

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <TreemapChart data={BUDGET} color="primary" activeIndex={selected} onActiveIndexChange={setSelected}>
        <TreemapChart.Tiles dimOpacity={0.2} />
        <TreemapChart.Labels />
        <TreemapChart.Legend showShare={false} />
      </TreemapChart>
      <Button variant="outline" className="self-start" onClick={() => setSelected(1)}>
        Show what is over budget
      </Button>
    </div>
  );
}
