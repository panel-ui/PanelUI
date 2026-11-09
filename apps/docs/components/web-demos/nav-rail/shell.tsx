'use client';

import { useState } from 'react';
import {
  BellIcon,
  CreditCardIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LayersIcon,
  LifeBuoyIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react';
import { NavRail } from 'panelui-web/nav-rail';

const ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon, note: 'This week across the studio.' },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon, count: 12, note: 'Twelve conversations are waiting on you.' },
  { id: 'projects', label: 'Projects', icon: FolderKanbanIcon, count: 4, note: 'Four projects are in review this morning.' },
  { id: 'people', label: 'People', icon: UsersIcon, note: 'Eight collaborators, two invitations out.' },
  { id: 'billing', label: 'Billing', icon: CreditCardIcon, note: 'The studio plan renews on 1 December.' },
];

export default function NavRailShell() {
  const [active, setActive] = useState('overview');
  const current = ITEMS.find((item) => item.id === active) ?? ITEMS[0]!;

  return (
    <NavRail.Provider defaultCollapsed={false} shortcutKey="b" className="h-[620px] min-h-0">
      <div className="flex h-full w-full gap-2 rounded-2xl border border-border/70 bg-background p-2">
        <NavRail aria-label="Meridian">
          <NavRail.Header>
            <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
            <NavRail.Trigger />
          </NavRail.Header>

          <NavRail.Content>
            <NavRail.Group label="Workspace">
              {ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavRail.Item
                    key={item.id}
                    href="#"
                    active={active === item.id}
                    icon={<Icon />}
                    onClick={(event) => {
                      event.preventDefault();
                      setActive(item.id);
                    }}
                  >
                    {item.label}
                    {item.count ? <NavRail.Badge>{item.count}</NavRail.Badge> : null}
                  </NavRail.Item>
                );
              })}
            </NavRail.Group>

            <NavRail.Group label="Studio">
              <NavRail.Item href="#" icon={<SettingsIcon />} onClick={(event) => event.preventDefault()}>
                Settings
              </NavRail.Item>
            </NavRail.Group>
          </NavRail.Content>

          <NavRail.Footer>
            <NavRail.Separator className="mb-1" />
            <NavRail.Item href="#" icon={<LifeBuoyIcon />} label="Help and support">
              Help and support
            </NavRail.Item>
          </NavRail.Footer>

          <NavRail.Rail />
        </NavRail>

        <NavRail.Inset className="bg-muted/30">
          <header className="flex shrink-0 items-center gap-2 border-b border-border/70 px-4 py-3">
            <NavRail.Trigger />
            <p className="text-sm font-medium">Meridian</p>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                  Thursday, 6 November
                </p>
                <h3 className="mt-1 truncate text-xl font-semibold tracking-[-0.02em]">{current.label}</h3>
              </div>
              <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                <BellIcon className="size-4" aria-hidden="true" />
                <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
              </span>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">{current.note}</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-background p-3 ring-1 ring-border/70">
                <p className="text-[11px] font-medium text-muted-foreground">Open reviews</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">07</p>
              </div>
              <div className="rounded-xl bg-background p-3 ring-1 ring-border/70">
                <p className="text-[11px] font-medium text-muted-foreground">Time saved</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  6.4<span className="ms-1 text-sm font-medium text-muted-foreground">h</span>
                </p>
              </div>
            </div>
          </div>
        </NavRail.Inset>
      </div>
    </NavRail.Provider>
  );
}
