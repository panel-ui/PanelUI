'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { RollingNumber } from 'panelui-web/rolling-number';
import { Stat } from 'panelui-web/stat';

/** Three weeks after a launch. */
const WEEKS = [
  { downloads: 18420, paid: 0.031, sales: 46200 },
  { downloads: 21960, paid: 0.038, sales: 61850 },
  { downloads: 19310, paid: 0.027, sales: 39400 },
];

export default function RollingNumberFormats() {
  const [week, setWeek] = useState(0);
  const { downloads, paid, sales } = WEEKS[week];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid grid-cols-3 gap-8 text-center">
        <Stat.Content className="items-center">
          <Stat.Label weight="medium">Downloads</Stat.Label>
          <RollingNumber value={downloads} className="text-2xl font-bold" />
        </Stat.Content>
        <Stat.Content className="items-center">
          <Stat.Label weight="medium">Trial to paid</Stat.Label>
          <RollingNumber
            value={paid}
            format={{ style: 'percent', minimumFractionDigits: 1 }}
            className="text-2xl font-bold"
          />
        </Stat.Content>
        <Stat.Content className="items-center">
          <Stat.Label weight="medium">Sales</Stat.Label>
          <RollingNumber
            value={sales}
            format={{
              style: 'currency',
              currency: 'USD',
              notation: 'compact',
              maximumFractionDigits: 1,
            }}
            className="text-2xl font-bold"
          />
        </Stat.Content>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setWeek((current) => (current + 1) % WEEKS.length)}
      >
        Next week
      </Button>
    </div>
  );
}
