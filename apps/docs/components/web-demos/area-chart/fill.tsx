'use client';

import { AreaChart } from 'panelui-web/area-chart';

const VISITS = [
  { day: 'Mon', visits: 310 },
  { day: 'Tue', visits: 440 },
  { day: 'Wed', visits: 380 },
  { day: 'Thu', visits: 570 },
  { day: 'Fri', visits: 490 },
  { day: 'Sat', visits: 620 },
  { day: 'Sun', visits: 540 },
];

export default function AreaChartFill() {
  return (
    <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-3">
      <AreaChart data={VISITS} xDataKey="day" label="Visits, fading fill">
        <AreaChart.Header title="Fades out" />
        <AreaChart.Area dataKey="visits" color="info" fillOpacity={0.5} gradientToOpacity={0.05} />
      </AreaChart>
      <AreaChart data={VISITS} xDataKey="day" label="Visits, flat fill">
        <AreaChart.Header title="Flat" />
        <AreaChart.Area dataKey="visits" color="info" fillOpacity={0.4} gradientToOpacity={0.4} />
      </AreaChart>
      <AreaChart data={VISITS} xDataKey="day" label="Visits, fill only">
        <AreaChart.Header title="No line" />
        <AreaChart.Area dataKey="visits" color="info" showLine={false} />
      </AreaChart>
    </div>
  );
}
