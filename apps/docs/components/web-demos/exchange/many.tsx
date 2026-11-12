'use client';

import { Exchange, type ExchangeCurrency } from 'panelui-web/exchange';

const CURRENCIES: ExchangeCurrency[] = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'GBP', name: 'Pound sterling', symbol: '£', color: 'chart-4' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', decimals: 0, color: 'chart-5' },
  { code: 'CHF', name: 'Swiss franc', symbol: 'F', color: 'chart-3' },
  { code: 'CAD', name: 'Canadian dollar', symbol: '$', color: 'chart-5' },
  { code: 'AUD', name: 'Australian dollar', symbol: '$', color: 'chart-4' },
  { code: 'SAR', name: 'Saudi riyal', symbol: 'ر', color: 'chart-3' },
  { code: 'AED', name: 'UAE dirham', symbol: 'د', color: 'chart-1' },
  { code: 'INR', name: 'Indian rupee', symbol: '₹', color: 'chart-2' },
  { code: 'KRW', name: 'South Korean won', symbol: '₩', decimals: 0, color: 'chart-4' },
  { code: 'BRL', name: 'Brazilian real', symbol: 'R', color: 'chart-5' },
];

/** Units of each currency to one US dollar. Sample figures, not live rates. */
const RATES = {
  USD: 1,
  EUR: 0.866,
  GBP: 0.762,
  JPY: 153.2,
  CHF: 0.81,
  CAD: 1.39,
  AUD: 1.53,
  SAR: 3.75,
  AED: 3.6725,
  INR: 88.6,
  KRW: 1432,
  BRL: 5.36,
};

export default function ExchangeMany() {
  return (
    <Exchange currencies={CURRENCIES} rates={RATES} defaultValue={{ from: 'KRW', to: 'USD', amount: 85000 }}>
      <Exchange.Field side="from" label="You pay" />
      <Exchange.Swap />
      <Exchange.Field side="to" label="You receive" />
    </Exchange>
  );
}
