'use client';

import { useState } from 'react';
import { Plot } from 'panelui-web/plot';

const MONTHS = [
  { month: 'Jan', spent: 2140 },
  { month: 'Feb', spent: 1880 },
  { month: 'Mar', spent: 12 },
  { month: 'Apr', spent: 2430 },
  { month: 'May', spent: 1960 },
  { month: 'Jun', spent: 2710 },
  { month: 'Jul', spent: 2250 },
  { month: 'Aug', spent: 1500 },
  { month: 'Sep', spent: 1500 },
  { month: 'Oct', spent: 1500 },
];

const LAST_LIVE = 7;
const LIVE = MONTHS.slice(0, LAST_LIVE + 1);
const AVERAGE = LIVE.reduce((sum, { spent }) => sum + spent, 0) / LIVE.length;

const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;

export default function PlotSelectedBars() {
  const [selected, setSelected] = useState<number | null>(null);
  const shown = selected === null ? null : MONTHS[selected];

  return (
    <Plot
      data={MONTHS}
      xDataKey="month"
      aspectRatio={1.7}
      className="max-w-lg"
      nice
      onActiveIndexChange={(index) => setSelected(index < 0 || index > LAST_LIVE ? null : index)}
    >
      <Plot.Header title={shown ? shown.month : 'Average'} value={money(shown ? shown.spent : AVERAGE)} />
      <Plot.Grid rows={3} />
      <Plot.Bars
        dataKey="spent"
        color="var(--foreground)"
        minHeight={4}
        opacity={(_row, index) => (index > LAST_LIVE ? 0.3 : selected !== null && selected !== index ? 0.4 : 1)}
      />
      <Plot.Rule y={AVERAGE} color="var(--muted-foreground)" dashed />
      <Plot.YAxis ticks={3} format={(value) => `$${value / 1000}k`} />
      <Plot.XAxis ticks={5} />
      <Plot.Cursor showLine={false} />
    </Plot>
  );
}
