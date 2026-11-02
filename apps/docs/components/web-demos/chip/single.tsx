'use client';

import { useState } from 'react';
import { Chip } from 'panelui-web/chip';

const RANGES = ['Today', 'This week', 'This month', 'All time'];

export default function ChipSingle() {
  const [range, setRange] = useState(['This week']);
  return (
    <div className="flex flex-col items-center gap-3">
      <Chip.Group
        multiple={false}
        value={range}
        onValueChange={(next) => next.length > 0 && setRange(next)}
        aria-label="Date range"
      >
        {RANGES.map((label) => (
          <Chip key={label} value={label} color="info">
            {label}
          </Chip>
        ))}
      </Chip.Group>
      <p className="text-sm text-muted-foreground">Showing: {range[0]}</p>
    </div>
  );
}
