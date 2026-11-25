'use client';

import { useState } from 'react';
import {
  BubbleChatIcon,
  Cursor01Icon,
  LeftToRightListBulletIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Toolbar } from 'panelui-web/toolbar';

export default function ToolbarAnnotate() {
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <Toolbar shape="pill" size="lg" aria-label="Review">
      <Toolbar.Handle />
      <Toolbar.Group defaultValue="select" tone="info" aria-label="Tools">
        <Toolbar.Tool value="select" label="Select" shortcut="V">
          <HugeiconsIcon icon={Cursor01Icon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="comment" label="Comment" shortcut="C">
          <HugeiconsIcon icon={BubbleChatIcon} />
        </Toolbar.Tool>
        <Toolbar.Tool value="notes" label="All notes" shortcut="N">
          <HugeiconsIcon icon={LeftToRightListBulletIcon} />
        </Toolbar.Tool>
      </Toolbar.Group>
      <Toolbar.Button
        label={hidden ? 'Show notes' : 'Hide notes'}
        aria-pressed={hidden}
        onClick={() => setHidden(!hidden)}
      >
        {hidden ? <HugeiconsIcon icon={ViewOffIcon} /> : <HugeiconsIcon icon={ViewIcon} />}
      </Toolbar.Button>
      <Toolbar.Separator variant="dashed" />
      <Toolbar.Button
        variant="inset"
        onClick={() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }}
      >
        {copied ? 'Copied' : 'Copy all'}
      </Toolbar.Button>
    </Toolbar>
  );
}
