'use client';

import { MirrorAreaChart } from 'panelui-web/mirror-area-chart';

const TRAFFIC = [
  { day: 'Mon', requests: 18_400, latency: 142 },
  { day: 'Tue', requests: 21_300, latency: 156 },
  { day: 'Wed', requests: 26_800, latency: 198 },
  { day: 'Thu', requests: 24_100, latency: 171 },
  { day: 'Fri', requests: 31_500, latency: 264 },
  { day: 'Sat', requests: 15_200, latency: 128 },
  { day: 'Sun', requests: 12_900, latency: 119 },
];

const formatValue = (value: number, key: string) => (key === 'latency' ? `${value} ms` : `${(value / 1000).toFixed(1)}k`);

export default function MirrorAreaChartBothScales() {
  return (
    <MirrorAreaChart data={TRAFFIC} xDataKey="day" className="max-w-xl">
      <MirrorAreaChart.Grid />
      <MirrorAreaChart.Area dataKey="requests" label="Requests" />
      <MirrorAreaChart.Area dataKey="latency" label="Latency" side="bottom" color="chart-3" />
      <MirrorAreaChart.Baseline />
      <MirrorAreaChart.XAxis ticks={7} />
      <MirrorAreaChart.YAxis
        formatTop={(value) => `${Math.round(value / 1000)}k`}
        formatBottom={(value) => `${Math.round(value)} ms`}
      />
      <MirrorAreaChart.Legend />
      <MirrorAreaChart.Tooltip formatValue={formatValue} />
    </MirrorAreaChart>
  );
}
