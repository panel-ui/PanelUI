'use client';

import { useState } from 'react';
import { Micro } from 'panelui-web/micro';

export default function MicroStepperDemo() {
  const [speed, setSpeed] = useState(1);
  return (
    <Micro>
      <Micro.Label>Speed</Micro.Label>
      <Micro.Stepper
        value={speed}
        onValueChange={setSpeed}
        min={0.5}
        max={2}
        step={0.25}
        suffix="×"
        format={{ minimumFractionDigits: 1, maximumFractionDigits: 2 }}
        label="Playback speed"
      />
    </Micro>
  );
}
