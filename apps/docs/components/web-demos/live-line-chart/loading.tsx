'use client';

import { useEffect, useState } from 'react';
import { Button } from 'panelui-web/button';
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

export default function LiveLineChartLoading() {
  const points = useFeed();
  const [ready, setReady] = useState(false);

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-3">
      <LiveLineChart data={points} status={ready ? 'ready' : 'loading'}>
        <LiveLineChart.Grid />
        <LiveLineChart.Skeleton />
        <LiveLineChart.Area />
        <LiveLineChart.Line />
        <LiveLineChart.Tip />
        <LiveLineChart.XAxis ticks={3} />
        <LiveLineChart.YAxis formatValue={(value) => value.toFixed(0)} />
      </LiveLineChart>
      <Button size="sm" variant="outline" onClick={() => setReady((current) => !current)}>
        {ready ? 'Load again' : 'Finish loading'}
      </Button>
    </div>
  );
}
