'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Flow } from 'panelui-web/flow';

interface Step {
  id: string;
  x: number;
  y: number;
}

const FIRST: Step[] = [{ id: 'step-1', x: 0, y: 0 }];

export default function FlowBuilder() {
  // The canvas keeps no list of its own. The steps and the links are state
  // here, and adding either is adding to an array.
  const [steps, setSteps] = useState(FIRST);
  const [links, setLinks] = useState<{ from: string; to: string }[]>([]);

  const add = (linked: boolean) => {
    const index = steps.length;
    // Short columns rather than one long march, so the first steps stay in view.
    const step = { id: `step-${index + 1}`, x: Math.floor(index / 3) * 240, y: (index % 3) * 130 };
    const previous = steps[steps.length - 1];
    setSteps([...steps, step]);
    if (linked && previous) setLinks([...links, { from: previous.id, to: step.id }]);
  };

  return (
    <div className="relative h-[28rem] w-full">
      <Flow defaultViewport={{ x: 72, y: 24, zoom: 1 }} label="Steps" className="h-full rounded-none border-0">
        <Flow.Background variant="dots" />
        {steps.map((step, index) => (
          <Flow.Node key={step.id} id={step.id} position={{ x: step.x, y: step.y }} className="w-44">
            <Flow.NodeContent>
              <Flow.NodeTitle>Step {index + 1}</Flow.NodeTitle>
              <Flow.NodeDescription>Drag it anywhere</Flow.NodeDescription>
            </Flow.NodeContent>
          </Flow.Node>
        ))}
        {links.map((link) => (
          <Flow.Edge key={link.to} from={link.from} to={link.to} variant="smoothstep" arrow />
        ))}
        <Flow.Controls position="top-left" lock={false} />
      </Flow>

      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => add(false)}>
          Add a step
        </Button>
        <Button size="sm" onClick={() => add(true)}>
          Add and link
        </Button>
        <Button variant="ghost" size="sm" onClick={() => (setSteps(FIRST), setLinks([]))}>
          Clear
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {steps.length} {steps.length === 1 ? 'step' : 'steps'}, {links.length} {links.length === 1 ? 'link' : 'links'}
        </span>
      </div>
    </div>
  );
}
