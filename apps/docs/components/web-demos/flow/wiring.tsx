'use client';

import { useCallback, useState } from 'react';
import { Button } from 'panelui-web/button';
import { Flow, type FlowConnection } from 'panelui-web/flow';

/** Each step, and where it sits: across a wide screen, down a narrow one. */
const NODES = [
  {
    id: 'form',
    name: 'Sign-up form',
    across: { x: 0, y: 90 },
    down: { x: 0, y: 0 },
  },
  {
    id: 'verify',
    name: 'Verify email',
    across: { x: 320, y: 0 },
    down: { x: 150, y: 80 },
  },
  {
    id: 'welcome',
    name: 'Welcome message',
    across: { x: 320, y: 180 },
    down: { x: 0, y: 160 },
  },
  {
    id: 'crm',
    name: 'Add to CRM',
    across: { x: 680, y: 90 },
    down: { x: 150, y: 240 },
  },
];

/**
 * Whether the canvas has room to lay the graph out across. It is the canvas
 * that is measured and not the window: in a page with a sidebar the two are
 * far apart.
 */
function useRoom(least: number) {
  const [wide, setWide] = useState(true);
  const watch = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= least));
      observer.observe(node);
      return () => observer.disconnect();
    },
    [least]
  );
  return [wide, watch] as const;
}

const START: FlowConnection[] = [{ source: 'form', target: 'verify' }];

export default function FlowWiring() {
  const [wires, setWires] = useState(START);
  const [wide, watch] = useRoom(720);
  // A wire leaves one face of a step and arrives at the opposite one.
  const out = wide ? 'right' : 'bottom';
  const into = wide ? 'left' : 'top';

  const joined = (a: FlowConnection, b: FlowConnection) =>
    a.source === b.source && a.target === b.target;

  return (
    <div ref={watch} className="relative h-[26rem] w-full">
      <Flow
        // Fitted afresh when the layout changes.
        key={wide ? 'across' : 'down'}
        fitViewOnMount
        fitViewPadding={wide ? 48 : 24}
        label="Sign-up automation"
        className="h-full rounded-none border-0"
        // Two nodes are joined once. A second wire between them is refused.
        isValidConnection={(connection) => !wires.some((wire) => joined(wire, connection))}
        onConnect={(connection) => setWires((current) => [...current, connection])}
      >
        <Flow.Background />
        {NODES.map((node) => (
          <Flow.Node
            key={node.id}
            id={node.id}
            position={wide ? node.across : node.down}
          >
            <Flow.NodeContent>
              <Flow.NodeTitle className="whitespace-nowrap">{node.name}</Flow.NodeTitle>
            </Flow.NodeContent>
            <Flow.Handle position={into} />
            <Flow.Handle position={out} />
          </Flow.Node>
        ))}
        {wires.map((wire) => (
          <Flow.Edge
            key={`${wire.source}-${wire.target}`}
            from={wire.source}
            to={wire.target}
            arrow
            fromSide={out}
            toSide={into}
          />
        ))}
        <Flow.Controls lock={false} />
      </Flow>

      <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-4.5rem)] items-center gap-3 rounded-xl border bg-card py-1.5 pe-1.5 ps-3 shadow-sm">
        <p className="text-sm text-muted-foreground">
          {wide ? 'Drag from a dot on one step to another step to join them. ' : null}
          {wires.length} joined.
        </p>
        <Button variant="outline" size="sm" onClick={() => setWires(START)}>
          Reset
        </Button>
      </div>
    </div>
  );
}
