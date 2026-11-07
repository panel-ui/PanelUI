'use client';

import { useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { Steps } from 'panelui-web/steps';

const STOPS = [
  { title: 'Basket', body: 'Three items — a linen shirt, two pairs of socks and a notebook. £42.80.' },
  { title: 'Delivery', body: 'Standard delivery to 14 Marlborough Road, arriving Thursday. £3.95.' },
  { title: 'Payment', body: 'Paid with the card ending 4417. A receipt is on its way to your inbox.' },
];

export default function StepsControlled() {
  const [active, setActive] = useState(0);
  const stop = STOPS[active]!;

  return (
    <div className="flex w-full max-w-lg flex-col gap-5">
      <Steps value={active} onValueChange={setActive}>
        {STOPS.map((item, at) => (
          <Steps.Item key={item.title} step={at}>
            <Steps.Trigger>
              <Steps.Indicator />
              <Steps.Title>{item.title}</Steps.Title>
            </Steps.Trigger>
          </Steps.Item>
        ))}
      </Steps>
      <p className="min-h-10 rounded-xl border bg-card px-4 py-3 text-sm leading-5 text-muted-foreground">
        {stop.body}
      </p>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={active === 0} onClick={() => setActive(active - 1)}>
          <ArrowLeftIcon />
          Back
        </Button>
        <Button size="sm" disabled={active === STOPS.length - 1} onClick={() => setActive(active + 1)}>
          Next
          <ArrowRightIcon />
        </Button>
      </div>
    </div>
  );
}
