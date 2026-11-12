'use client';

import { Exchange } from 'panelui-web/exchange';

const CURRENCIES = [
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' as const },
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' as const },
];

export default function ExchangeThumb() {
  return (
    <Exchange
      currencies={CURRENCIES}
      rates={{ USD: 1, EUR: 0.866 }}
      defaultValue={{ from: 'USD', to: 'EUR', amount: 40 }}
      className="w-72"
    >
      <Exchange.Field side="from" label="You pay" detail={null} />
      <Exchange.Swap />
      <Exchange.Field side="to" label="You receive" detail={null} />
    </Exchange>
  );
}
