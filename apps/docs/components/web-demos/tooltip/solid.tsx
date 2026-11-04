'use client';

import { Button } from 'panelui-web/button';
import { Tooltip } from 'panelui-web/tooltip';
import { BoldIcon, CodeIcon, ItalicIcon, LinkIcon, StrikethroughIcon } from 'lucide-react';

const FORMATS = [
  { label: 'Bold', icon: <BoldIcon /> },
  { label: 'Italic', icon: <ItalicIcon /> },
  { label: 'Strikethrough', icon: <StrikethroughIcon /> },
  { label: 'Inline code', icon: <CodeIcon /> },
  { label: 'Link', icon: <LinkIcon /> },
];

export default function TooltipSolid() {
  return (
    <Tooltip.Provider>
      <div className="flex items-center gap-0.5">
        {FORMATS.map((format) => (
          <Tooltip key={format.label}>
            <Tooltip.Trigger render={<Button variant="ghost" size="icon-sm" aria-label={format.label} />}>
              {format.icon}
            </Tooltip.Trigger>
            <Tooltip.Content>{format.label}</Tooltip.Content>
          </Tooltip>
        ))}
      </div>
    </Tooltip.Provider>
  );
}
