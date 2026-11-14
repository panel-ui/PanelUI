'use client';

import { CurrencyInput, type CurrencyOption } from 'panelui-web/currency-input';

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'CAD', name: 'Canadian dollar', symbol: '$', color: 'chart-5' },
];

export default function CurrencyInputBalance() {
  return (
    <CurrencyInput
      currencies={CURRENCIES}
      label="You pay"
      defaultValue={{ code: 'USD', amount: 128 }}
      detail="Balance $2,410.50"
    />
  );
}
