'use client';

import { CurrencyInput, type CurrencyOption } from 'panelui-web/currency-input';

const CURRENCIES: CurrencyOption[] = [
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

export default function CurrencyInputMany() {
  return (
    <CurrencyInput currencies={CURRENCIES} label="You pay" defaultValue={{ code: 'KRW', amount: 85000 }} />
  );
}
