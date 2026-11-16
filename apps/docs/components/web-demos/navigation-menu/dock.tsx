'use client';

import {
  CalendarIcon,
  FolderIcon,
  HouseIcon,
  InboxIcon,
  LayoutGridIcon,
  MusicIcon,
  NotebookPenIcon,
  TimerIcon,
} from 'lucide-react';
import { NavigationMenu } from 'panelui-web/navigation-menu';

export default function NavigationMenuDock() {
  return (
    // A stage tall enough for the panel to open upwards above the dock.
    <div className="flex min-h-[26rem] w-full items-end justify-center">
      <NavigationMenu variant="dock" aria-label="Apps">
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="#" icon={<HouseIcon />} active>
              Home
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="#" icon={<InboxIcon />}>
              Inbox
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="#" icon={<CalendarIcon />}>
              Calendar
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="#" icon={<FolderIcon />}>
              Files
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item value="apps">
            <NavigationMenu.Trigger icon={<LayoutGridIcon />}>More apps</NavigationMenu.Trigger>
            <NavigationMenu.Content className="w-[20rem]">
              <NavigationMenu.Card href="#" icon={<NotebookPenIcon />} tone="warning" eyebrow="Edited 2 min ago">
                Notes
              </NavigationMenu.Card>
              <NavigationMenu.Card href="#" icon={<TimerIcon />} tone="info" eyebrow="25:00 focus">
                Timer
              </NavigationMenu.Card>
              <NavigationMenu.Card href="#" icon={<MusicIcon />} tone="destructive" eyebrow="Paused">
                Music
              </NavigationMenu.Card>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu>
    </div>
  );
}
