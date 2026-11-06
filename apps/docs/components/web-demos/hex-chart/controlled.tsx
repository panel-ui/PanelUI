'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { HexChart } from 'panelui-web/hex-chart';

const ATTRIBUTION = [
  { label: 'Organic', value: 2_880 },
  { label: 'Paid search', value: 1_740 },
  { label: 'Referral', value: 1_120 },
  { label: 'Email', value: 640 },
  { label: 'Social', value: 370 },
];

export default function HexChartControlled() {
  const [active, setActive] = useState(-1);
  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {ATTRIBUTION.map(({ label }, index) => (
          <Button key={label} size="sm" variant={active === index ? 'default' : 'outline'} onClick={() => setActive(active === index ? -1 : index)}>
            {label}
          </Button>
        ))}
      </div>
      <HexChart data={ATTRIBUTION} activeIndex={active} onActiveIndexChange={setActive}>
        <HexChart.Cells />
        <HexChart.Tooltip />
      </HexChart>
    </div>
  );
}
