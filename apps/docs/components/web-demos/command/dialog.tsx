'use client';

import { BookOpenIcon, BoxIcon, EqualIcon, PaletteIcon, SearchIcon, SunMoonIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Command } from 'panelui-web/command';

export default function CommandDialogDemo() {
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <Command.Dialog
        // ⌘K is the docs site's own search, so this page uses ⌥K.
        hotkey="alt+k"
        trigger={
          <Button variant="outline" className="w-64 justify-start text-muted-foreground">
            <SearchIcon />
            Search the docs…
            <span className="ms-auto text-xs">⌥K</span>
          </Button>
        }
      >
        <Command>
          <Command.Input placeholder="Search the docs…" />
          <Command.List>
            <Command.Group heading="Pages">
              <Command.Item icon={<BookOpenIcon />} kind="Guide" onSelect={() => setLast('Installation')}>
                Installation
              </Command.Item>
              <Command.Item icon={<PaletteIcon />} kind="Guide" onSelect={() => setLast('Theming')}>
                Theming
              </Command.Item>
              <Command.Item icon={<BoxIcon />} kind="Component" onSelect={() => setLast('Command')}>
                Command
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Actions">
              <Command.Item icon={<SunMoonIcon />} kind="Command" onSelect={() => setLast('Switch theme')}>
                Switch theme
              </Command.Item>
            </Command.Group>
            <Command.Empty />
          </Command.List>
          <Command.Footer
            lead={
              <Command.FooterButton aria-label="Settings">
                <EqualIcon />
              </Command.FooterButton>
            }
          >
            <Command.FooterAction keys={['↵']}>Open</Command.FooterAction>
          </Command.Footer>
        </Command>
      </Command.Dialog>
      <p className="text-sm text-muted-foreground">{last ? `Opened “${last}”.` : 'Press ⌥K, or Alt+K, anywhere on the page.'}</p>
    </div>
  );
}
