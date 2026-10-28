'use client';

import { Slider } from 'panelui-web/slider';

const signed = (digits: number, unit = '') => (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}${unit}`;

export default function SliderCenter() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Slider label="Exposure" origin="center" min={-3} max={3} step={0.1} defaultValue={0.7} format={signed(1, ' EV')} />
      <Slider label="Contrast" origin="center" min={-100} max={100} defaultValue={-18} format={signed(0)} />
      <Slider label="Warmth" origin="center" min={-100} max={100} defaultValue={32} format={signed(0)} color="warning" />
      <Slider label="Tint" origin="center" min={-100} max={100} defaultValue={-12} format={signed(0)} color="success" />
    </div>
  );
}
