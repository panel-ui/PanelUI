'use client';

import { Slider } from 'panelui-web/slider';

const PERCENT = { style: 'unit', unit: 'percent' } as const;

export default function SliderOverview() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Slider label="Size" defaultValue={24} min={1} max={120} format={(v) => `${v} px`} />
      <Slider label="Opacity" defaultValue={80} format={PERCENT} />
      <Slider label="Hardness" defaultValue={35} format={PERCENT} />
      <Slider label="Smoothing" defaultValue={1.4} min={0} max={4} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
    </div>
  );
}
