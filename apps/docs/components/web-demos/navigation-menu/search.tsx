'use client';

import { BoxIcon, FileTextIcon, HashIcon, SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const input = useRef<HTMLInputElement>(null);

  // The field takes focus once the panel is open, so typing goes straight into it.
  useEffect(() => {
    if (value !== 'search') return;
    const frame = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [value]);

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
      <NavigationMenu.Brand
        href="#"
        aria-label="Home"
        icon={<img src="https://avatars.githubusercontent.com/u/127331761?v=4" alt="" />}
      />
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#" active>
            Home
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Docs</NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Blocks</NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item value="search">
          <NavigationMenu.Trigger icon={<SearchIcon />} hideChevron>
            Search
          </NavigationMenu.Trigger>
          {/* As wide as the bar, so the bar only grows downwards. Kept mounted, so opening it does no work. */}
          <NavigationMenu.Content keepMounted>
            <Command variant="compact" label="Search the docs" bare>
              <Command.Input ref={input} placeholder="Search pages, parts, tokens" />
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
