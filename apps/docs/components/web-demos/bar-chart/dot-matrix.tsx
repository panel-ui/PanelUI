'use client';

import { useState } from 'react';
import { BarChart, type BarChartDatum } from 'panelui-web/bar-chart';

/** Rain at one weather station, in millimetres, for each month of a year. */
const RAIN = [
  { month: 'Jan', rain: 92, normal: 84 },
  { month: 'Feb', rain: 61, normal: 62 },
  { month: 'Mar', rain: 48, normal: 58 },
  { month: 'Apr', rain: 39, normal: 51 },
  { month: 'May', rain: 55, normal: 49 },
  { month: 'Jun', rain: 30, normal: 46 },
  { month: 'Jul', rain: 22, normal: 44 },
  { month: 'Aug', rain: 64, normal: 55 },
  { month: 'Sep', rain: 71, normal: 60 },
  { month: 'Oct', rain: 118, normal: 82 },
  { month: 'Nov', rain: 104, normal: 88 },
  { month: 'Dec', rain: 97, normal: 90 },
];

const TOTAL = RAIN.reduce((sum, row) => sum + row.rain, 0);
const LABELS = { rain: 'This year', normal: 'Average' };

export default function BarChartDotMatrix() {
  const [active, setActive] = useState<BarChartDatum | null>(null);

  return (
    <BarChart
      data={RAIN}
      xDataKey="month"
      aspectRatio={2.2}
      barGap={0.3}
      cornerRadius={0}
      className="max-w-xl font-mono uppercase"
      label="Monthly rainfall this year beside the long-run average, in millimetres"
      onActiveIndexChange={(_index, datum) => setActive(datum)}
    >
      <BarChart.Header
        title="Rainfall"
        value={active ? `${active.rain} mm` : `${TOTAL} mm`}
        caption={active ? `${active.month}, average ${active.normal} mm` : 'This year'}
      />
      <BarChart.Grid />
      <BarChart.Bar dataKey="normal" color="chart-3" texture="dots" dotSize={3} dotGap={4.5} />
      <BarChart.Bar dataKey="rain" color="chart-1" texture="dots" dotSize={3} dotGap={4.5} />
      <BarChart.XAxis />
      <BarChart.YAxis />
      <BarChart.Legend labels={LABELS} />
      <BarChart.Tooltip labels={LABELS} formatValue={(value) => `${value} mm`} />
    </BarChart>
  );
}
