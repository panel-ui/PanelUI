import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { site } from '@/lib/site';

/** Shared nav config for the docs layout and the home layout. */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-heading text-base font-semibold tracking-tight">
        {site.name}
      </span>
    ),
  },
  links: [
    {
      text: 'Documentation',
      url: '/docs',
      active: 'nested-url',
    },
    {
      text: 'npm',
      url: site.npm,
      external: true,
    },
  ],
  githubUrl: site.repo,
};
