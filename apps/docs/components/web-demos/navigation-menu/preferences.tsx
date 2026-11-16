'use client';

import { CircleUserRoundIcon, CreditCardIcon, Settings2Icon } from 'lucide-react';
import { useState } from 'react';
import { NavigationMenu } from 'panelui-web/navigation-menu';
import { Tabs } from 'panelui-web/tabs';

export default function NavigationMenuPreferences() {
  const [theme, setTheme] = useState('system');
  const [density, setDensity] = useState('comfortable');

  return (
    <div className="flex flex-col items-center gap-4">
      <NavigationMenu aria-label="Main">
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="#" active>
              Overview
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="#">Reports</NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item value="you">
            <NavigationMenu.Trigger icon={<Settings2Icon />}>You</NavigationMenu.Trigger>
            <NavigationMenu.Content className="w-[22rem]">
              <NavigationMenu.Card href="#" icon={<CircleUserRoundIcon />} eyebrow="Signed in as">
                Mira Okafor
              </NavigationMenu.Card>
              <NavigationMenu.Card href="#" icon={<CreditCardIcon />} tone="primary" eyebrow="Team plan · 6 seats">
                Billing
              </NavigationMenu.Card>
              <NavigationMenu.Separator />
              <NavigationMenu.Setting label="Theme">
                <Tabs value={theme} onValueChange={(next) => setTheme(String(next))}>
                  <Tabs.List aria-label="Theme">
                    <Tabs.Trigger value="system">System</Tabs.Trigger>
                    <Tabs.Trigger value="light">Light</Tabs.Trigger>
                    <Tabs.Trigger value="dark">Dark</Tabs.Trigger>
                  </Tabs.List>
                </Tabs>
              </NavigationMenu.Setting>
              <NavigationMenu.Setting label="Density">
                <Tabs value={density} onValueChange={(next) => setDensity(String(next))}>
                  <Tabs.List aria-label="Density">
                    <Tabs.Trigger value="comfortable">Roomy</Tabs.Trigger>
                    <Tabs.Trigger value="compact">Compact</Tabs.Trigger>
                  </Tabs.List>
                </Tabs>
              </NavigationMenu.Setting>
              <NavigationMenu.Footer>
                <NavigationMenu.Hint keys={['Esc']}>Close</NavigationMenu.Hint>
              </NavigationMenu.Footer>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu>
      <p className="text-xs text-muted-foreground">
        Theme: {theme} · Density: {density}
      </p>
    </div>
  );
}
