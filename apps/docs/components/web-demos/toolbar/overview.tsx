'use client';

import {
  BubbleChatIcon,
  CircleIcon,
  Cursor01Icon,
  FrameIcon,
  HandGrabIcon,
  PenTool01Icon,
  Redo02Icon,
  SquareIcon,
  TextIcon,
  Undo02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Toolbar } from 'panelui-web/toolbar';

export default function ToolbarOverview() {
  return (
    <Toolbar shape="pill">
      <Toolbar.Handle />
      <Toolbar.Group tone="info" defaultValue="select" aria-label="Tools">
        <Toolbar.Tool value="select" label="Select" shortcut="V">
          <HugeiconsIcon icon={Cursor01Icon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="hand" label="Pan" shortcut="H">
          <HugeiconsIcon icon={HandGrabIcon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="frame" label="Frame" shortcut="F">
          <HugeiconsIcon icon={FrameIcon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="rectangle" label="Rectangle" shortcut="R">
          <HugeiconsIcon icon={SquareIcon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="ellipse" label="Ellipse" shortcut="E">
          <HugeiconsIcon icon={CircleIcon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="pen" label="Pen" shortcut="P">
          <HugeiconsIcon icon={PenTool01Icon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="text" label="Text" shortcut="T">
          <HugeiconsIcon icon={TextIcon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="comment" label="Comment" shortcut="C">
          <HugeiconsIcon icon={BubbleChatIcon} />
        </Toolbar.Tool>
      </Toolbar.Group>
      <Toolbar.Separator variant="dashed" />
      <Toolbar.Button label="Undo" shortcut="⌘Z">
        <HugeiconsIcon icon={Undo02Icon} />
      </Toolbar.Button>
      <Toolbar.Button label="Redo" shortcut="⇧⌘Z" disabled>
        <HugeiconsIcon icon={Redo02Icon} />
      </Toolbar.Button>
    </Toolbar>
  );
}
