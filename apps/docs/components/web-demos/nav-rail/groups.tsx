'use client';

import {
  ChartNoAxesColumnIcon,
  CreditCardIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LayersIcon,
  SettingsIcon,
} from 'lucide-react';
import { NavRail } from 'panelui-web/nav-rail';

const stop = (event: { preventDefault(): void }) => event.preventDefault();

const REPORTS = [
  { name: 'Weekly studio pulse', owner: 'Ines', change: '+12%' },
  { name: 'Review turnaround', owner: 'Ravi', change: '−3%' },
  { name: 'Client margin', owner: 'Marta', change: '+6%' },
];

export default function NavRailGroups() {
  return (
    <div className="flex h-[420px] w-full max-w-2xl items-stretch gap-2 rounded-2xl border border-border/70 bg-background p-2">
      <NavRail aria-label="Meridian">
        <NavRail.Header>
          <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
          <NavRail.Trigger />
        </NavRail.Header>

        <NavRail.Group label="Workspace">
          <NavRail.Item href="#" icon={<LayoutDashboardIcon />} label="Overview" onClick={stop} />
          <NavRail.Item href="#" icon={<InboxIcon />} label="Inbox" onClick={stop}>
            Inbox <NavRail.Badge>3</NavRail.Badge>
          </NavRail.Item>
          <NavRail.Item href="#" icon={<FolderKanbanIcon />} label="Projects" onClick={stop} />
        </NavRail.Group>

        <NavRail.Group label="Insights">
          <NavRail.Item href="#" active icon={<ChartNoAxesColumnIcon />} label="Reports" onClick={stop} />
        </NavRail.Group>

        <NavRail.Separator className="my-1" />

        <NavRail.Footer>
          <NavRail.Item href="#" icon={<SettingsIcon />} label="Settings" onClick={stop} />
          <NavRail.Item href="#" icon={<CreditCardIcon />} label="Billing" onClick={stop} />
        </NavRail.Footer>
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-muted/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">Insights</p>
            <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Reports</h3>
          </div>
          <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
            Last 7 days
          </span>
        </div>

        <div className="rounded-xl bg-background p-4 ring-1 ring-border/70">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium">Studio pulse</p>
            <p className="text-xs font-medium text-[var(--success)]">+18% week on week</p>
          </div>
          <div className="mt-4 flex h-16 items-end gap-1.5">
            {[34, 48, 40, 56, 50, 68, 62, 74, 60, 84, 78, 92].map((height, index) => (
              <span
                key={index}
                className="w-full rounded-t-[3px] bg-primary/25 last:bg-primary"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {REPORTS.map((report) => (
            <div
              key={report.name}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-background"
            >
              <span className="size-1.5 rounded-full bg-primary/60" />
              <span className="min-w-0 flex-1 truncate text-sm">{report.name}</span>
              <span className="text-xs text-muted-foreground">{report.owner}</span>
              <span className="w-12 text-end text-xs font-medium tabular-nums">{report.change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
