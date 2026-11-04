'use client';

import { BoxIcon, PaletteIcon, TerminalIcon } from 'lucide-react';
import { Command } from 'panelui-web/command';

export default function CommandThumb() {
  return (
    <div className="w-[26rem] shrink-0 scale-[0.7]">
      <Command variant="compact">
        <Command.Input placeholder="Search…" />
        <Command.List>
          <Command.Item icon={<BoxIcon />} kind="Component">
            Command
          </Command.Item>
          <Command.Item icon={<PaletteIcon />} kind="Guide">
            Theming
          </Command.Item>
          <Command.Item icon={<TerminalIcon />} shortcut={['⌘', 'I']}>
            Install
          </Command.Item>
        </Command.List>
      </Command>
    </div>
  );
}
