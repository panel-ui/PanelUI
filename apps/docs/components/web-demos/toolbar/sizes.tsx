'use client';

import {
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextItalicIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Toolbar, type ToolbarSize } from 'panelui-web/toolbar';

const SIZES: ToolbarSize[] = ['sm', 'md', 'lg'];

export default function ToolbarSizes() {
  return (
    <div className="flex flex-col items-center gap-4">
      {SIZES.map((size) => (
        <Toolbar shape="pill" key={size} size={size} aria-label={`Text, ${size}`}>
          <Toolbar.Button label="Bold">
            <HugeiconsIcon icon={TextBoldIcon} />
          </Toolbar.Button>
          <Toolbar.Button label="Italic">
            <HugeiconsIcon icon={TextItalicIcon} />
          </Toolbar.Button>
          <Toolbar.Separator variant="dashed" />
          <Toolbar.Group tone="info" defaultValue="left" aria-label="Alignment">
            <Toolbar.Tool value="left" label="Align left">
              <HugeiconsIcon icon={TextAlignLeftIcon} />
            </Toolbar.Tool>
            <Toolbar.Tool value="center" label="Centre">
              <HugeiconsIcon icon={TextAlignCenterIcon} />
            </Toolbar.Tool>
            <Toolbar.Tool value="right" label="Align right">
              <HugeiconsIcon icon={TextAlignRightIcon} />
            </Toolbar.Tool>
          </Toolbar.Group>
        </Toolbar>
      ))}
    </div>
  );
}
