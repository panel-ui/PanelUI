'use client';

import { CircleUserRoundIcon, CreditCardIcon, Settings2Icon } from 'lucide-react';
import { useState } from 'react';
import { NavigationMenu } from 'panelui-web/navigation-menu';
import { Badge } from 'panelui-web/badge';

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
              <NavigationMenu.Profile description="mira@northwind.studio" status={<Badge variant="info">Team</Badge>}>
                Mira Okafor
              </NavigationMenu.Profile>
              <NavigationMenu.Card href="#" icon={<CircleUserRoundIcon />} eyebrow="Name, photo, email">
                Account
              </NavigationMenu.Card>
              <NavigationMenu.Card href="#" icon={<CreditCardIcon />} eyebrow="6 of 8 seats used">
                Billing
              </NavigationMenu.Card>
              <NavigationMenu.Separator />
              <NavigationMenu.Setting label="Theme">
                <NavigationMenu.Options
                  aria-label="Theme"
                  value={theme}
                  onValueChange={(next) => setTheme(String(next))}
                >
                  <NavigationMenu.Option value="system">System</NavigationMenu.Option>
                  <NavigationMenu.Option value="light">Light</NavigationMenu.Option>
                  <NavigationMenu.Option value="dark">Dark</NavigationMenu.Option>
                </NavigationMenu.Options>
              </NavigationMenu.Setting>
              <NavigationMenu.Setting label="Density">
                <NavigationMenu.Options
                  aria-label="Density"
                  value={density}
                  onValueChange={(next) => setDensity(String(next))}
                >
                  <NavigationMenu.Option value="comfortable">Roomy</NavigationMenu.Option>
                  <NavigationMenu.Option value="compact">Compact</NavigationMenu.Option>
                </NavigationMenu.Options>
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
