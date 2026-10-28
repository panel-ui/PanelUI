'use client';

import { Slider } from 'panelui-web/slider';

export default function SliderThumb() {
  return (
    <div className="flex w-56 flex-col gap-2">
      <Slider label="Opacity" defaultValue={72} format={{ style: 'unit', unit: 'percent' }} />
      <Slider label="Exposure" origin="center" min={-3} max={3} step={0.1} defaultValue={1.2} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`} color="primary" />
    </div>
  );
}
