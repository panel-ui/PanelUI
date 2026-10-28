'use client';

import { MousePointer2Icon, PenToolIcon, SquareIcon, TypeIcon } from 'lucide-react';
import { Toolbar } from 'panelui-web/toolbar';
import { Workbench } from 'panelui-web/workbench';

export default function WorkbenchThumb() {
  return (
    <Workbench className="h-48 w-80" focusShortcut={false} compactBelow={0}>
      <Workbench.Bar>
        <Toolbar size="sm" aria-label="Tools">
          <Toolbar.Group defaultValue="select" aria-label="Tools">
            <Toolbar.Tool value="select" label="Select">
              <MousePointer2Icon />
            </Toolbar.Tool>
            <Toolbar.Tool value="shape" label="Shape">
              <SquareIcon />
            </Toolbar.Tool>
            <Toolbar.Tool value="pen" label="Pen">
              <PenToolIcon />
            </Toolbar.Tool>
            <Toolbar.Tool value="text" label="Text">
              <TypeIcon />
            </Toolbar.Tool>
          </Toolbar.Group>
        </Toolbar>
      </Workbench.Bar>
      <Workbench.Canvas>
        <Workbench.Artboard aspect="16 / 10">
          <div className="size-full" style={{ background: 'linear-gradient(140deg, var(--chart-2), var(--chart-3))' }} />
        </Workbench.Artboard>
      </Workbench.Canvas>
    </Workbench>
  );
}
