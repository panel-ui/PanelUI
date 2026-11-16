'use client';

import { Button } from 'panelui-web/button';
import { Frame } from 'panelui-web/frame';
import { CurrencyInput, type CurrencyOption } from 'panelui-web/currency-input';

const CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', color: 'chart-1' },
  { code: 'CHF', name: 'Swiss franc', symbol: 'F', color: 'chart-5' },
  { code: 'TRY', name: 'Turkish lira', symbol: '₺', color: 'chart-3' },
  { code: 'USD', name: 'US dollar', symbol: '$', color: 'chart-2' },
];

export default function CurrencyInputFramed() {
  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Travel money</Frame.Title>
        <Frame.Action>Budget</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="flex flex-col gap-4 p-3">
        <CurrencyInput currencies={CURRENCIES} label="You spent" defaultValue={{ code: 'EUR', amount: 64 }} />
        <Button className="w-full">Save the expense</Button>
      </Frame.Panel>
    </Frame>
  );
}
