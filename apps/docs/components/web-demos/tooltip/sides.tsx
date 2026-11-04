'use client';

import { Button } from 'panelui-web/button';
import { Tooltip } from 'panelui-web/tooltip';
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon } from 'lucide-react';

/** Each button points the way its tooltip opens, placed on that side of the cross. */
const SIDES = [
  { side: 'top', icon: <ArrowUpIcon />, cell: 'col-start-2 row-start-1' },
  { side: 'left', icon: <ArrowLeftIcon />, cell: 'col-start-1 row-start-2' },
  { side: 'right', icon: <ArrowRightIcon />, cell: 'col-start-3 row-start-2' },
  { side: 'bottom', icon: <ArrowDownIcon />, cell: 'col-start-2 row-start-3' },
] as const;

export default function TooltipSides() {
  return (
    <Tooltip.Provider>
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
        {SIDES.map(({ side, icon, cell }) => (
          // Held open, so all four placements can be compared at once.
          <Tooltip key={side} open>
            <Tooltip.Trigger
              render={<Button variant="outline" size="icon" aria-label={`Opens on the ${side}`} className={cell} />}
            >
              {icon}
            </Tooltip.Trigger>
            <Tooltip.Content variant="outline" side={side} className="capitalize">
              {side}
            </Tooltip.Content>
          </Tooltip>
        ))}
      </div>
    </Tooltip.Provider>
  );
}
