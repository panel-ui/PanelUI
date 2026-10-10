import type { ReactNode } from 'react';
import type { PlatformName } from '@/lib/platform-headings';

/**
 * Content for one platform of a page with an App / Web toggle.
 *
 * Both versions are in the HTML; a rule in `global.css` hides the one the
 * reader didn't pick, keyed on `data-platform` on `<html>`. That is set before
 * the first paint (`PlatformScript`), so a returning web reader never sees
 * the app version flash by, and nothing here needs to hydrate.
 */
export function Platform({ only, children }: { only: PlatformName; children: ReactNode }) {
  return <div data-platform-only={only}>{children}</div>;
}
