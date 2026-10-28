'use client';

import { useEffect, useRef, useState } from 'react';
import { XYPad, type XYPadPoint } from 'panelui-web/xy-pad';

/** Held off centre, the map scrolls at that speed; let go and it stops. */
export default function XYPadJoystick() {
  const [speed, setSpeed] = useState<XYPadPoint>({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const live = useRef(speed);
  live.current = speed;

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const seconds = (now - last) / 1000;
      last = now;
      const { x, y } = live.current;
      if (x !== 0 || y !== 0) setOffset((at) => ({ x: at.x - x * 220 * seconds, y: at.y + y * 220 * seconds }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex items-center gap-4">
      <XYPad
        label="Pan"
        snapBack
        grid={6}
        aspect="1 / 1"
        color="warning"
        value={speed}
        onValueChange={setSpeed}
        className="w-44 shrink-0"
      />
      <div
        aria-hidden
        className="relative size-44 shrink-0 overflow-hidden rounded-2xl bg-card ring-1 ring-border"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          backgroundPosition: `${offset.x}px ${offset.y}px`,
        }}
      >
        <span
          className="absolute size-3 rounded-full bg-chart-2"
          style={{ left: `calc(30% + ${offset.x % 400}px)`, top: `calc(40% + ${offset.y % 400}px)` }}
        />
        <span
          className="absolute size-3 rounded-full bg-chart-4"
          style={{ left: `calc(70% + ${(offset.x * 1.0) % 400}px)`, top: `calc(65% + ${offset.y % 400}px)` }}
        />
        <span className="absolute inset-0 m-auto size-2 rounded-full ring-2 ring-foreground/60" />
      </div>
    </div>
  );
}
