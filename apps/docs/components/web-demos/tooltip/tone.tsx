'use client';

import { Button } from 'panelui-web/button';
import { Tooltip } from 'panelui-web/tooltip';
import { CloudCheckIcon, RocketIcon, Trash2Icon } from 'lucide-react';

export default function TooltipTone() {
  return (
    <Tooltip.Provider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <Tooltip.Trigger render={<Button variant="ghost" size="icon" aria-label="Backed up" />}>
            <CloudCheckIcon />
          </Tooltip.Trigger>
          <Tooltip.Content variant="tone" tone="success">
            Backed up 2 minutes ago
          </Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger render={<Button variant="outline" />}>
            <RocketIcon />
            Deploy
          </Tooltip.Trigger>
          <Tooltip.Content variant="tone" tone="warning">
            2 checks are still running
          </Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger render={<Button variant="ghost" size="icon" aria-label="Delete folder" />}>
            <Trash2Icon />
          </Tooltip.Trigger>
          <Tooltip.Content variant="tone" tone="destructive">
            Deletes 14 files for everyone
          </Tooltip.Content>
        </Tooltip>
      </div>
    </Tooltip.Provider>
  );
}
