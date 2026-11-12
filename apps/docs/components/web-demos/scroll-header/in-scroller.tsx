'use client';

import { useRef } from 'react';
import { ScrollArea } from 'panelui-web/scroll-area';
import { ScrollHeader } from 'panelui-web/scroll-header';

const ENTRIES = [
  {
    version: '0.14.0',
    date: '2 November',
    title: 'Charts, all of them',
    text: 'The nine remaining chart types arrived with the same axes, tooltips and empty states as the first four. Every one is a compound component, so a chart is assembled from the parts it needs.',
  },
  {
    version: '0.13.0',
    date: '19 October',
    title: 'The workbench',
    text: 'A canvas, a sidebar and an inspector in one shell, with the panels resizable and the whole thing keyboard reachable. It is the first component in the collection that holds other components as a workspace.',
  },
  {
    version: '0.12.0',
    date: '5 October',
    title: 'A quieter toast',
    text: 'Toasts can now be queued from outside React, which is what a fetch handler needs. The queue is one object, created once and passed to the provider, and it survives a route change.',
  },
  {
    version: '0.11.0',
    date: '21 September',
    title: 'Motion, measured',
    text: 'Every transition now uses the same curve and the same durations, and every one of them is turned off under reduced motion. The numbers live in one file rather than in each component.',
  },
  {
    version: '0.10.0',
    date: '7 September',
    title: 'The inspector',
    text: 'A rail of icons beside a page of sections. It reads a variant from a data attribute, so the panel renders on the server and the rail is the only part that needs a client boundary.',
  },
  {
    version: '0.9.0',
    date: '24 August',
    title: 'Tables that scroll',
    text: 'A table wider than its container scrolls sideways on its own, with the header row pinned above the body. Numbers line up on their last digit when a column is aligned to the end.',
  },
];

export default function ScrollHeaderInScroller() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <ScrollArea viewportRef={scroller} className="h-[420px] w-full max-w-xl rounded-2xl border bg-background">
      <ScrollHeader scrollRef={scroller} barHeight={48} threshold={0.5}>
        <ScrollHeader.Bar>
          <ScrollHeader.Title>Changelog</ScrollHeader.Title>
        </ScrollHeader.Bar>
        <ScrollHeader.Large>
          <ScrollHeader.Description>Everything shipped, newest first</ScrollHeader.Description>
          <ScrollHeader.Title>Changelog</ScrollHeader.Title>
        </ScrollHeader.Large>

        <ol className="divide-y px-6 pb-6">
          {ENTRIES.map((entry) => (
            <li key={entry.version} className="py-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs font-medium text-foreground">{entry.version}</span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <h2 className="mt-1.5 text-sm font-semibold text-foreground">{entry.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.text}</p>
            </li>
          ))}
        </ol>
      </ScrollHeader>
    </ScrollArea>
  );
}
