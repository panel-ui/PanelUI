import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';

/**
 * The notebook layout, not the default docs one.
 *
 * `layouts/docs` has no persistent header on desktop — it sets
 * `--fd-header-height: 0px` and moves the nav links into the sidebar, which is
 * what duplicated them above the page tree. Notebook keeps a real top navbar
 * with the sidebar beneath it, which is the layout in the reference.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions}
      nav={{ ...baseOptions.nav, mode: 'top' }}
      // The tree is two flat groups already; nothing should render a toggle.
      sidebar={{ collapsible: false }}
      tabMode="navbar"
    >
      {children}
    </DocsLayout>
  );
}
