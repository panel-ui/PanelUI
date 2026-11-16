'use client';

import { BoxIcon, FileTextIcon, HashIcon, SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Command } from 'panelui-web/command';
import { NavigationMenu } from 'panelui-web/navigation-menu';

const RESULTS = [
  { title: 'Navigation Menu', where: 'Components', icon: <BoxIcon /> },
  { title: 'Command', where: 'Components', icon: <BoxIcon /> },
  { title: 'Theming', where: 'Guides', icon: <FileTextIcon /> },
  { title: 'Upgrading to 1.x', where: 'Guides', icon: <FileTextIcon /> },
  { title: '--radius', where: 'Tokens', icon: <HashIcon /> },
];

export default function NavigationMenuSearch() {
  const [value, setValue] = useState<string | null>(null);

  // ⌘K or Ctrl+K grows the bar into the search, from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setValue((current) => (current === 'search' ? null : 'search'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <NavigationMenu aria-label="Main" value={value} onValueChange={setValue}>
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#" active>
            Home
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Docs</NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item value="search">
          <NavigationMenu.Trigger icon={<SearchIcon />} hideChevron>
            Search
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[26rem]">
            <Command variant="compact" label="Search the docs" bare>
              <Command.Input placeholder="Search pages, parts, tokens" autoFocus />
              <Command.List>
                {RESULTS.map((result) => (
                  <Command.Item key={result.title} icon={result.icon} subtitle={result.where}>
                    {result.title}
                  </Command.Item>
                ))}
                <Command.Empty>Nothing matches that</Command.Empty>
              </Command.List>
            </Command>
            <NavigationMenu.Footer>
              <NavigationMenu.Hint keys={['↑', '↓']}>Move</NavigationMenu.Hint>
              <NavigationMenu.Hint keys={['↵']}>Open</NavigationMenu.Hint>
              <NavigationMenu.Hint keys={['⌘', 'K']}>Close</NavigationMenu.Hint>
            </NavigationMenu.Footer>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu>
  );
}
