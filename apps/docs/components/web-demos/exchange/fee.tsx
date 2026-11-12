'use client';

import { Exchange, type ExchangeCurrency } from 'panelui-web/exchange';

const CURRENCIES: ExchangeCurrency[] = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
  { code: 'CAD', name: 'Canadian dollar', symbol: '$', color: 'chart-5' },
  { code: 'MXN', name: 'Mexican peso', symbol: '$', color: 'chart-1' },
];

/** Units of each currency to one US dollar. Sample figures, not live rates. */
const RATES: Record<string, number> = { USD: 1, CAD: 1.39, MXN: 18.4 };
const FEE = 0.006;

/** The market rate, less a fee taken from what arrives, and added back the other way. */
const convert = (amount: number, from: string, to: string) => {
  const market = (amount / RATES[from]!) * RATES[to]!;
  return from === 'USD' ? market * (1 - FEE) : market / (1 - FEE);
};

export default function ExchangeFee() {
  return (
    <Exchange currencies={CURRENCIES} convert={convert} defaultValue={{ from: 'USD', to: 'MXN', amount: 1200 }}>
      <Exchange.Field side="from" label="You send" detail="Includes a 0.6% fee" />
      <Exchange.Swap />
      <Exchange.Field side="to" label="They receive" />
    </Exchange>
  );
}
