'use client';

import {
  ArchiveIcon,
  ChartNoAxesColumnIcon,
  CircleDotIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  UsersIcon,
} from 'lucide-react';
import { NavRail } from 'panelui-web/nav-rail';

const stop = (event: { preventDefault(): void }) => event.preventDefault();

export default function NavRailNestedFolded() {
  return (
    <div className="flex h-[450px] w-full max-w-2xl items-stretch gap-2 rounded-2xl border border-border/70 bg-background p-2">
      <NavRail aria-label="Meridian" defaultCollapsed>
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
            {/* Open by default, so the flyout is on screen for the demo; the
                same list appears on hover or focus without this. */}
            <NavRail.Sub defaultOpen>
              <NavRail.Item href="#" active icon={<CircleDotIcon />} onClick={stop}>
                Active projects
              </NavRail.Item>
              <NavRail.Item href="#" icon={<ArchiveIcon />} onClick={stop}>
                Archive
              </NavRail.Item>
              <NavRail.Item href="#" icon={<UsersIcon />} onClick={stop}>
                Client work
              </NavRail.Item>
            </NavRail.Sub>
          </NavRail.Item>

          <NavRail.Item href="#" icon={<ChartNoAxesColumnIcon />} onClick={stop}>
            Reports
            <NavRail.Sub>
              <NavRail.Item href="#" icon={<ChartNoAxesColumnIcon />} onClick={stop}>
                Weekly pulse
              </NavRail.Item>
              <NavRail.Item href="#" icon={<ArchiveIcon />} onClick={stop}>
                Saved reports
              </NavRail.Item>
            </NavRail.Sub>
          </NavRail.Item>
        </NavRail.Group>

        <NavRail.Footer>
          <NavRail.Item href="#" icon={<LifeBuoyIcon />} label="Help and support" onClick={stop} />
        </NavRail.Footer>
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-muted/30 p-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">Nested, folded</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Children beside the rail</h3>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Folded, the same child list becomes a flyout beside the rail. Hover or focus Projects to open it, and Tab into
          the links while it is open. The flyout is not clipped by the rail, and the open child keeps its label and its
          active weight even though the rail is a column of icons.
        </p>

        <div className="mt-auto rounded-xl bg-background p-4 ring-1 ring-border/70">
          <p className="text-[11px] font-medium text-muted-foreground">From the keyboard</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs leading-5 text-muted-foreground">
            <li>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-border">→</kbd> opens the
              list on the parent row, then steps into it
            </li>
            <li>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-border">←</kbd> or{' '}
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-border">Esc</kbd> closes
              it and puts focus back on the parent
            </li>
            <li>A press anywhere outside closes a flyout that was pinned open</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
