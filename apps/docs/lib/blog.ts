import { blog } from 'collections/server';
import { site } from '@/lib/site';

/** People who write on the blog, keyed by the `author` in a post's frontmatter. */
export const AUTHORS = {
  khalid: {
    name: 'Khalid Abdi',
    role: 'Creator of PanelUI',
    github: 'Khalidabdi1',
    avatar: 'https://github.com/Khalidabdi1.png?size=160',
    url: site.x,
  },
} as const;

export type AuthorId = keyof typeof AUTHORS;
export type Author = (typeof AUTHORS)[AuthorId];

export type Post = (typeof blog)[number];

/** The URL segment for a post: its file name without the extension. */
export function slugOf(post: Post): string {
  return post.info.path.replace(/\.mdx?$/, '');
}

/** Every post, newest first. */
export function getPosts(): Post[] {
  return [...blog].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return blog.find((post) => slugOf(post) === slug);
}

export function authorOf(post: Post): Author {
  const author = AUTHORS[post.author as AuthorId];
  if (!author) throw new Error(`Unknown blog author "${post.author}" in ${post.info.path}`);
  return author;
}

/**
 * "9 November 2026". Formatted in English and in UTC on purpose: the date in
 * the frontmatter is a calendar day, and reading it in the server's own zone
 * can move it a day either side.
 */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Minutes to read, at 230 words a minute, counted from the source. */
export async function readingMinutes(post: Post): Promise<number> {
  const text = await post.getText('raw');
  const words = text.replace(/^---[\s\S]*?---/, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
