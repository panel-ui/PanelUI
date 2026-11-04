'use client';

import { Button } from 'panelui-web/button';
import { Tooltip } from 'panelui-web/tooltip';
import { ArchiveIcon, WandSparklesIcon } from 'lucide-react';

export default function TooltipRich() {
  return (
    <Tooltip.Provider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <Tooltip.Trigger render={<Button variant="outline" />}>
            <WandSparklesIcon />
            Tidy up
          </Tooltip.Trigger>
          <Tooltip.Content variant="rich">
            <Tooltip.Title>Tidy up the board</Tooltip.Title>
            <Tooltip.Description>
              Cards with no activity for 30 days move to Archive. Nothing is deleted, and you can move them back.
            </Tooltip.Description>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger render={<Button variant="ghost" size="icon" aria-label="Archive" />}>
            <ArchiveIcon />
          </Tooltip.Trigger>
          <Tooltip.Content variant="rich" side="bottom">
            <Tooltip.Title>Archive · 42 cards</Tooltip.Title>
            <Tooltip.Description>Last tidied on Monday by Lina.</Tooltip.Description>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </Tooltip.Provider>
  );
}
