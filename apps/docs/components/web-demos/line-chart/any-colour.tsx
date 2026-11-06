'use client';

import { LineChart, type LineChartDatum } from 'panelui-web/line-chart';

/** `exact` is 0 where the balance was worked out from a rate, not read from the account. */
const BALANCE = [
  { date: 'Mar 1', exact: 1, balance: 4_210 },
  { date: 'Mar 8', exact: 1, balance: 4_480 },
  { date: 'Mar 15', exact: 0, balance: 4_120 },
  { date: 'Mar 22', exact: 0, balance: 4_690 },
  { date: 'Mar 29', exact: 1, balance: 5_030 },
];

const money = (value: number) => `$${value.toLocaleString('en-US')}`;
const dateOf = (row: LineChartDatum) => (row.exact === 0 ? `${row.date}, estimated` : String(row.date));

export default function LineChartAnyColour() {
  return (
    <LineChart data={BALANCE} xDataKey="date" className="max-w-lg" label="Account balance by week">
      <LineChart.Grid />
      <LineChart.Area dataKey="balance" color="#0ea5e9" />
      <LineChart.Line dataKey="balance" color="#0ea5e9" />
      <LineChart.XAxis ticks={3} format={(row) => String(row.date)} />
      <LineChart.Tooltip color="#0ea5e9" labels={{ balance: 'Balance' }} formatValue={money} formatX={dateOf} />
    </LineChart>
  );
}
