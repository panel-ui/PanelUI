'use client';

import { useEffect, useState } from 'react';
import { Frame } from 'panelui-web/frame';
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

export default function LiveLineChartOverview() {
  const points = useFeed();

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>API traffic</Frame.Title>
        <Frame.Action>Hover to read back</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <LiveLineChart data={points} window={30}>
          <LiveLineChart.Header title="Requests / sec" formatValue={(value) => value.toFixed(0)} />
          <LiveLineChart.Grid />
          <LiveLineChart.Area />
          <LiveLineChart.Line />
          <LiveLineChart.Tip />
          <LiveLineChart.XAxis ticks={3} />
          <LiveLineChart.YAxis formatValue={(value) => value.toFixed(0)} />
          <LiveLineChart.Tooltip formatValue={(value) => `${value.toFixed(0)} req/s`} />
        </LiveLineChart>
      </Frame.Panel>
    </Frame>
  );
}
