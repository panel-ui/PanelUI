'use client';

import { useState } from 'react';
import { PieChart } from 'panelui-web/pie-chart';
import { Button } from 'panelui-web/button';

const SPEND = [
  { label: 'Rent', value: 1450 },
  { label: 'Food', value: 620 },
  { label: 'Transport', value: 210 },
  { label: 'Everything else', value: 240 },
];

export default function PieChartSelecting() {
  const [active, setActive] = useState(-1);

  return (
    <div className="flex w-full max-w-sm flex-col items-start gap-4">
      <PieChart data={SPEND} size={208} innerRadius={0.62} activeIndex={active} onActiveIndexChange={setActive}>
        <PieChart.Slices />
        <PieChart.Center />
        <PieChart.Legend />
      </PieChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setActive(0)}>
          Show rent
        </Button>
        <Button variant="ghost" onClick={() => setActive(-1)}>
          Clear
        </Button>
      </div>
    </div>
  );
}
