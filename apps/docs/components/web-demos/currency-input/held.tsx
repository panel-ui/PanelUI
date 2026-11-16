'use client';

import { useState } from 'react';
import { CurrencyInput, type CurrencyOption, type CurrencyValue } from 'panelui-web/currency-input';

const CURRENCIES: CurrencyOption[] = [
  { code: 'GBP', name: 'Pound sterling', symbol: '£', color: 'chart-4' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'AED', name: 'UAE dirham', symbol: 'د', color: 'chart-3' },
  { code: 'INR', name: 'Indian rupee', symbol: '₹', color: 'chart-5' },
];

export default function CurrencyInputHeld() {
  const [value, setValue] = useState<CurrencyValue>({ code: 'GBP', amount: 500 });

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <CurrencyInput currencies={CURRENCIES} label="You paid" value={value} onValueChange={setValue} />
      <p className="text-xs text-muted-foreground">
        {value.amount === null ? 'No amount yet' : `${value.amount} ${value.code}`}
      </p>
    </div>
  );
}
