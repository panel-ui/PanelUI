'use client';

import { useState } from 'react';
import { XYPad, type XYPadPoint } from 'panelui-web/xy-pad';

const COLUMNS = ['Left', 'Centre-left', 'Centre', 'Centre-right', 'Right'];
const ROWS = ['Bottom', 'Low', 'Middle', 'High', 'Top'];

export default function XYPadGrid() {
  const [anchor, setAnchor] = useState<XYPadPoint>({ x: 3, y: 3 });
  return (
    <div className="flex flex-col items-center gap-3">
      <XYPad
        label="Anchor"
        x={[0, 4]}
        y={[0, 4]}
        grid={4}
        snapToGrid
        aspect="1 / 1"
        value={anchor}
        onValueChange={setAnchor}
        format={(v, axis) => (axis === 'x' ? COLUMNS : ROWS)[v] ?? ''}
        className="w-48"
      />
      <p className="text-sm text-muted-foreground">
        Pinned <span className="text-foreground">{ROWS[anchor.y]?.toLowerCase()}</span>,{' '}
        <span className="text-foreground">{COLUMNS[anchor.x]?.toLowerCase()}</span>
      </p>
    </div>
  );
}
