'use client';

import { Button } from 'panelui-web/button';
import { Tooltip } from 'panelui-web/tooltip';
import { MousePointer2Icon, PenLineIcon, SquareIcon, TypeIcon, Undo2Icon } from 'lucide-react';

const TOOLS = [
  { label: 'Select', keys: ['V'], icon: <MousePointer2Icon /> },
  { label: 'Frame', keys: ['F'], icon: <SquareIcon /> },
  { label: 'Pen', keys: ['P'], icon: <PenLineIcon /> },
  { label: 'Text', keys: ['T'], icon: <TypeIcon /> },
  { label: 'Undo', keys: ['⌘', 'Z'], icon: <Undo2Icon /> },
];

export default function TooltipShortcut() {
  return (
    <Tooltip.Provider>
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => (
          <Tooltip key={tool.label}>
            <Tooltip.Trigger render={<Button variant="outline" size="icon" aria-label={tool.label} />}>
              {tool.icon}
            </Tooltip.Trigger>
            <Tooltip.Content variant="shortcut" side="bottom">
              {tool.label}
              <Tooltip.Shortcut keys={tool.keys} />
            </Tooltip.Content>
          </Tooltip>
        ))}
      </div>
    </Tooltip.Provider>
  );
}
