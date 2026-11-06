'use client';

import { useState } from 'react';
import { MirrorAreaChart } from 'panelui-web/mirror-area-chart';

const SALES = [
  { month: 'Jan', orders: 1_240, returns: 86 },
  { month: 'Feb', orders: 1_380, returns: 92 },
  { month: 'Mar', orders: 1_710, returns: 131 },
  { month: 'Apr', orders: 1_620, returns: 118 },
  { month: 'May', orders: 1_940, returns: 104 },
  { month: 'Jun', orders: 2_180, returns: 167 },
];

export default function MirrorAreaChartSplit() {
  const [active, setActive] = useState<(typeof SALES)[number] | null>(null);
  const shown = active ?? SALES[SALES.length - 1];

  return (
    <MirrorAreaChart
      data={SALES}
      xDataKey="month"
      split={0.7}
      className="max-w-xl"
      onActiveIndexChange={(index) => setActive(SALES[index] ?? null)}
    >
      <MirrorAreaChart.Header title={`Orders in ${shown.month}`} value={shown.orders.toLocaleString('en')} caption={`${shown.returns} returned`} />
      <MirrorAreaChart.Grid variant="lines" />
      <MirrorAreaChart.Area dataKey="orders" label="Orders" gradientToOpacity={0.04} />
      <MirrorAreaChart.Area dataKey="returns" label="Returns" side="bottom" color="destructive" gradientToOpacity={0.04} />
      <MirrorAreaChart.Baseline />
      <MirrorAreaChart.XAxis ticks={6} />
      <MirrorAreaChart.Tooltip />
    </MirrorAreaChart>
  );
}
