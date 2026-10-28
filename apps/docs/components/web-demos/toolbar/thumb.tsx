'use client';

import { CircleIcon, MousePointer2Icon, PenToolIcon, SquareIcon, TypeIcon, Undo2Icon } from 'lucide-react';
import { Toolbar } from 'panelui-web/toolbar';

export default function ToolbarThumb() {
  return (
    <Toolbar aria-label="Tools">
      <Toolbar.Group defaultValue="pen" aria-label="Tools">
        <Toolbar.Tool value="select" label="Select">
          <MousePointer2Icon />
        </Toolbar.Tool>
        <Toolbar.Tool value="rectangle" label="Rectangle">
          <SquareIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="ellipse" label="Ellipse">
          <CircleIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="pen" label="Pen">
          <PenToolIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="text" label="Text">
          <TypeIcon />
        </Toolbar.Tool>
      </Toolbar.Group>
      <Toolbar.Separator />
      <Toolbar.Button label="Undo">
        <Undo2Icon />
      </Toolbar.Button>
    </Toolbar>
  );
}
