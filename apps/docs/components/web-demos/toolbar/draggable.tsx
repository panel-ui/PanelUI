'use client';

import { useRef } from 'react';
import { CircleIcon, MousePointer2Icon, PenLineIcon, SquareIcon, TypeIcon } from 'lucide-react';
import { Toolbar } from 'panelui-web/toolbar';

export default function ToolbarDraggable() {
  const area = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={area}
      className="relative flex h-72 w-full max-w-2xl items-start justify-center rounded-2xl border border-dashed p-4"
    >
      <Toolbar aria-label="Drawing tools">
        <Toolbar.Handle bounds={area} />
        <Toolbar.Group defaultValue="pen" aria-label="Tools">
          <Toolbar.Tool value="select" label="Select" shortcut="V">
            <MousePointer2Icon />
          </Toolbar.Tool>
          <Toolbar.Tool value="pen" label="Pen" shortcut="P">
            <PenLineIcon />
          </Toolbar.Tool>
          <Toolbar.Tool value="rect" label="Rectangle" shortcut="R">
            <SquareIcon />
          </Toolbar.Tool>
          <Toolbar.Tool value="ellipse" label="Ellipse" shortcut="O">
            <CircleIcon />
          </Toolbar.Tool>
          <Toolbar.Tool value="text" label="Text" shortcut="T">
            <TypeIcon />
          </Toolbar.Tool>
        </Toolbar.Group>
      </Toolbar>
    </div>
  );
}
