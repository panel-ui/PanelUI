'use client';

import { CandlestickChart } from 'panelui-web/candlestick-chart';

const SESSIONS = [
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
];

export default function CandlestickChartColors() {
  return (
    <CandlestickChart data={SESSIONS} xDataKey="day" aspectRatio={1.9} className="max-w-lg">
      <CandlestickChart.Grid />
      <CandlestickChart.Candles risingColor="info" fallingColor="warning" cornerRadius={3} />
      <CandlestickChart.YAxis />
      <CandlestickChart.XAxis />
      <CandlestickChart.Legend risingLabel="Gain" fallingLabel="Loss" />
      <CandlestickChart.Tooltip />
    </CandlestickChart>
  );
}
