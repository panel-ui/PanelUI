'use client';

import { Button } from 'panelui-web/button';
import { Tooltip } from 'panelui-web/tooltip';

export default function TooltipThumb() {
  return (
    <Tooltip.Provider>
      <Tooltip defaultOpen>
        <Tooltip.Trigger render={<Button variant="outline" />}>Share</Tooltip.Trigger>
        <Tooltip.Content variant="shortcut" side="bottom">
          Copy link
          <Tooltip.Shortcut keys={['⌘', 'L']} />
        </Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  );
}
