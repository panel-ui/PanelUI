'use client';

import { XYPad } from 'panelui-web/xy-pad';

export default function XYPadTrail() {
  return (
    <XYPad label="Motion path" trail aspect="1 / 1" color="primary" grid={10} className="max-w-64">
      <XYPad.Value />
    </XYPad>
  );
}
