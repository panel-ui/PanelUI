'use client';

import { Redo2Icon, Undo2Icon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { useState } from 'react';
import { Slider } from 'panelui-web/slider';
import { Toolbar } from 'panelui-web/toolbar';

/** Every zoom the hand settled on, so undo and redo walk back and forth through them. */
export default function ToolbarHistory() {
  const [steps, setSteps] = useState([100]);
  const [at, setAt] = useState(0);
  const zoom = steps[at]!;
  const settle = (next: number) => {
    if (next === zoom) return;
    setSteps([...steps.slice(0, at + 1), next]);
    setAt(at + 1);
  };
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <Toolbar size="sm" aria-label="View">
      <Toolbar.Button label="Undo" shortcut="⌘Z" disabled={at === 0} onClick={() => setAt(at - 1)}>
        <Undo2Icon />
      </Toolbar.Button>
      <Toolbar.Button label="Redo" shortcut="⇧⌘Z" disabled={at === steps.length - 1} onClick={() => setAt(at + 1)}>
        <Redo2Icon />
      </Toolbar.Button>
      <Toolbar.Separator />
      <div className="flex w-56 items-center px-1">
        <Slider
          variant="line"
          label="Zoom"
          min={25}
          max={400}
          step={5}
          value={dragging ?? zoom}
          onValueChange={setDragging}
          onValueCommitted={(value) => {
            settle(value as number);
            setDragging(null);
          }}
        >
          <Slider.Step by={-25} aria-label="Zoom out" onClick={(event) => (event.preventDefault(), settle(Math.max(25, zoom - 25)))}>
            <ZoomOutIcon />
          </Slider.Step>
          <Slider.Step by={25} aria-label="Zoom in" onClick={(event) => (event.preventDefault(), settle(Math.min(400, zoom + 25)))}>
            <ZoomInIcon />
          </Slider.Step>
        </Slider>
      </div>
      <span className="w-12 pe-2 text-end text-xs tabular-nums text-muted-foreground">{dragging ?? zoom}%</span>
    </Toolbar>
  );
}
