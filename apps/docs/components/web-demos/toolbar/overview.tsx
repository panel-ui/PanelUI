'use client';

import {
  CircleIcon,
  FrameIcon,
  HandIcon,
  MessageCircleIcon,
  MousePointer2Icon,
  PenToolIcon,
  Redo2Icon,
  SquareIcon,
  TypeIcon,
  Undo2Icon,
} from 'lucide-react';
import { Toolbar } from 'panelui-web/toolbar';

export default function ToolbarOverview() {
  return (
    <Toolbar>
      <Toolbar.Group defaultValue="select" aria-label="Tools">
        <Toolbar.Tool value="select" label="Select" shortcut="V">
          <MousePointer2Icon />
        </Toolbar.Tool>
        <Toolbar.Tool value="hand" label="Pan" shortcut="H">
          <HandIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="frame" label="Frame" shortcut="F">
          <FrameIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="rectangle" label="Rectangle" shortcut="R">
          <SquareIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="ellipse" label="Ellipse" shortcut="O">
          <CircleIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="pen" label="Pen" shortcut="P">
          <PenToolIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="text" label="Text" shortcut="T">
          <TypeIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="comment" label="Comment" shortcut="C">
          <MessageCircleIcon />
        </Toolbar.Tool>
      </Toolbar.Group>
      <Toolbar.Separator />
      <Toolbar.Button label="Undo" shortcut="⌘Z">
        <Undo2Icon />
      </Toolbar.Button>
      <Toolbar.Button label="Redo" shortcut="⇧⌘Z" disabled>
        <Redo2Icon />
      </Toolbar.Button>
    </Toolbar>
  );
}
