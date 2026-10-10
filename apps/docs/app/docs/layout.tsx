import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { PLATFORM_SCRIPT } from '@/components/platform-toggle';
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
      /*
       * The tree is two flat groups already; nothing should render a toggle.
       *
       * `prefetch` is off because the tree is ~90 links and every one of them
       * is in the viewport at once. Left on, opening a single page fires an
       * RSC request for most of the sidebar — pages the reader never asks
       * for — and the router keys those by segment, so the same href is
       * fetched again for each context it renders in. It was two thirds of
       * the site's request volume.
       */
      sidebar={{ collapsible: false, prefetch: false }}
      tabMode="navbar"
    >
      {/*
        Picks the App or Web version of a Studio page before it paints. Inline
        and first, because anything later would show the other version first.
      */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: PLATFORM_SCRIPT }}
      />
      {children}
    </DocsLayout>
  );
}
