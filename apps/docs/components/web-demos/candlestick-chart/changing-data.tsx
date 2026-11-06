'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { CandlestickChart, type CandlestickChartHandle } from 'panelui-web/candlestick-chart';

const TICKERS = {
  NWM: [
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
  ],
  ORX: [
    { day: '9 Sep', open: 127.5, high: 128.8, low: 125.5, close: 126.7 },
    { day: '10 Sep', open: 126.7, high: 127.8, low: 124.1, close: 125.2 },
    { day: '11 Sep', open: 125.2, high: 126.2, low: 122.5, close: 123.8 },
    { day: '12 Sep', open: 123.8, high: 125.2, low: 121.5, close: 122.8 },
    { day: '15 Sep', open: 122.8, high: 124.9, low: 121.6, close: 124.0 },
    { day: '16 Sep', open: 124.0, high: 126.6, low: 122.9, close: 125.7 },
    { day: '17 Sep', open: 125.7, high: 127.2, low: 124.2, close: 125.7 },
    { day: '18 Sep', open: 125.7, high: 128.7, low: 124.6, close: 127.7 },
    { day: '19 Sep', open: 127.7, high: 130.2, low: 126.4, close: 129.2 },
    { day: '22 Sep', open: 129.2, high: 130.7, low: 127.4, close: 128.7 },
  ],
};
type Ticker = keyof typeof TICKERS;

export default function CandlestickChartChangingData() {
  const chart = useRef<CandlestickChartHandle>(null);
  const [ticker, setTicker] = useState<Ticker>('NWM');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <CandlestickChart ref={chart} data={TICKERS[ticker]} xDataKey="day" aspectRatio={1.9}>
        <CandlestickChart.Header title={ticker} />
        <CandlestickChart.Grid />
        <CandlestickChart.Candles />
        <CandlestickChart.YAxis />
        <CandlestickChart.XAxis />
        <CandlestickChart.Tooltip />
      </CandlestickChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setTicker(ticker === 'NWM' ? 'ORX' : 'NWM')}>
          Show {ticker === 'NWM' ? 'ORX' : 'NWM'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
