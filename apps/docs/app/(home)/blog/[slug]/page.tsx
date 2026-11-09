import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { Byline } from '@/components/blog/byline';
import { PixelCover } from '@/components/blog/pixel-cover';
import { getMDXComponents } from '@/mdx-components';
import { authorOf, formatDate, getPost, getPosts, readingMinutes, slugOf } from '@/lib/blog';
import { absoluteUrl, site } from '@/lib/site';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: slugOf(post) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const author = authorOf(post);
  const url = absoluteUrl(`/blog/${slug}`);

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: author.name, url: `https://github.com/${author.github}` }],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [author.name],
      tags: post.tags,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const author = authorOf(post);
  const minutes = await readingMinutes(post);
  const MDX = post.body;
  const others = getPosts()
    .filter((other) => slugOf(other) !== slug)
    .slice(0, 2);

  /*
   * What a search engine reads as the article: who wrote it, when, and for
   * whom. The author is a Person with their GitHub profile, which is the one
   * place the name is tied to the work.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: absoluteUrl(`/blog/${slug}`),
    keywords: post.tags.join(', '),
    author: {
      '@type': 'Person',
      name: author.name,
      url: `https://github.com/${author.github}`,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/icon-512.png') },
    },
  };

  return (
    <main className="flex flex-1 flex-col px-6 pt-12 pb-20">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <Link
          href="/blog"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Blog
        </Link>

        <header className="flex flex-col gap-5">
          {post.tags[0] ? <p className="text-sm text-muted-foreground">{post.tags[0]}</p> : null}
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {post.title}
          </h1>
          {post.description ? (
            <p className="text-lg text-muted-foreground text-pretty">{post.description}</p>
          ) : null}
          <Byline
            author={author}
            date={formatDate(post.date)}
            detail={`${minutes} min read`}
            size="md"
            linked
          />
        </header>

        <PixelCover cover={post.cover} className="rounded-2xl border" />

        <div className="prose max-w-none">
          <MDX components={getMDXComponents()} />
        </div>
      </article>

      {others.length > 0 ? (
        <aside className="mx-auto mt-20 flex w-full max-w-3xl flex-col gap-6 border-t pt-10">
          <h2 className="text-sm text-muted-foreground">More from the blog</h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {others.map((other) => (
              <li key={slugOf(other)}>
                <Link href={`/blog/${slugOf(other)}`} className="group flex flex-col gap-3">
                  <PixelCover cover={other.cover} className="rounded-xl border" />
                  <span className="font-medium group-hover:underline underline-offset-4">
                    {other.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </main>
  );
}
