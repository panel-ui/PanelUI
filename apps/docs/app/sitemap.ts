import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';
import { source } from '@/lib/source';

/** Every docs page plus the landing page, generated from the content tree. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((page) => ({
    url: absoluteUrl(page.url),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    // Overview pages outrank individual component pages.
    priority: page.url === '/docs' ? 0.9 : 0.7,
  }));

  return [
    {
      url: absoluteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...pages,
  ];
}
