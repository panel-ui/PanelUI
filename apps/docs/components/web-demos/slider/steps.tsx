'use client';

import { Slider } from 'panelui-web/slider';

const QUALITY = ['Draft', 'Low', 'Medium', 'High', 'Best'];

export default function SliderSteps() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Slider label="Columns" min={1} max={12} defaultValue={4} />
      <Slider label="Export quality" min={0} max={4} defaultValue={3} format={(v) => QUALITY[v] ?? ''} color="primary" />
    </div>
  );
}
