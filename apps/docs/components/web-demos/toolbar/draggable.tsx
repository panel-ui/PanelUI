'use client';

import { useRef } from 'react';
import { CircleIcon, Cursor01Icon, PencilEdit02Icon, SquareIcon, TextIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
            <HugeiconsIcon icon={Cursor01Icon} />
          </Toolbar.Tool>
          <Toolbar.Tool value="pen" label="Pen" shortcut="P">
            <HugeiconsIcon icon={PencilEdit02Icon} />
          </Toolbar.Tool>
          <Toolbar.Tool value="rect" label="Rectangle" shortcut="R">
            <HugeiconsIcon icon={SquareIcon} />
          </Toolbar.Tool>
          <Toolbar.Tool value="ellipse" label="Ellipse" shortcut="O">
            <HugeiconsIcon icon={CircleIcon} />
          </Toolbar.Tool>
          <Toolbar.Tool value="text" label="Text" shortcut="T">
            <HugeiconsIcon icon={TextIcon} />
          </Toolbar.Tool>
        </Toolbar.Group>
      </Toolbar>
    </div>
  );
}
