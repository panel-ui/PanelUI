'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { radioIndexForKey } from '../composite-keyboard';

/**
 * The theme picker over the home page's component previews, and the element
 * the previews are themed by.
 *
 * The two halves of it are deliberately different in reach:
 *
 * - **The family** — Panel, Moon, Grass — lands on this wrapper as tokens, so
 *   picking one restyles the previews and leaves the page around them alone.
 *   A visitor comparing three palettes should not have the navigation change
 *   colour under them to do it, and there is no such thing as a Moon docs site
 *   to switch to anyway.
 * - **Light and dark** is the reader's own setting, and there is only one of
 *   it. Two dark switches on a page that disagree is worse than either, so
 *   this one is the site's: it drives the same state the toggle in the
 *   navigation does, and the previews follow it.
 *
 * The picker sits in the page's column; the previews it themes run the full
 * width of the window under it.
 */

/**
 * The three families, with each one's accent in both modes — a swatch is the
 * family's own `--primary`, and Panel's is a near-black that vanishes on a dark
 * control and a near-white that vanishes on a light one.
 */
const FAMILIES = [
  { id: 'panel', name: 'Panel', swatch: { light: '#262626', dark: '#f5f5f5' } },
  { id: 'moon', name: 'Moon', swatch: { light: '#5e6ad2', dark: '#5e6ad2' } },
  { id: 'grass', name: 'Grass', swatch: { light: '#24b47e', dark: '#3ecf8e' } },
] as const;

type Family = (typeof FAMILIES)[number]['id'];
type Mode = 'light' | 'dark';

/**
 * The library's own theme name for a family and a mode — the string
 * `setTheme()` takes, and the value `panel-themes.css` keys on. Panel is the
 * default family, so its two are just `light` and `dark`.
 */
function themeName(family: Family, mode: Mode): string {
  if (family === 'panel') return mode;
  return mode === 'dark' ? `${family}-dark` : family;
}

export function Themer({ children }: { children: ReactNode }): React.ReactElement {
  const [family, setFamily] = useState<Family>('panel');
  const { resolvedTheme, setTheme } = useTheme();
  const familyRefs = useRef<Partial<Record<Family, HTMLButtonElement | null>>>({});

  const onFamilyKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, id: Family) => {
      const current = FAMILIES.findIndex((family) => family.id === id);
      const nextIndex = radioIndexForKey(event.key, current, FAMILIES.length);
      if (nextIndex === undefined) return;
      event.preventDefault();
      const next = FAMILIES[nextIndex].id;
      setFamily(next);
      familyRefs.current[next]?.focus();
    },
    []
  );

  /*
   * `resolvedTheme` is undefined until the provider has read the stored choice
   * and the OS setting, which happens after hydration. Rendering light until
   * then keeps the server's markup and the browser's first pass identical;
   * `mounted` is what stops the button claiming "Light" for that one frame on
   * a page the reader keeps in dark.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mode: Mode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const theme = themeName(family, mode);

  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-3 px-6">
        <div
          className="flex items-center gap-1 rounded-full border bg-card p-1"
          role="radiogroup"
          aria-label="Theme family"
        >
          {FAMILIES.map(({ id, name, swatch }) => (
            <button
              key={id}
              ref={(node) => {
                familyRefs.current[id] = node;
              }}
              type="button"
              role="radio"
              aria-label={name}
              aria-checked={family === id}
              tabIndex={family === id ? 0 : -1}
              onClick={() => setFamily(id)}
              onKeyDown={(event) => onFamilyKeyDown(event, id)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                family === id
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className="size-3 rounded-full ring-1 ring-foreground/10 ring-inset"
                style={{ backgroundColor: swatch[mode] }}
                aria-hidden="true"
              />
              {name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setTheme(mode === 'dark' ? 'light' : 'dark')}
          className="flex cursor-pointer items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === 'dark' ? (
            <MoonIcon className="size-4" aria-hidden="true" />
          ) : (
            <SunIcon className="size-4" aria-hidden="true" />
          )}
          {mode === 'dark' ? 'Dark' : 'Light'}
          {/* The name starts with the word on the button, so a voice command for "Dark" finds it. */}
          <span className="sr-only">, switch the site to {mode === 'dark' ? 'light' : 'dark'} mode</span>
        </button>
      </div>

      <div
        data-panel-theme={theme}
        style={{ colorScheme: mode }}
        /*
         * A background, because the previews carry their own theme: a Moon
         * card on Panel's page would be a tile of another colour floating on
         * it. It runs edge to edge and has no border, so with the page in the
         * same theme this surface disappears, which is the point.
         */
        className="relative bg-background text-foreground"
      >
        {children}
      </div>
    </div>
  );
}
