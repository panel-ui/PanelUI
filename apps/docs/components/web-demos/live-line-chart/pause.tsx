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

export default function LiveLineChartPause() {
  const points = useFeed();
  const [paused, setPaused] = useState(false);

  return (
    <LiveLineChart data={points} window={30} paused={paused} className="max-w-lg">
      <LiveLineChart.Header title="Queue depth" caption={paused ? 'Paused' : 'Live'} formatValue={(value) => value.toFixed(0)}>
        <Button size="sm" variant="outline" onClick={() => setPaused((current) => !current)}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </LiveLineChart.Header>
      <LiveLineChart.Grid />
      <LiveLineChart.Area />
      <LiveLineChart.Line />
      <LiveLineChart.Tip />
      <LiveLineChart.XAxis ticks={3} />
      <LiveLineChart.Tooltip formatValue={(value) => value.toFixed(0)} />
    </LiveLineChart>
  );
}
