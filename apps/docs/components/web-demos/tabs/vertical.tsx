'use client';

import { BellIcon, CreditCardIcon, ShieldIcon, UserRoundIcon } from 'lucide-react';
import { Switch } from 'panelui-web/switch';
import { Input } from 'panelui-web/input';
import { Label } from 'panelui-web/label';
import { Tabs } from 'panelui-web/tabs';

export default function TabsVertical() {
  return (
    <Tabs variant="underline" orientation="vertical" defaultValue="profile" className="w-full max-w-xl gap-6">
      <Tabs.List aria-label="Settings">
        <Tabs.Trigger value="profile">
          <UserRoundIcon /> Profile
        </Tabs.Trigger>
        <Tabs.Trigger value="alerts">
          <BellIcon /> Notifications
        </Tabs.Trigger>
        <Tabs.Trigger value="security">
          <ShieldIcon /> Security
        </Tabs.Trigger>
        <Tabs.Trigger value="billing">
          <CreditCardIcon /> Billing
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="profile" className="flex flex-col gap-2">
        <Label htmlFor="tabs-name">Display name</Label>
        <Input id="tabs-name" defaultValue="Ines Duarte" />
      </Tabs.Content>
      <Tabs.Content value="alerts" className="flex flex-col gap-4">
        <Label>
          <Label.Text>Comments on my work</Label.Text>
          <Label.Action>
            <Switch defaultChecked />
          </Label.Action>
        </Label>
        <Label>
          <Label.Text>Weekly summary</Label.Text>
          <Label.Action>
            <Switch />
          </Label.Action>
        </Label>
      </Tabs.Content>
      <Tabs.Content value="security" className="flex flex-col gap-2">
        <Label htmlFor="tabs-password">
          <Label.Text>Password</Label.Text>
          <Label.Hint>Changed 3 months ago</Label.Hint>
        </Label>
        <Input id="tabs-password" type="password" defaultValue="hunter2hunter2" />
      </Tabs.Content>
      <Tabs.Content value="billing" className="text-sm text-muted-foreground">
        Team plan, renews 1 December.
      </Tabs.Content>
    </Tabs>
  );
}
