import Image from 'next/image';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { GithubStars } from '@/components/github-stars';
import { site } from '@/lib/site';

/** Shared nav config for the docs layout and the home layout. */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="inline-flex items-center gap-2">
        {/* Two marks, one per surface. Both render; CSS picks the one that
            reads against the current background, so the swap survives
            hydration and needs no JS. */}
        <Image
          src="/logo-light.png"
          alt=""
          width={26}
          height={26}
          className="dark:hidden"
          priority
        />
        <Image
          src="/logo-dark.png"
          alt=""
          width={26}
          height={26}
          className="hidden dark:block"
          priority
        />
        <span className="font-heading text-base font-semibold tracking-tight">
          {site.name}
        </span>
      </span>
    ),
    url: '/',
  },
  /*
   * `on: 'nav'` on every item is load-bearing. Fumadocs defaults link items to
   * 'all', which renders them in the header *and* again at the top of the docs
   * sidebar — duplicating Docs/Components/Theming above the real page tree and
   * putting a GitHub link somewhere it does not belong.
   */
  links: [
    { type: 'main', on: 'nav', text: 'Docs', url: '/docs', active: 'nested-url' },
    {
      type: 'main',
      on: 'nav',
      text: 'Components',
      url: '/docs/components/button',
      active: 'nested-url',
    },
    {
      type: 'main',
      on: 'nav',
      text: 'Theming',
      url: '/docs/theming',
      active: 'nested-url',
    },
    {
      // Star count where available, a bare icon while the repo is private.
      type: 'custom',
      on: 'nav',
      children: <GithubStars />,
      secondary: true,
    },
    {
      type: 'button',
      on: 'nav',
      text: 'Get started',
      url: '/docs',
      secondary: true,
    },
  ],
};
