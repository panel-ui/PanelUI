import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';
import { source } from '@/lib/source';

/**
 * When each page last actually changed, from git.
 *
 * Every entry used to say `new Date()`, which claims the whole site changed on
 * the day it was built — every build, for a hundred and thirty URLs. A crawler
 * with a limited budget uses this to decide what to look at again, and a
 * signal that says "all of it, always" is one it learns to ignore. Forty-nine
 * of these pages are sitting in Search Console's "discovered, not indexed",
 * and this is one of the reasons.
 *
 * One `git log` for the whole tree rather than one per file: 130 processes at
 * build time is slower than the build.
 */
function lastModifiedByFile(): Map<string, Date> {
  const dates = new Map<string, Date>();

  try {
    const log = execFileSync(
      'git',
      ['log', '--name-only', '--pretty=format:%cI', '--', 'apps/docs/content'],
      { cwd: path.join(process.cwd(), '../..'), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
    );

    let commitDate: Date | null = null;
    for (const line of log.split('\n')) {
      if (!line) continue;
      // A date line starts the commit; every line after it is a file in it,
      // and the first commit to mention a file is its most recent.
      if (line.includes('T') && line.includes(':') && !line.includes('/')) {
        commitDate = new Date(line);
      } else if (commitDate && !dates.has(line)) {
        dates.set(line, commitDate);
      }
    }
  } catch {
    // No git — a tarball, or a build somewhere without history. Falling back
    // to the build time is what this did before, so nothing is worse than it
    // was.
  }

  return dates;
}

/** Every docs page plus the landing page, generated from the content tree. */
export default function sitemap(): MetadataRoute.Sitemap {
  const dates = lastModifiedByFile();
  const fallback = new Date();

  /*
   * A page's URL is its path under content/docs, which is what makes this a
   * lookup rather than a search: `/docs/components/button` is
   * `components/button.mdx`, and `/docs/components` is that folder's
   * `index.mdx`.
   */
  const fileFor = (url: string) => {
    const rest = url.replace(/^\/docs\/?/, '');
    return `apps/docs/content/docs/${rest ? `${rest}.mdx` : 'index.mdx'}`;
  };

  const pages = source.getPages().map((page) => ({
    url: absoluteUrl(page.url),
    lastModified:
      dates.get(fileFor(page.url)) ?? dates.get(fileFor(`${page.url}/index`)) ?? fallback,
    changeFrequency: 'weekly' as const,
    // Overview pages outrank individual component pages.
    priority: page.url === '/docs' ? 0.9 : 0.7,
  }));

  return [
    {
      url: absoluteUrl('/'),
      lastModified: fallback,
      changeFrequency: 'weekly',
      priority: 1,
    },
    /*
     * Hand-written, because these are not under `content/docs` and so are not
     * in the page tree the rest of this is derived from. Sponsors is monthly:
     * the list on it moves when a sponsor arrives, which is not weekly. The
     * privacy policy changes only when what the app or site collects does.
     */
    {
      url: absoluteUrl('/sponsors'),
      lastModified: fallback,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/privacy'),
      lastModified: fallback,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    ...pages,
  ];
}
