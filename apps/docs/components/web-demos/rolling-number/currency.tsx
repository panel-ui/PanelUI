'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { RollingNumber } from 'panelui-web/rolling-number';
import { Stat } from 'panelui-web/stat';

export default function RollingNumberCurrency() {
  const [total, setTotal] = useState(1864.5);

  return (
    <div className="flex flex-col items-center gap-6">
      <Stat.Content className="items-center">
        <Stat.Label weight="medium">Trip budget left</Stat.Label>
        <RollingNumber
          value={total}
          format={{ style: 'currency', currency: 'EUR' }}
          className="text-4xl font-bold tracking-tight"
        />
      </Stat.Content>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setTotal((value) => value - 72.4)}>
          Book a train
        </Button>
        <Button size="sm" onClick={() => setTotal((value) => value + 350)}>
          Add a refund
        </Button>
      </div>
    </div>
  );
}
