'use client';

import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, BoldIcon, ItalicIcon } from 'lucide-react';
import { Toolbar, type ToolbarSize } from 'panelui-web/toolbar';

const SIZES: ToolbarSize[] = ['sm', 'md', 'lg'];

export default function ToolbarSizes() {
  return (
    <div className="flex flex-col items-center gap-4">
      {SIZES.map((size) => (
        <Toolbar key={size} size={size} aria-label={`Text, ${size}`}>
          <Toolbar.Button label="Bold">
            <BoldIcon />
          </Toolbar.Button>
          <Toolbar.Button label="Italic">
            <ItalicIcon />
          </Toolbar.Button>
          <Toolbar.Separator />
          <Toolbar.Group defaultValue="left" aria-label="Alignment">
            <Toolbar.Tool value="left" label="Align left">
              <AlignLeftIcon />
            </Toolbar.Tool>
            <Toolbar.Tool value="center" label="Centre">
              <AlignCenterIcon />
            </Toolbar.Tool>
            <Toolbar.Tool value="right" label="Align right">
              <AlignRightIcon />
            </Toolbar.Tool>
          </Toolbar.Group>
        </Toolbar>
      ))}
    </div>
  );
}
