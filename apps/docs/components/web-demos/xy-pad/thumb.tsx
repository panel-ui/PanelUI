'use client';

import { XYPad } from 'panelui-web/xy-pad';

export default function XYPadThumb() {
  return <XYPad label="Framing" defaultValue={{ x: 0.35, y: 0.25 }} className="w-56" />;
}
