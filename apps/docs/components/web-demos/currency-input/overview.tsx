'use client';

import { CurrencyInput, type CurrencyOption } from 'panelui-web/currency-input';

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'GBP', name: 'Pound sterling', symbol: '£', color: 'chart-4' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', decimals: 0, color: 'chart-5' },
];

export default function CurrencyInputOverview() {
  return <CurrencyInput currencies={CURRENCIES} label="Amount" defaultValue={{ code: 'USD', amount: 250 }} />;
}
