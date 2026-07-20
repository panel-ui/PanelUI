import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The search endpoint returns JSON; nothing to index.
        disallow: '/api/',
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
