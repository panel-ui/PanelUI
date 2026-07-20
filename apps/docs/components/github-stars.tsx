import Link from 'next/link';
import { fetchRepositoryInfo } from 'fumadocs-ui/components/github-info';
import { site } from '@/lib/site';

const OWNER = 'panel-ui';
const REPO = 'PanelUI';

/** Refetch daily rather than per request. */
export const revalidate = 86400;

/**
 * GitHub link with a star count.
 *
 * The count is best-effort: `fetchRepositoryInfo` calls the public GitHub API,
 * which 404s while the repository is private. Rather than break the navbar,
 * the link falls back to a bare icon and starts showing a count on its own
 * once the repo is public.
 */
export async function GithubStars() {
  let stars: number | null = null;

  try {
    const info = await fetchRepositoryInfo({
      owner: OWNER,
      repo: REPO,
      token: process.env.GITHUB_TOKEN,
    });
    stars = info.stars;
  } catch {
    stars = null;
  }

  return (
    <Link
      href={site.repo}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={
        stars === null ? 'GitHub repository' : `GitHub repository, ${stars} stars`
      }
      className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
        <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
      </svg>
      {stars === null ? null : (
        <span className="tabular-nums">{formatStars(stars)}</span>
      )}
    </Link>
  );
}

/** 1200 → "1.2k", matching how GitHub itself abbreviates. */
function formatStars(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}
