'use client';

import { Button } from 'panelui-web/button';
import { Tooltip } from 'panelui-web/tooltip';
import { BellIcon, InboxIcon, SettingsIcon, UserRoundIcon } from 'lucide-react';

const ACTIONS = [
  { label: 'Inbox', icon: <InboxIcon /> },
  { label: 'Notifications', icon: <BellIcon /> },
  { label: 'Profile', icon: <UserRoundIcon /> },
  { label: 'Settings', icon: <SettingsIcon /> },
];

export default function TooltipOverview() {
  return (
    <Tooltip.Provider>
      <div className="flex items-center gap-1">
        {ACTIONS.map((action, index) => (
          <Tooltip key={action.label} defaultOpen={index === 1}>
            <Tooltip.Trigger render={<Button variant="ghost" size="icon" aria-label={action.label} />}>
              {action.icon}
            </Tooltip.Trigger>
            <Tooltip.Content>{action.label}</Tooltip.Content>
          </Tooltip>
        ))}
      </div>
    </Tooltip.Provider>
  );
}
