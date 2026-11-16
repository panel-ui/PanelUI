'use client';

import { CheckIcon, CoinsIcon, ShareIcon, TerminalIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from 'panelui-web/badge';
import { NavigationMenu } from 'panelui-web/navigation-menu';

const COMMAND = 'npx panelui-cli init';

export default function NavigationMenuOverview() {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('system');
  const [motion, setMotion] = useState('full');

  const copy = () => {
    void navigator.clipboard?.writeText(COMMAND);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenu.Brand
        href="#"
        aria-label="Home"
        icon={<img src="https://avatars.githubusercontent.com/u/127331761?v=4" alt="" />}
      />
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#" active>
            Docs
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Components</NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Blocks</NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item value="more">
          <NavigationMenu.Trigger>v0.18</NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[25rem]">
            <NavigationMenu.Profile
              description="Maintainer · PanelUI"
              status={
                <Badge variant="success" dot>
                  Taking contributions
                </Badge>
              }
            >
              Khalid Abdi
            </NavigationMenu.Profile>
            <NavigationMenu.Card href="#" icon={<TerminalIcon />} tone="success" eyebrow="Start here">
              Install PanelUI
            </NavigationMenu.Card>
            <NavigationMenu.Card href="#" icon={<CoinsIcon />} tone="info" eyebrow="New in 0.18">
              Currency Input
            </NavigationMenu.Card>
            <NavigationMenu.Value
              actions={
                <>
                  <NavigationMenu.Pill onClick={copy} icon={copied ? <CheckIcon /> : undefined}>
                    {copied ? 'Copied' : 'Copy'}
                  </NavigationMenu.Pill>
                  <NavigationMenu.Pill icon={<ShareIcon />} aria-label="Share" />
                </>
              }
            >
              <code className="font-mono text-sm">{COMMAND}</code>
            </NavigationMenu.Value>
            <NavigationMenu.Pills>
              <NavigationMenu.Pill href="https://github.com/panel-ui/PanelUI" external>
                GitHub
              </NavigationMenu.Pill>
              <NavigationMenu.Pill href="https://www.npmjs.com/package/panelui-web" external>
                npm
              </NavigationMenu.Pill>
              <NavigationMenu.Pill href="#" external>
                Changelog
              </NavigationMenu.Pill>
            </NavigationMenu.Pills>
            <NavigationMenu.Separator />
            <NavigationMenu.Setting label="Theme">
              <NavigationMenu.Options aria-label="Theme" value={theme} onValueChange={(next) => setTheme(String(next))}>
                <NavigationMenu.Option value="system">System</NavigationMenu.Option>
                <NavigationMenu.Option value="light">Light</NavigationMenu.Option>
                <NavigationMenu.Option value="dark">Dark</NavigationMenu.Option>
              </NavigationMenu.Options>
            </NavigationMenu.Setting>
            <NavigationMenu.Setting label="Motion">
              <NavigationMenu.Options
                aria-label="Motion"
                value={motion}
                onValueChange={(next) => setMotion(String(next))}
              >
                <NavigationMenu.Option value="full">Full</NavigationMenu.Option>
                <NavigationMenu.Option value="reduced">Reduced</NavigationMenu.Option>
              </NavigationMenu.Options>
            </NavigationMenu.Setting>
            <NavigationMenu.Footer>
              <NavigationMenu.Hint keys={['↑', '↓']}>Move</NavigationMenu.Hint>
              <NavigationMenu.Hint keys={['↵']}>Open</NavigationMenu.Hint>
              <NavigationMenu.Hint keys={['Esc']}>Close</NavigationMenu.Hint>
            </NavigationMenu.Footer>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu>
  );
}
