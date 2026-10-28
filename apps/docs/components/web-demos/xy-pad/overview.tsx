'use client';

import { XYPad } from 'panelui-web/xy-pad';

export default function XYPadOverview() {
  return (
    <XYPad label="Framing" defaultValue={{ x: 0.32, y: -0.18 }} className="max-w-sm">
      <XYPad.Value />
    </XYPad>
  );
}
