'use client';

import { useState } from 'react';
import { AreaChart, type AreaChartDatum } from 'panelui-web/area-chart';
import { Frame } from 'panelui-web/frame';

/** CO₂ in parts per million through one working day, read every half hour. */
const READINGS = [
  ['08:00', 430, 440],
  ['08:30', 470, 455],
  ['09:00', 640, 520],
  ['09:30', 820, 610],
  ['10:00', 960, 700],
  ['10:30', 1080, 760],
  ['11:00', 1150, 790],
  ['11:30', 990, 820],
  ['12:00', 720, 760],
  ['12:30', 560, 640],
  ['13:00', 610, 580],
  ['13:30', 780, 690],
  ['14:00', 910, 840],
  ['14:30', 1010, 930],
  ['15:00', 1060, 960],
  ['15:30', 880, 900],
  ['16:00', 700, 850],
  ['16:30', 590, 780],
  ['17:00', 500, 640],
] as const;

const DAY = READINGS.map(([time, harbour, garden]) => ({ time, harbour, garden }));
const LIMIT = 1000;
const PEAK = DAY.reduce((top, row, index) => (row.harbour > DAY[top]!.harbour ? index : top), 0);
const OVER = DAY.filter((row) => row.harbour > LIMIT).length / 2;
const LABELS = { harbour: 'Harbour room', garden: 'Garden room' };

export default function AreaChartDotMatrix() {
  const [active, setActive] = useState<AreaChartDatum | null>(null);
  const row = (active ?? DAY[PEAK]!) as (typeof DAY)[number];

  return (
    <Frame variant="band" className="w-full max-w-2xl">
      <Frame.Header>
        <Frame.Title>Meeting rooms · CO₂</Frame.Title>
        <Frame.Action>{OVER} h over {LIMIT} ppm</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <AreaChart
          data={DAY}
          xDataKey="time"
          aspectRatio={2.2}
          yDomain={[0, 1400]}
          className="font-mono uppercase"
          label="Carbon dioxide in two meeting rooms through the working day, in parts per million"
          onActiveIndexChange={(_index, datum) => setActive(datum)}
        >
          <AreaChart.Header
            value={`${row.harbour} ppm`}
            caption={active ? `Harbour room at ${row.time}` : `Harbour room peak, ${row.time}`}
            labels={LABELS}
            legend
          />
          <AreaChart.Area dataKey="garden" color="var(--muted-foreground)" texture="dots" showLine={false} />
          <AreaChart.Area dataKey="harbour" color="chart-1" texture="dots" strokeWidth={1.5} />
          <AreaChart.ReferenceLine y={LIMIT} dashArray="2 4" color="var(--muted-foreground)" label={`Open a window · ${LIMIT}`} />
          <AreaChart.Marker index={PEAK} color="var(--foreground)" label={`Peak ${DAY[PEAK]!.harbour} ppm`} />
          <AreaChart.YAxis />
          <AreaChart.XAxis />
          <AreaChart.Tooltip labels={LABELS} formatValue={(value) => `${value} ppm`} />
        </AreaChart>
      </Frame.Panel>
    </Frame>
  );
}
