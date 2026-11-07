'use client';

import { useRef } from 'react';
import { ScrollHeader } from 'panelui-web/scroll-header';
import { Tabs } from 'panelui-web/tabs';

const SECTIONS = [
  {
    value: 'desktop',
    label: 'Desktop',
    notes: [
      'The Mac build now restores the window you had open last, including the scroll position of each tab. Opening a file from the recent list puts it back in the window it came from rather than a new one.',
      'Menus have moved to the system menu bar. The in-window menu strip stays available while a full-screen window has no menu bar to show, and both read the same command list.',
      'A long rebuild no longer blocks the window. Progress appears in the title bar and the app can be quit from the menu while it runs, with the build resumed on the next launch.',
    ],
  },
  {
    value: 'mobile',
    label: 'Mobile',
    notes: [
      'The phone build has a new reader view, reached from the page menu. It keeps the text, the images and the captions, and drops the navigation around them.',
      'Downloading a file now waits for a network that is not metered by default. A switch in settings lets a download start on any connection, and the list shows which items are waiting for wifi.',
      'The home screen widget can show one project or a shared list. It refreshes when the app is opened and once an hour in the background.',
    ],
  },
  {
    value: 'api',
    label: 'API',
    notes: [
      'The sync endpoint accepts partial documents. A client can now send only the fields that changed, and the server merges them into the stored revision instead of replacing the whole document.',
      'Rate limits are per token rather than per account. A token that is shared by a build machine no longer uses the allowance of the person who created it.',
      'Webhooks carry a signature header. Verify it against the secret shown when the webhook was created; the old unsigned delivery is still sent for one more release.',
    ],
  },
];

export default function ScrollHeaderWithTabs() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scroller}
      className="h-[460px] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background text-sm"
    >
      <ScrollHeader scrollRef={scroller}>
        <ScrollHeader.Bar surface="plain">
          <ScrollHeader.Title>Release notes</ScrollHeader.Title>
        </ScrollHeader.Bar>
        <ScrollHeader.Large>
          <ScrollHeader.Description>Version 4.2 · 12 November</ScrollHeader.Description>
          <ScrollHeader.Title>What changed this month</ScrollHeader.Title>
        </ScrollHeader.Large>

        <div className="px-6 pt-2">
          <Tabs defaultValue="desktop" variant="underline">
            {/* Pinned under the condensed bar, at exactly the bar's height. */}
            <Tabs.List aria-label="Platform" className="sticky top-14 z-10 bg-background">
              {SECTIONS.map((section) => (
                <Tabs.Trigger key={section.value} value={section.value}>
                  {section.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {SECTIONS.map((section) => (
              <Tabs.Content key={section.value} value={section.value}>
                <ul className="flex flex-col gap-4 py-5">
                  {section.notes.map((note) => (
                    <li key={note} className="flex gap-3 leading-7 text-muted-foreground">
                      <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-border" />
                      {note}
                    </li>
                  ))}
                </ul>
              </Tabs.Content>
            ))}
          </Tabs>
        </div>
      </ScrollHeader>
    </div>
  );
}
