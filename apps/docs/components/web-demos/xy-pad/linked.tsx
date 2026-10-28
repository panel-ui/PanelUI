'use client';

import { useState } from 'react';
import { Slider } from 'panelui-web/slider';
import { XYPad, type XYPadPoint } from 'panelui-web/xy-pad';

const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;

export default function XYPadLinked() {
  const [light, setLight] = useState<XYPadPoint>({ x: -0.45, y: 0.6 });
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <XYPad label="Key light" value={light} onValueChange={setLight} color="success" aspect="4 / 3" />
      <Slider
        label="Across"
        origin="center"
        min={-1}
        max={1}
        step={0.01}
        value={light.x}
        onValueChange={(x) => setLight((at) => ({ ...at, x }))}
        format={signed}
        color="success"
      />
      <Slider
        label="Height"
        origin="center"
        min={-1}
        max={1}
        step={0.01}
        value={light.y}
        onValueChange={(y) => setLight((at) => ({ ...at, y }))}
        format={signed}
        color="success"
      />
    </div>
  );
}
