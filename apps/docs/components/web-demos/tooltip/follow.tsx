'use client';

import { Tooltip } from 'panelui-web/tooltip';
import { useState, type PointerEvent } from 'react';

/** Visits to a shop's site in each hour of one day. */
const VISITS = [4, 3, 2, 2, 3, 6, 14, 28, 41, 46, 52, 58, 61, 57, 49, 44, 47, 55, 63, 59, 42, 27, 15, 8];
const PEAK = Math.max(...VISITS);

export default function TooltipFollow() {
  const [hour, setHour] = useState(12);

  function track(event: PointerEvent<HTMLElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const at = Math.floor(((event.clientX - box.left) / box.width) * VISITS.length);
    setHour(Math.min(VISITS.length - 1, Math.max(0, at)));
  }

  return (
    <Tooltip.Provider delay={0}>
      <Tooltip trackCursorAxis="x">
        <Tooltip.Trigger
          render={<div />}
          onPointerMove={track}
          aria-label="Visits by hour"
          className="flex h-32 w-full max-w-md items-end gap-1 px-2"
        >
          {VISITS.map((count, index) => (
            <span
              key={index}
              className={
                'flex-1 rounded-t-sm transition-colors duration-100 ' +
                (index === hour ? 'bg-chart-2' : 'bg-chart-2/30')
              }
              style={{ height: `${Math.max(4, (count / PEAK) * 100)}%` }}
            />
          ))}
        </Tooltip.Trigger>
        <Tooltip.Content variant="outline" arrow={false} className="tabular-nums">
          <Tooltip.Title>{String(hour).padStart(2, '0')}:00</Tooltip.Title>
          <Tooltip.Description>{VISITS[hour]} visits</Tooltip.Description>
        </Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  );
}
