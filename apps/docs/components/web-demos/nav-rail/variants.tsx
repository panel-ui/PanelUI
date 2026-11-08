'use client';

import { useState } from 'react';
import { FolderKanbanIcon, InboxIcon, LayoutDashboardIcon, LayersIcon } from 'lucide-react';
import { NavRail, type NavRailVariant } from 'panelui-web/nav-rail';

const ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon, count: 12 },
  { id: 'projects', label: 'Projects', icon: FolderKanbanIcon },
];

function Example({ variant, title }: { variant: NavRailVariant; title: string }) {
  const [active, setActive] = useState('inbox');

  return (
    <div className="flex flex-col gap-2">
      <span className="px-1 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
        {title}
      </span>
      <div className="h-[260px]">
        <NavRail aria-label={`${title} navigation`} variant={variant} expandedWidth={208}>
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
        </NavRail>
      </div>
    </div>
  );
}

export default function NavRailVariants() {
  return (
    <div className="flex h-[340px] w-full items-start justify-center gap-6 rounded-2xl border border-border/70 bg-background p-5">
      <Example variant="tonal" title="Tonal" />
      <Example variant="solid" title="Solid" />
    </div>
  );
}
