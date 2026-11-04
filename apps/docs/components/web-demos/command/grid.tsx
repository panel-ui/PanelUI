'use client';

import {
  BellIcon,
  CalendarIcon,
  ChartPieIcon,
  CloudSunIcon,
  ContactRoundIcon,
  FileTextIcon,
  ImageIcon,
  KanbanIcon,
  MapIcon,
  MessageCircleIcon,
  MusicIcon,
  WalletIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Command } from 'panelui-web/command';

function Tile({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`flex size-full items-center justify-center ${tone === 'bg-foreground' ? 'text-background' : 'text-white'} [&_svg]:size-[18px] ${tone}`}>{children}</span>;
}

const APPS = [
  { name: 'Calendar', icon: <CalendarIcon />, tone: 'bg-destructive' },
  { name: 'Messages', icon: <MessageCircleIcon />, tone: 'bg-success' },
  { name: 'Photos', icon: <ImageIcon />, tone: 'bg-warning' },
  { name: 'Maps', icon: <MapIcon />, tone: 'bg-info' },
  { name: 'Music', icon: <MusicIcon />, tone: 'bg-destructive' },
  { name: 'Weather', icon: <CloudSunIcon />, tone: 'bg-info' },
  { name: 'Notes', icon: <FileTextIcon />, tone: 'bg-warning' },
  { name: 'Contacts', icon: <ContactRoundIcon />, tone: 'bg-foreground' },
  { name: 'Wallet', icon: <WalletIcon />, tone: 'bg-foreground' },
  { name: 'Reminders', icon: <BellIcon />, tone: 'bg-success' },
];

const WIDGETS = [
  { name: 'Budget', icon: <ChartPieIcon />, tone: 'bg-success' },
  { name: 'Sprint board', icon: <KanbanIcon />, tone: 'bg-info' },
  { name: 'Forecast', icon: <CloudSunIcon />, tone: 'bg-warning' },
];

export default function CommandGrid() {
  return (
    <Command variant="grid" columns={5} className="max-w-xl">
      <Command.Input placeholder="Open an app or a widget…" />
      <Command.List className="max-h-80">
        <Command.Group heading="Apps">
          {APPS.map((app) => (
            <Command.Item key={app.name} icon={<Tile tone={app.tone}>{app.icon}</Tile>}>
              {app.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Widgets">
          {WIDGETS.map((widget) => (
            <Command.Item key={widget.name} icon={<Tile tone={widget.tone}>{widget.icon}</Tile>}>
              {widget.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Empty />
      </Command.List>
    </Command>
  );
}
