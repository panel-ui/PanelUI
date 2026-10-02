import Image from 'next/image';
import type { BaseLayoutProps, LinkItemType } from 'fumadocs-ui/layouts/shared';
import { GithubStars } from '@/components/github-stars';
import { LayoutLink } from '@/components/layout-link';
import { site } from '@/lib/site';

/** The wordmark and the mark, shared by both layouts. */
const navTitle = (
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
);

/*
 * Components sits on the left, beside the wordmark, rather than in the row
 * of links on the right.
 *
 * `nav.children` is the only left-hand slot either layout offers: the
 * header renders it inside the same container as the title, while
 * everything in `links` goes into the `justify-end` group at the other end
 * of the bar. So this link lives here and not in `links` below — moving it
 * back means moving it between the two, not flipping a flag.
 *
 * It is deliberately not in the shared `links`, which also means it is not
 * in the notebook's `menuItems` — that mobile menu would otherwise list it
 * twice, since the sidebar already renders the page tree it points at. The
 * home-only options below restore it where no page tree exists.
 *
 * `LayoutLink`, not `next/link`: this destination is repeated by the
 * persistent chrome, and the policy behind that wrapper is what stops every
 * page in the site prefetching it again.
 */
const navChildren = (
  <LayoutLink
    href="/docs/components"
    // ms-6, because the wordmark ends where this begins. The nav title is
    // its own anchor with no trailing space of its own, so without a margin
    // the two read as one string.
    className="ms-6 text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground max-lg:hidden"
  >
    Components
  </LayoutLink>
);

const docsLink: LinkItemType = {
  type: 'main',
  text: 'Docs',
  url: '/docs',
  active: 'nested-url',
};

const getStartedLink: LinkItemType = {
  type: 'button',
  text: 'Get started',
  url: '/docs',
  secondary: true,
};

/**
 * The classes Fumadocs' own `main` nav item carries: no chrome, muted, and a
 * colour change on hover. Repeated here because the one place this link cannot
 * be a `main` item is the one place it still has to look like one.
 */
const PLAIN_NAV_LINK =
  'inline-flex items-center gap-1.5 p-2 text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground';

/**
 * GitHub on the docs pages: an ordinary nav link, star count and all.
 *
 * The notebook header draws every non-icon item as muted text that brightens
 * on hover, so `main` already is the wanted treatment and Fumadocs owns the
 * anchor and its list item.
 */
const githubDocsLink: LinkItemType = {
  // Star count where available, a bare icon while the repo is private.
  type: 'main',
  text: <GithubStars />,
  url: site.repo,
  external: true,
};

/**
 * GitHub on the home page: the same look, reached a different way.
 *
 * The home header only puts an item in the trailing group — beside the theme
 * switch and Get started — when it is `secondary`, and `main` is the one link
 * type Fumadocs does not let carry that flag. `custom` does, and it also hands
 * over the anchor, which is what takes the button chrome off.
 *
 * The children are an `<li>`, not a bare anchor: custom children are dropped
 * straight into the trailing `<ul>`, and anything else there is a list with a
 * non-list child in it — which is an accessibility failure, not a nitpick.
 *
 * `on: 'nav'` because the mobile menu puts custom children inside a `<div>`,
 * where the same `<li>` would be the mirror-image mistake. The menu gets the
 * button below instead.
 */
const githubHomeLink: LinkItemType = {
  type: 'custom',
  secondary: true,
  on: 'nav',
  children: (
    <li className="flex">
      <a
        href={site.repo}
        target="_blank"
        rel="noreferrer noopener"
        className={PLAIN_NAV_LINK}
      >
        <GithubStars />
      </a>
    </li>
  ),
};

/** The same destination in the phone menu, where a button is the shape used. */
const githubMenuLink: LinkItemType = {
  type: 'button',
  text: <GithubStars />,
  url: site.repo,
  external: true,
  secondary: true,
  on: 'menu',
};

/** Shared nav config for the docs layout and the home layout. */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: navTitle,
    url: '/',
    children: navChildren,
  },
  /*
   * No `on` here, which means 'all' — and that is what puts these links in the
   * mobile menu.
   *
   * They were 'nav' to stop them being duplicated above the page tree in the
   * docs sidebar. But 'nav' is *only* the navbar: it leaves `menuItems` empty,
   * and `menuItems` is what both mobile menus are built from. The trigger
   * still rendered, so the landing page had a menu button that opened onto
   * nothing and no way to reach the docs on a phone.
   *
   * The duplication it was avoiding does not happen in this layout anyway —
   * the notebook sidebar renders these `lg:hidden`, above the tree on small
   * screens only, which is exactly where they are wanted.
   */
  links: [docsLink, githubDocsLink, getStartedLink],
};

/**
 * The home layout, which differs from the docs one in three places.
 *
 * Sponsors is here and not in `baseOptions`: it belongs to the landing page and
 * to the page it points at, and a docs reader deep in a component's props table
 * is not being asked to fund anything. Studio sits beside it for the same
 * reason: it is a product pitch, and the docs have their own Studio section.
 *
 * GitHub is the custom item rather than the plain one, for the reason given
 * above it. And the mobile menu needs the Components destination that
 * `nav.children` hides below the desktop breakpoint — menu-only, since adding
 * it to `baseOptions.links` would duplicate the same destination above the
 * notebook page tree on mobile.
 */
export const homeOptions: BaseLayoutProps = {
  ...baseOptions,
  links: [
    docsLink,
    { type: 'main', text: 'Sponsors', url: '/sponsors', active: 'nested-url' },
    { type: 'main', text: 'Studio', url: site.studio, external: true },
    githubHomeLink,
    githubMenuLink,
    getStartedLink,
    {
      type: 'main',
      text: 'Components',
      url: '/docs/components',
      active: 'nested-url',
      on: 'menu',
    },
  ],
};
