'use client';

import { useState } from 'react';
import { CandlestickChart, type CandlestickChartDatum } from 'panelui-web/candlestick-chart';
import { Frame } from 'panelui-web/frame';

const SESSIONS = [
  { day: '1 Sep', open: 182.4, high: 185.1, low: 181.2, close: 184.6 },
  { day: '2 Sep', open: 184.6, high: 186.0, low: 182.9, close: 183.1 },
  { day: '3 Sep', open: 183.1, high: 184.4, low: 180.7, close: 181.5 },
  { day: '4 Sep', open: 181.5, high: 183.9, low: 180.9, close: 183.4 },
  { day: '5 Sep', open: 183.4, high: 187.2, low: 183.0, close: 186.8 },
  { day: '8 Sep', open: 186.8, high: 188.3, low: 185.6, close: 187.9 },
  { day: '9 Sep', open: 187.9, high: 189.0, low: 186.1, close: 186.6 },
  { day: '10 Sep', open: 186.6, high: 187.4, low: 183.8, close: 184.2 },
  { day: '11 Sep', open: 184.2, high: 184.9, low: 181.3, close: 182.0 },
  { day: '12 Sep', open: 182.0, high: 183.2, low: 179.6, close: 180.4 },
  { day: '15 Sep', open: 180.4, high: 182.7, low: 179.9, close: 182.3 },
  { day: '16 Sep', open: 182.3, high: 185.5, low: 182.0, close: 185.0 },
  { day: '17 Sep', open: 185.0, high: 186.4, low: 184.1, close: 185.0 },
  { day: '18 Sep', open: 185.0, high: 188.8, low: 184.7, close: 188.2 },
  { day: '19 Sep', open: 188.2, high: 191.3, low: 187.6, close: 190.7 },
  { day: '22 Sep', open: 190.7, high: 192.1, low: 189.2, close: 189.8 },
  { day: '23 Sep', open: 189.8, high: 190.6, low: 186.9, close: 187.4 },
  { day: '24 Sep', open: 187.4, high: 189.5, low: 186.8, close: 189.1 },
  { day: '25 Sep', open: 189.1, high: 193.0, low: 188.7, close: 192.4 },
  { day: '26 Sep', open: 192.4, high: 194.6, low: 191.5, close: 193.9 },
  { day: '29 Sep', open: 193.9, high: 195.2, low: 191.8, close: 192.3 },
  { day: '30 Sep', open: 192.3, high: 193.1, low: 189.4, close: 190.0 },
  { day: '1 Oct', open: 190.0, high: 191.7, low: 188.2, close: 191.2 },
  { day: '2 Oct', open: 191.2, high: 194.3, low: 190.8, close: 193.8 },
  { day: '3 Oct', open: 193.8, high: 197.0, low: 193.2, close: 196.4 },
  { day: '6 Oct', open: 196.4, high: 198.1, low: 195.0, close: 195.6 },
  { day: '7 Oct', open: 195.6, high: 196.2, low: 192.7, close: 193.3 },
  { day: '8 Oct', open: 193.3, high: 195.8, low: 192.9, close: 195.2 },
  { day: '9 Oct', open: 195.2, high: 198.9, low: 194.8, close: 198.3 },
  { day: '10 Oct', open: 198.3, high: 200.4, low: 197.1, close: 199.6 },
];

const last = SESSIONS[SESSIONS.length - 1];
const price = (value: number) => `$${value.toFixed(2)}`;

export default function CandlestickChartOverview() {
  const [active, setActive] = useState<CandlestickChartDatum | null>(null);

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>NWM</Frame.Title>
        <Frame.Action>Daily</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <CandlestickChart
          data={SESSIONS}
          xDataKey="day"
          aspectRatio={1.5}
          label="NWM daily prices, 1 September to 10 October"
          onActiveIndexChange={(_index, datum) => setActive(datum)}
        >
          <CandlestickChart.Header
            title={active ? String(active.day) : 'Last close'}
            value={price(active ? Number(active.close) : last.close)}
            legend
          />
          <CandlestickChart.Grid />
          <CandlestickChart.Candles />
          <CandlestickChart.YAxis format={(value) => value.toFixed(0)} />
          <CandlestickChart.XAxis />
          <CandlestickChart.Tooltip formatValue={price} />
        </CandlestickChart>
      </Frame.Panel>
    </Frame>
  );
}
