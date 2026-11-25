'use client';

import {
  ColorPickerIcon,
  CropIcon,
  Eraser01Icon,
  PaintBrush01Icon,
  Settings02Icon,
  SlidersHorizontalIcon,
  StampIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { Toolbar } from 'panelui-web/toolbar';

const TOOLS = [
  { value: 'crop', label: 'Crop and straighten', icon: CropIcon },
  { value: 'adjust', label: 'Adjust', icon: SlidersHorizontalIcon },
  { value: 'brush', label: 'Brush', icon: PaintBrush01Icon },
  { value: 'erase', label: 'Erase', icon: Eraser01Icon },
  { value: 'heal', label: 'Heal', icon: StampIcon },
  { value: 'sample', label: 'Sample colour', icon: ColorPickerIcon },
];

export default function ToolbarRail() {
  const [tool, setTool] = useState('adjust');
  const current = TOOLS.find((each) => each.value === tool);
  return (
    <div className="flex items-center gap-6">
      <Toolbar shape="pill" orientation="vertical" aria-label="Photo tools">
        <Toolbar.Group tone="info" value={tool} onValueChange={setTool} aria-label="Tools">
          {TOOLS.map(({ value, label, icon: Icon }) => (
            <Toolbar.Tool key={value} value={value} label={label}>
              <HugeiconsIcon icon={Icon} />
            </Toolbar.Tool>
          ))}
        </Toolbar.Group>
        <Toolbar.Separator variant="dashed" />
        <Toolbar.Button label="Editor settings">
          <HugeiconsIcon icon={Settings02Icon} />
        </Toolbar.Button>
      </Toolbar>
      <p className="w-36 text-sm text-muted-foreground">
        <span className="block text-foreground">{current?.label}</span>
        tool chosen
      </p>
    </div>
  );
}
