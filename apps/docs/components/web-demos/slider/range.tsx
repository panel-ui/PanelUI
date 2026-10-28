'use client';

import { Slider } from 'panelui-web/slider';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const hour = (value: number) => `${Math.floor(value)}:${value % 1 ? '30' : '00'}`;

export default function SliderRange() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Slider label="Keep" min={0} max={214} defaultValue={[18, 162]} format={clock} color="info" />
      <Slider label="Open" min={6} max={24} step={0.5} defaultValue={[8.5, 18]} format={hour} />
    </div>
  );
}
