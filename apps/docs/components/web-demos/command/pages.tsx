'use client';

import { ChevronRightIcon, MoonIcon, PaletteIcon, SunIcon, SunMoonIcon, TypeIcon } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Command } from 'panelui-web/command';

const THEMES = ['Panel', 'Moon', 'Grass'];

export default function CommandPages() {
  const [page, setPage] = useState<'root' | 'theme' | 'appearance'>('root');
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState('Panel · System');

  function open(next: typeof page) {
    setPage(next);
    setSearch('');
  }

  // Backspace in an empty field goes back a page.
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && search === '' && page !== 'root') {
      event.preventDefault();
      open('root');
    }
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-3">
      <Command variant="compact" search={search} onSearchChange={setSearch} className="w-full">
        <Command.Input
          placeholder={page === 'root' ? 'Search settings…' : 'Filter…'}
          prefix={page === 'theme' ? 'Theme' : page === 'appearance' ? 'Appearance' : undefined}
          onKeyDown={onKeyDown}
        />
        <Command.List className="h-52">
          {page === 'root' ? (
            <Command.Group heading="Settings">
              <Command.Item icon={<PaletteIcon />} closeOnSelect={false} kind={<ChevronRightIcon />} onSelect={() => open('theme')}>
                Change theme…
              </Command.Item>
              <Command.Item icon={<SunMoonIcon />} closeOnSelect={false} kind={<ChevronRightIcon />} onSelect={() => open('appearance')}>
                Change appearance…
              </Command.Item>
              <Command.Item icon={<TypeIcon />} subtitle="16px">
                Text size
              </Command.Item>
            </Command.Group>
          ) : null}
          {page === 'theme' ? (
            <Command.Group heading="Themes">
              {THEMES.map((theme) => (
                <Command.Item
                  key={theme}
                  icon={<PaletteIcon />}
                  onSelect={() => {
                    setChosen((current) => `${theme} · ${current.split(' · ')[1]}`);
                    open('root');
                  }}
                >
                  {theme}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
          {page === 'appearance' ? (
            <Command.Group heading="Appearance">
              {[
                { name: 'Light', icon: <SunIcon /> },
                { name: 'Dark', icon: <MoonIcon /> },
                { name: 'System', icon: <SunMoonIcon /> },
              ].map((option) => (
                <Command.Item
                  key={option.name}
                  icon={option.icon}
                  onSelect={() => {
                    setChosen((current) => `${current.split(' · ')[0]} · ${option.name}`);
                    open('root');
                  }}
                >
                  {option.name}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
          <Command.Empty />
        </Command.List>
        <Command.Footer lead={page === 'root' ? 'Settings' : 'Backspace to go back'} />
      </Command>
      <p className="text-sm text-muted-foreground">Now: {chosen}</p>
    </div>
  );
}
