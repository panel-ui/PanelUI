import { authorOf, getPosts, slugOf } from '@/lib/blog';
import { absoluteUrl, site } from '@/lib/site';

export const dynamic = 'force-static';

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The blog as an RSS 2.0 feed, newest first. */
export function GET() {
  const items = getPosts()
    .map((post) => {
      const url = absoluteUrl(`/blog/${slugOf(post)}`);
      return [
        '<item>',
        `<title>${escape(post.title)}</title>`,
        `<link>${url}</link>`,
        `<guid isPermaLink="true">${url}</guid>`,
        `<pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>`,
        `<dc:creator>${escape(authorOf(post).name)}</dc:creator>`,
        post.description ? `<description>${escape(post.description)}</description>` : '',
        ...post.tags.map((tag) => `<category>${escape(tag)}</category>`),
        '</item>',
      ].join('');
    })
    .join('');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">' +
    '<channel>' +
    `<title>${escape(`${site.name} blog`)}</title>` +
    `<link>${absoluteUrl('/blog')}</link>` +
    `<atom:link href="${absoluteUrl('/blog/rss.xml')}" rel="self" type="application/rss+xml"/>` +
    `<description>${escape(`Articles on building React Native and Expo apps with ${site.name}.`)}</description>` +
    '<language>en</language>' +
    items +
    '</channel></rss>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
