'use client';

import { Button } from 'panelui-web/button';
import { Exchange, type ExchangeCurrency } from 'panelui-web/exchange';
import { Frame } from 'panelui-web/frame';

const CURRENCIES: ExchangeCurrency[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'CHF', name: 'Swiss franc', symbol: 'F', color: 'chart-5' },
  { code: 'TRY', name: 'Turkish lira', symbol: '₺', color: 'chart-3' },
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
];

/** Units of each currency to one euro. Sample figures, not live rates. */
const RATES = { EUR: 1, CHF: 0.935, TRY: 48.4, USD: 1.155 };

export default function ExchangeFramed() {
  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Travel money</Frame.Title>
        <Frame.Action>Rate held 10 min</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="flex flex-col gap-4 p-3">
        <Exchange currencies={CURRENCIES} rates={RATES} defaultValue={{ from: 'EUR', to: 'TRY', amount: 300 }}>
          <Exchange.Field side="from" label="You pay" />
          <Exchange.Swap />
          <Exchange.Field side="to" label="You get" />
        </Exchange>
        <Button className="w-full">Order currency</Button>
      </Frame.Panel>
    </Frame>
  );
}
