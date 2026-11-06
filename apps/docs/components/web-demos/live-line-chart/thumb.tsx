'use client';

import { useState } from 'react';
import { LiveLineChart } from 'panelui-web/live-line-chart';

const WAVE = [31, 44, 38, 57, 49, 62, 58, 71];

export default function LiveLineChartThumb() {
  const [points] = useState(() => {
    const now = Date.now();
    return WAVE.map((value, index) => ({ time: now - (WAVE.length - index) * 1000, value }));
  });

  return (
    <LiveLineChart data={points} window={8} paused className="w-60">
      <LiveLineChart.Grid rows={3} />
      <LiveLineChart.Area />
      <LiveLineChart.Line />
      <LiveLineChart.Tip pulse={false} />
    </LiveLineChart>
  );
}
