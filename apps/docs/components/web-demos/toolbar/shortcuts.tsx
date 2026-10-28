'use client';

import { EraserIcon, HighlighterIcon, LassoSelectIcon, PencilIcon, ShapesIcon } from 'lucide-react';
import { useState } from 'react';
import { Toolbar } from 'panelui-web/toolbar';

const TOOLS = [
  { value: 'lasso', label: 'Lasso', shortcut: 'L', icon: LassoSelectIcon },
  { value: 'pencil', label: 'Pencil', shortcut: 'B', icon: PencilIcon },
  { value: 'marker', label: 'Marker', shortcut: 'M', icon: HighlighterIcon },
  { value: 'shapes', label: 'Shapes', shortcut: 'S', icon: ShapesIcon },
  { value: 'eraser', label: 'Eraser', shortcut: 'E', icon: EraserIcon },
];

export default function ToolbarShortcuts() {
  const [tool, setTool] = useState('pencil');
  return (
    <div className="flex flex-col items-center gap-4">
      <Toolbar shortcuts size="lg" aria-label="Sketch tools">
        <Toolbar.Group value={tool} onValueChange={setTool} aria-label="Tools">
          {TOOLS.map(({ value, label, shortcut, icon: Icon }) => (
            <Toolbar.Tool key={value} value={value} label={label} shortcut={shortcut}>
              <Icon />
            </Toolbar.Tool>
          ))}
        </Toolbar.Group>
      </Toolbar>
      <p className="text-sm text-muted-foreground">
        Press{' '}
        {TOOLS.map(({ shortcut }) => (
          <kbd key={shortcut} className="mx-0.5 rounded-md bg-muted px-1.5 py-0.5 font-sans text-xs text-foreground">
            {shortcut}
          </kbd>
        ))}{' '}
        anywhere on this page.
      </p>
    </div>
  );
}
