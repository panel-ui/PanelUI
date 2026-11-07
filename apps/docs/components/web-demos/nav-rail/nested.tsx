'use client';

import { useState } from 'react';
import {
  ArchiveIcon,
  CircleDotIcon,
  FolderKanbanIcon,
  LayersIcon,
  LayoutDashboardIcon,
  InboxIcon,
  UsersIcon,
} from 'lucide-react';
import { NavRail } from 'panelui-web/nav-rail';

const stop = (event: { preventDefault(): void }) => event.preventDefault();

const PAGES = [
  { id: 'active', label: 'Active projects', icon: CircleDotIcon },
  { id: 'archive', label: 'Archive', icon: ArchiveIcon },
  { id: 'clients', label: 'Client work', icon: UsersIcon },
];

export default function NavRailNested() {
  const [page, setPage] = useState('active');
  const [projectsOpen, setProjectsOpen] = useState(true);
  const current = PAGES.find((item) => item.id === page) ?? PAGES[0]!;

  return (
    <div className="flex h-[450px] w-full max-w-2xl items-stretch gap-2 rounded-2xl border border-border/70 bg-background p-2">
      <NavRail aria-label="Meridian">
        <NavRail.Header>
          <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
          <NavRail.Trigger />
        </NavRail.Header>

        <NavRail.Group label="Workspace">
          <NavRail.Item href="#" icon={<LayoutDashboardIcon />} label="Overview" onClick={stop} />
          <NavRail.Item href="#" icon={<InboxIcon />} label="Inbox" onClick={stop}>
            Inbox <NavRail.Badge>5</NavRail.Badge>
          </NavRail.Item>

          <NavRail.Item href="#" icon={<FolderKanbanIcon />} onClick={stop}>
            Projects
            <NavRail.Sub open={projectsOpen} onOpenChange={setProjectsOpen}>
              {PAGES.map((item) => {
                const Icon = item.icon;
                return (
                  <NavRail.Item
                    key={item.id}
                    href="#"
                    active={page === item.id}
                    icon={<Icon />}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(item.id);
                    }}
                  >
                    {item.label}
                  </NavRail.Item>
                );
              })}
            </NavRail.Sub>
          </NavRail.Item>

          <NavRail.Item href="#" icon={<UsersIcon />} label="People" onClick={stop} />
        </NavRail.Group>
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-muted/30 p-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">Nested</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{current.label}</h3>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Projects owns a child list. The parent is still a link to its own page, and the disclosure beside it opens the
          list. The active child carries <code className="rounded bg-background px-1 py-0.5 text-[12px] ring-1 ring-border">aria-current=&quot;page&quot;</code>{' '}
          and the one pill moves onto its row; the parent only takes the tint.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setProjectsOpen((value) => !value)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground outline-none transition-[background-color,scale] hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            {projectsOpen ? 'Close the sub-list' : 'Open the sub-list'}
          </button>
          <span className="rounded-lg bg-background px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground ring-1 ring-border">
            open: {String(projectsOpen)}
          </span>
        </div>

        <p className="mt-auto text-xs leading-5 text-muted-foreground">
          <code className="font-mono text-[11px]">open</code> and{' '}
          <code className="font-mono text-[11px]">onOpenChange</code> sit on the sub-list, not on the rail. Close the list
          and the pill stays on the parent, so the rail never loses the current place.
        </p>
      </div>
    </div>
  );
}
