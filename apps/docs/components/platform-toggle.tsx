'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { PlatformName } from '@/lib/platform-headings';
import { cn } from '@/lib/utils';
import { radioIndexForKey } from './composite-keyboard';

/**
 * The App / Web switch at the top of a Studio page.
 *
 * The choice lives on `<html data-platform>`, where CSS reads it to show one
 * version of the page, and in localStorage, so it carries across pages and
 * visits. A `?platform=web` link picks it too. `PLATFORM_SCRIPT` applies it
 * before the first paint; this component only changes it.
 */

const PLATFORMS: { value: PlatformName; label: string; hint: string }[] = [
  { value: 'app', label: 'App', hint: 'Expo and React Native' },
  { value: 'web', label: 'Web', hint: 'Next.js, React and Vite' },
];

export const PLATFORM_STORAGE_KEY = 'panelui:studio-platform';

/**
 * Runs inline, before the page paints. A plain string because it executes
 * before React or any bundle has loaded.
 */
export const PLATFORM_SCRIPT = `try{var q=new URLSearchParams(location.search).get('platform');if(q==='app'||q==='web')localStorage.setItem('${PLATFORM_STORAGE_KEY}',q);var p=q==='app'||q==='web'?q:localStorage.getItem('${PLATFORM_STORAGE_KEY}');if(p==='web')document.documentElement.dataset.platform='web'}catch(e){}`;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(): PlatformName {
  return document.documentElement.dataset.platform === 'web' ? 'web' : 'app';
}

/** The server can't know; the first client render matches it, then corrects. */
function readServer(): PlatformName {
  return 'app';
}

function select(platform: PlatformName) {
  if (platform === 'web') document.documentElement.dataset.platform = 'web';
  else delete document.documentElement.dataset.platform;
  try {
    localStorage.setItem(PLATFORM_STORAGE_KEY, platform);
  } catch {
    // Private mode, or storage turned off: the choice holds for this page.
  }
  // A shared `?platform=` link shouldn't contradict what's on screen.
  const url = new URL(window.location.href);
  if (url.searchParams.has('platform')) {
    url.searchParams.set('platform', platform);
    window.history.replaceState(window.history.state, '', url);
  }
  for (const listener of listeners) listener();
}

export function PlatformToggle() {
  const platform = useSyncExternalStore(subscribe, read, readServer);
  const refs = useRef<Partial<Record<PlatformName, HTMLButtonElement | null>>>({});

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = radioIndexForKey(event.key, index, PLATFORMS.length);
    if (next === undefined) return;
    event.preventDefault();
    const value = PLATFORMS[next].value;
    select(value);
    refs.current[value]?.focus();
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Platform"
      className="inline-flex h-8 items-center rounded-lg border bg-muted/50 p-0.5 text-sm"
    >
      {PLATFORMS.map((item, index) => {
        const checked = platform === item.value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[item.value] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            title={item.hint}
            tabIndex={checked ? 0 : -1}
            onClick={() => select(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'h-full cursor-pointer rounded-md px-3 font-medium transition-colors',
              checked
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
