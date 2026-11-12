'use client';

import { ScrollArea } from 'panelui-web/scroll-area';

const RELEASES = [
  { version: '2.4.0', date: '12 Nov', note: 'Exports can be scheduled for the first of each month.' },
  { version: '2.3.2', date: '4 Nov', note: 'A shared link no longer drops its filters when it is opened on a phone.' },
  { version: '2.3.1', date: '29 Oct', note: 'CSV imports keep leading zeros in postcodes and account numbers.' },
  { version: '2.3.0', date: '21 Oct', note: 'Dashboards can be duplicated with or without their saved views.' },
  { version: '2.2.4', date: '9 Oct', note: 'The date picker opens on the month that is already selected.' },
  { version: '2.2.3', date: '30 Sep', note: 'Search matches an invoice number typed with or without its prefix.' },
  { version: '2.2.2', date: '18 Sep', note: 'Two people editing one report no longer overwrite each other’s notes.' },
  { version: '2.2.0', date: '2 Sep', note: 'Workspaces can require two-step sign-in for every member.' },
  { version: '2.1.1', date: '20 Aug', note: 'Large tables scroll without the header row jumping.' },
];

export default function ScrollAreaOverview() {
  return (
    <ScrollArea className="h-80 w-full max-w-sm rounded-2xl border bg-background">
      <ol className="flex flex-col divide-y">
        {RELEASES.map((release) => (
          <li key={release.version} className="flex flex-col gap-1 px-5 py-4">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium tabular-nums">{release.version}</span>
              <span className="text-xs text-muted-foreground">{release.date}</span>
            </div>
            <p className="text-sm text-muted-foreground">{release.note}</p>
          </li>
        ))}
      </ol>
    </ScrollArea>
  );
}
