'use client';

import { Slider, type SliderColor } from 'panelui-web/slider';

const COLORS: [SliderColor, number][] = [
  ['neutral', 62],
  ['primary', 48],
  ['info', 71],
  ['success', 36],
  ['warning', 55],
  ['destructive', 24],
];

export default function SliderColors() {
  return (
    <div className="grid w-full max-w-xl gap-x-6 gap-y-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        {COLORS.map(([color, value]) => (
          <Slider key={color} label={color[0]!.toUpperCase() + color.slice(1)} color={color} defaultValue={value} />
        ))}
      </div>
      <div className="flex flex-col justify-around gap-2">
        {COLORS.map(([color, value]) => (
          <Slider key={color} variant="line" label={color} color={color} defaultValue={value} />
        ))}
      </div>
    </div>
  );
}
