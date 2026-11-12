'use client';

import { useState } from 'react';
import { Exchange, type ExchangeCurrency, type ExchangeValue } from 'panelui-web/exchange';

const CURRENCIES: ExchangeCurrency[] = [
  { code: 'GBP', name: 'Pound sterling', symbol: '£', color: 'chart-4' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'AED', name: 'UAE dirham', symbol: 'د', color: 'chart-3' },
  { code: 'INR', name: 'Indian rupee', symbol: '₹', color: 'chart-5' },
];

/** Units of each currency to one pound. Sample figures, not live rates. */
const RATES = { GBP: 1, EUR: 1.137, AED: 4.82, INR: 116.3 };

export default function ExchangeControlled() {
  const [value, setValue] = useState<ExchangeValue>({ from: 'GBP', to: 'INR', amount: 500, side: 'to' });

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Exchange currencies={CURRENCIES} rates={RATES} value={value} onValueChange={setValue}>
        <Exchange.Field side="from" label="You send" />
        <Exchange.Swap />
        <Exchange.Field side="to" label="They receive" />
      </Exchange>
      <p className="text-xs text-muted-foreground">
        Fixed side: {value.side === 'to' ? 'what they receive' : 'what you send'} ·{' '}
        {value.amount === null ? 'no amount' : `${value.amount} ${value.side === 'to' ? value.to : value.from}`}
      </p>
    </div>
  );
}
