'use client';

import { CurrencyInput } from 'panelui-web/currency-input';

const CURRENCIES = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' as const },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' as const },
];

export default function CurrencyInputThumb() {
  return (
    <CurrencyInput
      currencies={CURRENCIES}
      label="Amount"
      defaultValue={{ code: 'USD', amount: 40 }}
      className="w-72"
    />
  );
}
