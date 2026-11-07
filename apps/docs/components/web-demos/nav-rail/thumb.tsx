'use client';

import { FolderKanbanIcon, InboxIcon, LayoutDashboardIcon, LayersIcon, UsersIcon } from 'lucide-react';
import { NavRail } from 'panelui-web/nav-rail';

const stop = (event: { preventDefault(): void }) => event.preventDefault();

export default function NavRailThumb() {
  return (
    <div className="flex h-52 w-full items-stretch gap-2 rounded-xl border border-border/70 bg-background p-1.5">
      <NavRail aria-label="Meridian" expandedWidth="9.75rem" collapsedWidth="3rem" className="rounded-lg">
        <NavRail.Header>
          <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
        </NavRail.Header>
        <NavRail.Group>
          <NavRail.Item href="#" active icon={<InboxIcon />} label="Inbox" onClick={stop}>
            Inbox <NavRail.Badge>8</NavRail.Badge>
          </NavRail.Item>
          <NavRail.Item href="#" icon={<LayoutDashboardIcon />} label="Overview" onClick={stop} />
          <NavRail.Item href="#" icon={<FolderKanbanIcon />} label="Projects" onClick={stop} />
          <NavRail.Item href="#" icon={<UsersIcon />} label="People" onClick={stop} />
        </NavRail.Group>
      </NavRail>
      <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg bg-muted/30 p-2.5">
        <span className="h-2 w-16 rounded-full bg-foreground/15" />
        <span className="h-1.5 w-full rounded-full bg-foreground/[0.07]" />
        <span className="h-1.5 w-4/5 rounded-full bg-foreground/[0.07]" />
        <div className="mt-auto grid grid-cols-2 gap-1.5">
          <span className="h-9 rounded-md bg-background ring-1 ring-border/70" />
          <span className="h-9 rounded-md bg-background ring-1 ring-border/70" />
        </div>
      </div>
    </div>
  );
}
