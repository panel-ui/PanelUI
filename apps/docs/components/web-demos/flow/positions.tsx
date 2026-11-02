'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Flow, type FlowNodePosition } from 'panelui-web/flow';

const IDS = ['brief', 'sketch', 'review', 'final'] as const;
type Id = (typeof IDS)[number];

const ROW: Record<Id, FlowNodePosition> = {
  brief: { x: 0, y: 80 },
  sketch: { x: 220, y: 80 },
  review: { x: 440, y: 80 },
  final: { x: 660, y: 80 },
};

const STAIRS: Record<Id, FlowNodePosition> = {
  brief: { x: 0, y: 0 },
  sketch: { x: 200, y: 70 },
  review: { x: 400, y: 140 },
  final: { x: 600, y: 210 },
};

const TITLES: Record<Id, string> = { brief: 'Brief', sketch: 'Sketches', review: 'Review', final: 'Final art' };

export default function FlowPositions() {
  // The positions are state here. A drag reports where a node was dropped,
  // and the buttons move every node by passing new positions back.
  const [positions, setPositions] = useState(ROW);

  return (
    <div className="relative h-[28rem] w-full">
      <Flow
        fitViewOnMount
        fitViewPadding={56}
        label="Poster project"
        className="h-full rounded-none border-0"
        onNodeDragEnd={(id, position) => setPositions((current) => ({ ...current, [id]: position }))}
      >
        <Flow.Background variant="lines" gap={28} />
        {IDS.map((id) => (
          <Flow.Node key={id} id={id} position={positions[id]} className="w-40">
            <Flow.NodeContent>
              <Flow.NodeTitle>{TITLES[id]}</Flow.NodeTitle>
              <Flow.NodeDescription className="font-mono text-xs tabular-nums">
                {Math.round(positions[id].x)}, {Math.round(positions[id].y)}
              </Flow.NodeDescription>
            </Flow.NodeContent>
          </Flow.Node>
        ))}
        {IDS.slice(1).map((id, index) => (
          <Flow.Edge key={id} from={IDS[index]} to={id} variant="smoothstep" arrow />
        ))}
      </Flow>

      <div className="absolute bottom-3 left-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setPositions(ROW)}>
          In a row
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPositions(STAIRS)}>
          As stairs
        </Button>
      </div>
    </div>
  );
}
