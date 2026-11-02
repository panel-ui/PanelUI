'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { RollingNumber } from 'panelui-web/rolling-number';

export default function RollingNumberSlow() {
  const [score, setScore] = useState(2048);

  return (
    <div className="flex flex-col items-center gap-6">
      <RollingNumber
        value={score}
        duration={1400}
        className="text-5xl font-semibold tracking-tight"
      />
      <Button variant="outline" size="sm" onClick={() => setScore((value) => value * 2)}>
        Double it
      </Button>
    </div>
  );
}
