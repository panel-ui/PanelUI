'use client';

import { Exchange, type ExchangeCurrency } from 'panelui-web/exchange';

const CURRENCIES: ExchangeCurrency[] = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'GBP', name: 'Pound sterling', symbol: '£', color: 'chart-4' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', decimals: 0, color: 'chart-5' },
  { code: 'SAR', name: 'Saudi riyal', symbol: 'ر', color: 'chart-3' },
];

/** Units of each currency to one US dollar. Sample figures, not live rates. */
const RATES = { USD: 1, EUR: 0.866, GBP: 0.762, JPY: 153.2, SAR: 3.75 };

export default function ExchangeOverview() {
  return (
    <Exchange currencies={CURRENCIES} rates={RATES} defaultValue={{ from: 'USD', to: 'EUR', amount: 250 }}>
      <Exchange.Field side="from" label="You pay" />
      <Exchange.Swap />
      <Exchange.Field side="to" label="You receive" />
    </Exchange>
  );
}
