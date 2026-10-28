'use client';

import { BrushIcon, CropIcon, EraserIcon, PipetteIcon, Settings2Icon, SlidersHorizontalIcon, StampIcon } from 'lucide-react';
import { useState } from 'react';
import { Toolbar } from 'panelui-web/toolbar';

const TOOLS = [
  { value: 'crop', label: 'Crop and straighten', icon: CropIcon },
  { value: 'adjust', label: 'Adjust', icon: SlidersHorizontalIcon },
  { value: 'brush', label: 'Brush', icon: BrushIcon },
  { value: 'erase', label: 'Erase', icon: EraserIcon },
  { value: 'heal', label: 'Heal', icon: StampIcon },
  { value: 'sample', label: 'Sample colour', icon: PipetteIcon },
];

export default function ToolbarRail() {
  const [tool, setTool] = useState('adjust');
  const current = TOOLS.find((each) => each.value === tool);
  return (
    <div className="flex items-center gap-6">
      <Toolbar orientation="vertical" aria-label="Photo tools">
        <Toolbar.Group value={tool} onValueChange={setTool} aria-label="Tools">
          {TOOLS.map(({ value, label, icon: Icon }) => (
            <Toolbar.Tool key={value} value={value} label={label}>
              <Icon />
            </Toolbar.Tool>
          ))}
        </Toolbar.Group>
        <Toolbar.Separator />
        <Toolbar.Button label="Editor settings">
          <Settings2Icon />
        </Toolbar.Button>
      </Toolbar>
      <p className="w-36 text-sm text-muted-foreground">
        <span className="block text-foreground">{current?.label}</span>
        tool chosen
      </p>
    </div>
  );
}
