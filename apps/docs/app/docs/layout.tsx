import Image from 'next/image';
import type { ReactNode } from 'react';
import { Anchor, Blocks, Sparkles, Wrench } from 'lucide-react';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';

/**
 * Tabs, declared rather than derived.
 *
 * Fumadocs can build these from the `root: true` folders in `content/docs`,
 * but the tree's *root* node drops its `icon` on the way through — so the
 * Guide tab, the one that carries the product mark, would be the only tab
 * without one. Declaring all four keeps them consistent.
 */
const tabs = [
  {
    title: 'Guide',
    description: 'Install, theme, and go native.',
    url: '/docs',
    icon: (
      <Image
        src="/tab-icon.png"
        alt=""
        width={20}
        height={20}
        className="rounded-[5px]"
      />
    ),
  },
  {
    title: 'Components',
    description: 'Every component, with worked examples.',
    url: '/docs/components/button',
    icon: <Blocks />,
  },
  {
    title: 'AI',
    description: 'Chat interfaces that hold their frame rate.',
    url: '/docs/ai',
    icon: <Sparkles />,
  },
  {
    title: 'Hooks',
    description: 'Behaviour without markup.',
    url: '/docs/hooks/use-disclosure',
    icon: <Anchor />,
  },
  {
    title: 'Utilities',
    description: 'Small helpers.',
    url: '/docs/utilities/cn',
    icon: <Wrench />,
  },
];

/**
 * The notebook layout, not the default docs one.
 *
 * `layouts/docs` has no persistent header on desktop — it sets
 * `--fd-header-height: 0px` and moves the nav links into the sidebar, which is
 * what duplicated them above the page tree. Notebook keeps a real top navbar
 * with the sidebar beneath it.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      {...baseOptions}
      nav={{ ...baseOptions.nav, mode: 'top' }}
      // `sidebar`, not `navbar`: the navbar tab strip is titles only, where the
      // sidebar picker shows each section's icon and description too.
      tabMode="sidebar"
      sidebar={{ collapsible: false, tabs }}
    >
      {children}
    </DocsLayout>
  );
}
