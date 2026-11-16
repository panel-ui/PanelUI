'use client';

import { CoinsIcon, RocketIcon, SparklesIcon } from 'lucide-react';
import { NavigationMenu } from 'panelui-web/navigation-menu';

const stop = (event: { preventDefault(): void }) => event.preventDefault();

// Held open, so the gallery shows the bar grown into its panel.
export default function NavigationMenuThumb() {
  return (
    <div className="flex h-52 w-full justify-center pt-1">
      <NavigationMenu aria-label="Thumbnail" value="explore">
        <NavigationMenu.Brand icon={<SparklesIcon />} />
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="#" active onClick={stop}>
              Docs
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item value="explore">
            <NavigationMenu.Trigger>Explore</NavigationMenu.Trigger>
            <NavigationMenu.Content className="w-60">
              <NavigationMenu.Card href="#" icon={<RocketIcon />} tone="primary" eyebrow="Start here" onClick={stop}>
                Install
              </NavigationMenu.Card>
              <NavigationMenu.Card href="#" icon={<CoinsIcon />} tone="success" eyebrow="New" onClick={stop}>
                Currency Input
              </NavigationMenu.Card>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu>
    </div>
  );
}
