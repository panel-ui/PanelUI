'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Slider } from 'panelui-web/slider';

export default function SliderLine() {
  const [zoom, setZoom] = useState(100);
  return (
    <div className="flex w-full max-w-sm items-center gap-3">
      <Slider variant="line" label="Zoom" value={zoom} onValueChange={setZoom} min={25} max={400} step={5}>
        <Slider.Step by={-25} aria-label="Zoom out">
          <MinusIcon />
        </Slider.Step>
        <Slider.Step by={25} aria-label="Zoom in">
          <PlusIcon />
        </Slider.Step>
      </Slider>
      <span className="w-12 shrink-0 text-end text-sm tabular-nums text-muted-foreground">{zoom}%</span>
    </div>
  );
}
