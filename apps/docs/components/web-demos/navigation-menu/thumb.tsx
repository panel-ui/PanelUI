'use client';

import { CoinsIcon, TerminalIcon } from 'lucide-react';
import { NavigationMenu } from 'panelui-web/navigation-menu';

const stop = (event: { preventDefault(): void }) => event.preventDefault();

// Held open, so the gallery shows the bar grown into its panel.
export default function NavigationMenuThumb() {
  return (
    <div className="flex h-52 w-full justify-center pt-1">
      <NavigationMenu aria-label="Thumbnail" value="explore">
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="#" active onClick={stop}>
              Docs
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item value="explore">
            <NavigationMenu.Trigger>v0.18</NavigationMenu.Trigger>
            <NavigationMenu.Content className="w-64">
              <NavigationMenu.Card href="#" icon={<TerminalIcon />} tone="success" eyebrow="Start here" onClick={stop}>
                Install
              </NavigationMenu.Card>
              <NavigationMenu.Card href="#" icon={<CoinsIcon />} tone="info" eyebrow="New" onClick={stop}>
                Currency Input
              </NavigationMenu.Card>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu>
    </div>
  );
}
