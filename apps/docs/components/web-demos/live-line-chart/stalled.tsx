'use client';

import { useEffect, useState } from 'react';
import { Button } from 'panelui-web/button';
import { LiveLineChart, type LiveLinePoint } from 'panelui-web/live-line-chart';

const read = (time: number) => ({ time, value: 60 + 20 * Math.sin(time / 3000) + Math.random() * 4 });

export default function LiveLineChartStalled() {
  const [points, setPoints] = useState<LiveLinePoint[]>([]);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const start = Date.now();
    setPoints(Array.from({ length: 15 }, (_, index) => read(start - (15 - index) * 1000)));
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => setPoints((current) => [...current, read(Date.now())]), 1000);
    return () => clearInterval(timer);
  }, [connected]);

  return (
    <LiveLineChart data={points} window={15} className="max-w-lg">
      <LiveLineChart.Header title="Sensor" caption={connected ? 'Connected' : 'Disconnected'} formatValue={(value) => value.toFixed(1)}>
        <Button size="sm" variant="outline" onClick={() => setConnected((current) => !current)}>
          {connected ? 'Stop the feed' : 'Start the feed'}
        </Button>
      </LiveLineChart.Header>
      <LiveLineChart.Grid />
      <LiveLineChart.Line />
      <LiveLineChart.Tip />
      <LiveLineChart.XAxis ticks={3} />
    </LiveLineChart>
  );
}
