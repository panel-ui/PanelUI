'use client';

import { ScrollArea } from 'panelui-web/scroll-area';

const MEMBERS = [
  ['Amara Okafor', 'Owner'],
  ['Jonas Weber', 'Admin'],
  ['Priya Raman', 'Editor'],
  ['Tomás Silva', 'Editor'],
  ['Hana Sato', 'Viewer'],
  ['Leila Haddad', 'Editor'],
  ['Owen Price', 'Viewer'],
  ['Mei Lin', 'Admin'],
  ['Sven Larsen', 'Viewer'],
];

export default function ScrollAreaGutter() {
  return (
    <ScrollArea gutter className="h-64 w-full max-w-sm rounded-2xl border bg-background">
      <ul className="flex flex-col py-1.5">
        {MEMBERS.map(([name, role]) => (
          <li key={name} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>{name}</span>
            <span className="text-xs text-muted-foreground">{role}</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
