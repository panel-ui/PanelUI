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

export default function NavRailOverview() {
  const [active, setActive] = useState('overview');
  const current = ITEMS.find((item) => item.id === active) ?? ITEMS[0]!;

  return (
    <div className="flex h-[380px] w-full max-w-2xl items-stretch gap-2 rounded-2xl border border-border/70 bg-background p-2">
      <NavRail aria-label="Meridian">
        <NavRail.Header>
          <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
          <NavRail.Trigger />
        </NavRail.Header>

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

        <NavRail.Footer>
          <NavRail.Separator className="mb-1" />
          <NavRail.Item href="#" icon={<LifeBuoyIcon />} label="Help and support">
            Help and support
          </NavRail.Item>
        </NavRail.Footer>
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-muted/30 p-5">
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
            <div className="mt-2 flex items-end gap-1">
              {[30, 46, 38, 62, 54, 74, 68].map((height, index) => (
                <span
                  key={index}
                  className="w-full rounded-sm bg-primary/25 last:bg-primary"
                  style={{ height: `${height / 4}px` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-background p-3 ring-1 ring-border/70">
            <p className="text-[11px] font-medium text-muted-foreground">Time saved</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              6.4<span className="ms-1 text-sm font-medium text-muted-foreground">h</span>
            </p>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Since the new flow shipped.</p>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-xl bg-background p-3 ring-1 ring-border/70">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
            ID
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Ines Duarte</p>
            <p className="truncate text-[11px] text-muted-foreground">ines@meridian.studio</p>
          </div>
          <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Owner
          </span>
        </div>
      </div>
    </div>
  );
}
