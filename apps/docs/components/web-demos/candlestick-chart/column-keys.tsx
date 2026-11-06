'use client';

import { CandlestickChart } from 'panelui-web/candlestick-chart';

const BARS = [
  { t: '25 Sep', o: 189.1, h: 193.0, l: 188.7, c: 192.4 },
  { t: '26 Sep', o: 192.4, h: 194.6, l: 191.5, c: 193.9 },
  { t: '29 Sep', o: 193.9, h: 195.2, l: 191.8, c: 192.3 },
  { t: '30 Sep', o: 192.3, h: 193.1, l: 189.4, c: 190.0 },
  { t: '1 Oct', o: 190.0, h: 191.7, l: 188.2, c: 191.2 },
  { t: '2 Oct', o: 191.2, h: 194.3, l: 190.8, c: 193.8 },
  { t: '3 Oct', o: 193.8, h: 197.0, l: 193.2, c: 196.4 },
  { t: '6 Oct', o: 196.4, h: 198.1, l: 195.0, c: 195.6 },
  { t: '7 Oct', o: 195.6, h: 196.2, l: 192.7, c: 193.3 },
  { t: '8 Oct', o: 193.3, h: 195.8, l: 192.9, c: 195.2 },
];

export default function CandlestickChartColumnKeys() {
  return (
    <CandlestickChart
      data={BARS}
      xDataKey="t"
      openDataKey="o"
      highDataKey="h"
      lowDataKey="l"
      closeDataKey="c"
      aspectRatio={1.9}
      className="max-w-lg"
    >
      <CandlestickChart.Grid />
      <CandlestickChart.Candles />
      <CandlestickChart.YAxis />
      <CandlestickChart.XAxis />
      <CandlestickChart.Tooltip />
    </CandlestickChart>
  );
}
