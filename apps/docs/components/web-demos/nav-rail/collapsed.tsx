'use client';

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

const stop = (event: { preventDefault(): void }) => event.preventDefault();

const ACTIVITY = [
  { label: 'Inbox', detail: '12 unread', icon: BellIcon },
  { label: 'Projects', detail: '4 in review', icon: FolderKanbanIcon },
  { label: 'People', detail: '8 collaborators', icon: UsersIcon },
];

export default function NavRailCollapsed() {
  return (
    <div className="flex h-[450px] w-full max-w-2xl items-stretch gap-2 rounded-2xl border border-border/70 bg-background p-2">
      <NavRail aria-label="Meridian" defaultCollapsed>
        <NavRail.Header>
          <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
          <NavRail.Trigger />
        </NavRail.Header>

        <NavRail.Group label="Workspace">
          <NavRail.Item href="#" icon={<LayoutDashboardIcon />} label="Overview" onClick={stop} />
          <NavRail.Item href="#" active icon={<InboxIcon />} label="Inbox" onClick={stop}>
            Inbox <NavRail.Badge>12</NavRail.Badge>
          </NavRail.Item>
          <NavRail.Item href="#" icon={<FolderKanbanIcon />} label="Projects" onClick={stop}>
            Projects <NavRail.Badge>4</NavRail.Badge>
          </NavRail.Item>
          <NavRail.Item href="#" icon={<UsersIcon />} label="People" onClick={stop} />
        </NavRail.Group>

        <NavRail.Group label="Account">
          <NavRail.Item href="#" icon={<CreditCardIcon />} label="Billing" onClick={stop} />
          <NavRail.Item href="#" icon={<SettingsIcon />} label="Settings" onClick={stop} />
        </NavRail.Group>

        <NavRail.Footer>
          <NavRail.Item href="#" icon={<LifeBuoyIcon />} label="Help and support" onClick={stop} />
        </NavRail.Footer>
      </NavRail>

      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-muted/30 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
              Folded rail
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Everything still one press away</h3>
          </div>
          <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
            56 px
          </span>
        </div>

        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          The labels are folded away, so each row keeps its accessible name and shows it in a flyout on hover or focus.
          Group headings become dividers, and the two counts become dots on the corner of their icons.
        </p>

        <div className="flex flex-col gap-2">
          {ACTIVITY.map(({ label, detail, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5 ring-1 ring-border/70"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
              <span className="ms-auto text-xs text-muted-foreground">{detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
