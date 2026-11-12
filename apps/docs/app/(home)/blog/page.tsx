import type { Metadata } from 'next';
import Link from 'next/link';
import { RssIcon } from 'lucide-react';
import { Byline } from '@/components/blog/byline';
import { BlogCover } from '@/components/blog/cover';
import { authorOf, formatDate, getPosts, slugOf } from '@/lib/blog';
import { absoluteUrl, site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Blog',
  description: `Articles on building React Native and Expo apps with ${site.name}: components, theming, animation and releases.`,
  alternates: {
    canonical: absoluteUrl('/blog'),
    types: { 'application/rss+xml': absoluteUrl('/blog/rss.xml') },
  },
};

export default function BlogPage() {
  const [lead, ...rest] = getPosts();

  return (
    <main className="flex flex-1 flex-col">
      <section className="px-6 pt-20 pb-14">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <p className="text-sm text-muted-foreground">Blog</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Notes from building {site.name}.
            </h1>
            <Link
              href="/blog/rss.xml"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <RssIcon className="size-4" />
              RSS
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t px-6 py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-12">
          {lead ? (
            <Link
              href={`/blog/${slugOf(lead)}`}
              className="group grid items-center gap-6 lg:grid-cols-[3fr_2fr] lg:gap-10"
            >
              <BlogCover
                cover={lead.cover}
                priority
                sizes="(min-width: 1024px) 600px, 100vw"
                className="rounded-2xl border transition-opacity group-hover:opacity-90"
              />
              <div className="flex flex-col gap-4">
                {lead.tags[0] ? (
                  <p className="text-sm text-muted-foreground">{lead.tags[0]}</p>
                ) : null}
                <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance group-hover:underline underline-offset-4">
                  {lead.title}
                </h2>
                {lead.description ? (
                  <p className="text-muted-foreground">{lead.description}</p>
                ) : null}
                <Byline author={authorOf(lead)} date={formatDate(lead.date)} />
              </div>
            </Link>
          ) : (
            <p className="text-muted-foreground">No posts yet.</p>
          )}

          {rest.length > 0 ? (
            <ul className="grid gap-x-6 gap-y-10 border-t pt-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <li key={slugOf(post)}>
                  <Link href={`/blog/${slugOf(post)}`} className="group flex flex-col gap-4">
                    <BlogCover
                      cover={post.cover}
                      sizes="(min-width: 1024px) 330px, (min-width: 640px) 50vw, 100vw"
                      className="rounded-xl border transition-opacity group-hover:opacity-90"
                    />
                    {post.tags[0] ? (
                      <p className="text-sm text-muted-foreground">{post.tags[0]}</p>
                    ) : null}
                    <h2 className="font-heading text-lg font-semibold tracking-tight text-balance group-hover:underline underline-offset-4">
                      {post.title}
                    </h2>
                    <Byline author={authorOf(post)} date={formatDate(post.date)} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </main>
  );
}
