'use client';

import { CircleIcon, Cursor01Icon, PenTool01Icon, SquareIcon, TextIcon, Undo02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Toolbar } from 'panelui-web/toolbar';

export default function ToolbarThumb() {
  return (
    <Toolbar shape="pill" aria-label="Tools">
      <Toolbar.Handle />
      <Toolbar.Group tone="info" defaultValue="pen" aria-label="Tools">
        <Toolbar.Tool value="select" label="Select">
          <HugeiconsIcon icon={Cursor01Icon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="rectangle" label="Rectangle">
          <HugeiconsIcon icon={SquareIcon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="ellipse" label="Ellipse">
          <HugeiconsIcon icon={CircleIcon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="pen" label="Pen">
          <HugeiconsIcon icon={PenTool01Icon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="text" label="Text">
          <HugeiconsIcon icon={TextIcon} />
        </Toolbar.Tool>
      </Toolbar.Group>
      <Toolbar.Separator variant="dashed" />
      <Toolbar.Button label="Undo">
        <HugeiconsIcon icon={Undo02Icon} />
      </Toolbar.Button>
    </Toolbar>
  );
}
