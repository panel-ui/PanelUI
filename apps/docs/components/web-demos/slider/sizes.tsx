'use client';

import { Slider } from 'panelui-web/slider';

export default function SliderSizes() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Slider size="sm" label="Small" defaultValue={30} />
      <Slider size="md" label="Medium" defaultValue={50} />
      <Slider size="lg" label="Large" defaultValue={70} />
    </div>
  );
}
