'use client';

import { LineChart } from 'panelui-web/line-chart';
import { Stat } from 'panelui-web/stat';

const SIGNUPS = [31, 34, 33, 38, 36, 41, 44, 42, 48, 53, 51, 58].map((value) => ({ signups: value }));

export default function LineChartSparkline() {
  return (
    <div className="flex w-full max-w-xs items-end justify-between gap-6">
      <Stat>
        <Stat.Label>Signups</Stat.Label>
        <Stat.Value>58</Stat.Value>
      </Stat>
      <LineChart data={SIGNUPS} compact aspectRatio={3} label="Signups rising from 31 to 58" className="w-32">
        <LineChart.Area dataKey="signups" color="success" />
        <LineChart.Line dataKey="signups" color="success" strokeWidth={2} />
      </LineChart>
    </div>
  );
}
