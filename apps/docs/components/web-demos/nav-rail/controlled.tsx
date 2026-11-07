'use client';

import { useState } from 'react';
import {
  FolderKanbanIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LayersIcon,
  LifeBuoyIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react';
import { NavRail } from 'panelui-web/nav-rail';

const PAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon, count: 0 },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon, count: 8 },
  { id: 'projects', label: 'Projects', icon: FolderKanbanIcon, count: 0 },
  { id: 'people', label: 'People', icon: UsersIcon, count: 0 },
];

export default function NavRailControlled() {
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState('inbox');

  return (
    <div className="flex h-[400px] w-full max-w-2xl items-stretch gap-2 rounded-2xl border border-border/70 bg-background p-2">
      <NavRail aria-label="Meridian" collapsed={collapsed} onCollapsedChange={setCollapsed}>
        <NavRail.Header>
          <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
          <NavRail.Trigger />
        </NavRail.Header>

        <NavRail.Group label="Workspace">
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
                {item.count ? <NavRail.Badge>{item.count}</NavRail.Badge> : null}
              </NavRail.Item>
            );
          })}
        </NavRail.Group>

        <NavRail.Footer>
          <NavRail.Item href="#" icon={<SettingsIcon />} label="Settings" onClick={(event) => event.preventDefault()} />
          <NavRail.Item
            href="#"
            icon={<LifeBuoyIcon />}
            label="Help and support"
            onClick={(event) => event.preventDefault()}
          />
        </NavRail.Footer>
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-muted/30 p-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">Controlled</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em]">The app holds the state</h3>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Pass <code className="rounded bg-background px-1 py-0.5 text-[12px] ring-1 ring-border">collapsed</code> and{' '}
          <code className="rounded bg-background px-1 py-0.5 text-[12px] ring-1 ring-border">onCollapsedChange</code>{' '}
          to decide the fold yourself, from a media query or a stored preference. The trigger inside the rail reports
          through the same pair.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground outline-none transition-[background-color,scale] hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            {collapsed ? 'Open the rail' : 'Fold the rail'}
          </button>
          <span className="rounded-lg bg-background px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground ring-1 ring-border">
            collapsed: {String(collapsed)}
          </span>
        </div>

        <div className="mt-auto rounded-xl bg-background p-4 ring-1 ring-border/70">
          <p className="text-[11px] font-medium text-muted-foreground">Also controlled</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PAGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={`inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  page === item.id
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The active row and the buttons here read the same <code className="font-mono text-[11px]">page</code> state.
          </p>
        </div>
      </div>
    </div>
  );
}
