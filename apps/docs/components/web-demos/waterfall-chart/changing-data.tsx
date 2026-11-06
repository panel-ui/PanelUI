'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { WaterfallChart, type WaterfallChartHandle, type WaterfallDatum } from 'panelui-web/waterfall-chart';

const QUARTERS: Record<'Q4' | 'Q1', WaterfallDatum[]> = {
  Q4: [
    { label: 'Open', value: 482000, total: true },
    { label: 'New', value: 96400 },
    { label: 'Upsell', value: 41200 },
    { label: 'Churn', value: -58700 },
    { label: 'Close', value: 0, total: true },
  ],
  Q1: [
    { label: 'Open', value: 561000, total: true },
    { label: 'New', value: 48300 },
    { label: 'Upsell', value: 112600 },
    { label: 'Churn', value: -146000 },
    { label: 'Close', value: 0, total: true },
  ],
};

export default function WaterfallChartChangingData() {
  const chart = useRef<WaterfallChartHandle>(null);
  const [quarter, setQuarter] = useState<keyof typeof QUARTERS>('Q4');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <WaterfallChart ref={chart} data={QUARTERS[quarter]} aspectRatio={1.8}>
        <WaterfallChart.Header title={quarter} />
        <WaterfallChart.Grid />
        <WaterfallChart.Connectors />
        <WaterfallChart.Bars />
        <WaterfallChart.XAxis />
        <WaterfallChart.YAxis />
        <WaterfallChart.Tooltip />
      </WaterfallChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setQuarter(quarter === 'Q4' ? 'Q1' : 'Q4')}>
          Show {quarter === 'Q4' ? 'Q1' : 'Q4'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
