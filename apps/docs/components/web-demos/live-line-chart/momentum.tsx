'use client';

import { useEffect, useState } from 'react';
import { LiveLineChart, type LiveLinePoint } from 'panelui-web/live-line-chart';

/** A made-up reading each second, with the last minute already there. */
function useFeed() {
  const [points, setPoints] = useState<LiveLinePoint[]>([]);
  useEffect(() => {
    const read = (time: number) => ({ time, value: 120 + 40 * Math.sin(time / 7000) + 18 * Math.sin(time / 1900) + Math.random() * 8 });
    const start = Date.now();
    setPoints(Array.from({ length: 60 }, (_, index) => read(start - (60 - index) * 1000)));
    const timer = setInterval(() => setPoints((current) => [...current, read(Date.now())]), 1000);
    return () => clearInterval(timer);
  }, []);
  return points;
}

export default function LiveLineChartMomentum() {
  const points = useFeed();

  return (
    <LiveLineChart data={points} window={20} aspectRatio={2.2} momentumColors={{ flat: 'muted-foreground' }} className="max-w-lg">
      <LiveLineChart.Grid />
      <LiveLineChart.Area />
      <LiveLineChart.Line />
      <LiveLineChart.Tip badge formatValue={(value) => value.toFixed(1)} />
      <LiveLineChart.XAxis />
    </LiveLineChart>
  );
}
