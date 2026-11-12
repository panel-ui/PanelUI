'use client';

import { useState } from 'react';
import { Frame } from 'panelui-web/frame';
import { Plot } from 'panelui-web/plot';

const LATENCY = [
  { hour: '00', requests: 1200, p95: 182 },
  { hour: '02', requests: 640, p95: 168 },
  { hour: '04', requests: 520, p95: 160 },
  { hour: '06', requests: 1480, p95: 196 },
  { hour: '08', requests: 4120, p95: 248 },
  { hour: '10', requests: 5630, p95: 286 },
  { hour: '12', requests: 6210, p95: 341 },
  { hour: '14', requests: 5870, p95: 312 },
  { hour: '16', requests: 5240, p95: 274 },
  { hour: '18', requests: 3910, p95: 231 },
  { hour: '20', requests: 2780, p95: 205 },
  { hour: '22', requests: 1860, p95: 190 },
];

const TARGET = 300;
const OVER = LATENCY.filter((row) => row.p95 > TARGET).length;

export default function PlotFramed() {
  const [index, setIndex] = useState(-1);
  const row = LATENCY[index];

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Checkout API</Frame.Title>
        <Frame.Action>{OVER === 0 ? 'Within target' : `${OVER} hours over target`}</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <Plot
          data={LATENCY}
          xDataKey="hour"
          aspectRatio={1.7}
          yDomain={[0, 400]}
          label="95th percentile response time in milliseconds every two hours, against a 300 millisecond target"
          onActiveIndexChange={setIndex}
        >
          <Plot.Header
            value={`${row ? row.p95 : Math.max(...LATENCY.map((each) => each.p95))} ms`}
            caption={row ? `p95 at ${row.hour}:00` : 'Slowest p95 today'}
          />
          <Plot.Grid rows={4} />
          <Plot.Line dataKey="p95" color="primary" />
          <Plot.Dots dataKey="p95" color="primary" />
          <Plot.Rule y={TARGET} label="Target 300 ms" color="destructive" dashed />
          <Plot.YAxis ticks={4} />
          <Plot.XAxis format={(datum) => `${datum.hour}:00`} ticks={6} />
          <Plot.Cursor />
          <Plot.Tooltip formatValue={(value) => `${value} ms`} />
        </Plot>
      </Frame.Panel>
    </Frame>
  );
}
