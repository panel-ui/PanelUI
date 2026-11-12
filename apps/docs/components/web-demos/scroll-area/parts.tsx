'use client';

import { ScrollArea } from 'panelui-web/scroll-area';
import { useEffect, useRef, useState } from 'react';

const ENTRIES = [
  ['14:02', 'Build started on main (a41c9e2)'],
  ['14:02', 'Restored dependency cache, 1,284 packages'],
  ['14:03', 'Type check passed in 41s'],
  ['14:04', 'Unit tests: 912 passed, 3 skipped'],
  ['14:05', 'Bundled web app, 418 KB gzipped'],
  ['14:05', 'Uploaded source maps'],
  ['14:06', 'Preview deployed to staging'],
  ['14:06', 'Smoke tests: checkout, sign-in, search'],
  ['14:07', 'Smoke tests passed'],
  ['14:07', 'Waiting for approval from release owner'],
  ['14:12', 'Approved by J. Weber'],
  ['14:12', 'Promoting staging to production'],
  ['14:13', 'Production healthy on all regions'],
  ['14:13', 'Build finished in 11m 04s'],
];

export default function ScrollAreaParts() {
  const viewport = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState(0);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollHeight - el.clientHeight;
      setRead(max > 0 ? Math.round((el.scrollTop / max) * 100) : 100);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <ScrollArea.Root className="h-64 rounded-2xl border bg-background">
        <ScrollArea.Viewport ref={viewport}>
          <ScrollArea.Content>
            <ol className="flex flex-col py-2 font-mono text-xs">
              {ENTRIES.map(([time, line], i) => (
                <li key={i} className="flex gap-3 px-4 py-1.5">
                  <span className="text-muted-foreground tabular-nums">{time}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar />
      </ScrollArea.Root>
      <p className="text-xs text-muted-foreground tabular-nums">Read: {read}%</p>
    </div>
  );
}
