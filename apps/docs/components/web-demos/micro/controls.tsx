'use client';

import { useState } from 'react';
import { MinimizeIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { Micro } from 'panelui-web/micro';

export default function MicroControls() {
  const [view, setView] = useState('split');
  const [zoom, setZoom] = useState(100);
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Micro>
        <Micro.Segments value={view} onValueChange={setView} aria-label="Layout">
          <Micro.Segment value="editor">Editor</Micro.Segment>
          <Micro.Segment value="split">Split</Micro.Segment>
          <Micro.Segment value="preview">Preview</Micro.Segment>
        </Micro.Segments>
      </Micro>
      <Micro>
        <Micro.Button
          variant="ghost"
          aria-label="Zoom out"
          onClick={() => setZoom((value) => Math.max(25, value - 25))}
        >
          <ZoomOutIcon />
        </Micro.Button>
        <Micro.Mono className="w-12 text-center">{zoom}%</Micro.Mono>
        <Micro.Button
          variant="ghost"
          aria-label="Zoom in"
          onClick={() => setZoom((value) => Math.min(400, value + 25))}
        >
          <ZoomInIcon />
        </Micro.Button>
        <Micro.Separator />
        <Micro.Button variant="ghost" aria-label="Fit to screen" onClick={() => setZoom(100)}>
          <MinimizeIcon />
        </Micro.Button>
      </Micro>
      <Micro>
        <Micro.Label>Columns</Micro.Label>
        <Micro.Stepper defaultValue={3} min={1} max={6} label="Columns" />
      </Micro>
    </div>
  );
}
