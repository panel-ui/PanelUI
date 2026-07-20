import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/notebook/page';
import { getMDXComponents } from '@/mdx-components';
import { absoluteUrl, site } from '@/lib/site';
import { source } from '@/lib/source';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const url = absoluteUrl(page.url);
  // Served by app/llms.mdx/[[...slug]] — the page's raw Markdown. Built from
  // `slugs`, not `url`: the route resolves against the content root, which has
  // no /docs prefix.
  const markdownUrl = `/llms.mdx/${page.slugs.join('/')}`;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>

      {/* Copy the page as Markdown, for pasting into an LLM. */}
      <div className="flex flex-row items-center gap-2 border-b pb-4">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`${site.repo}/blob/main/apps/docs/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>

      {/* Marks each page as a technical article so search engines and AI
          answer engines can attribute it. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: page.data.title,
            description: page.data.description,
            url,
            isPartOf: {
              '@type': 'WebSite',
              name: site.name,
              url: site.url,
            },
            author: { '@type': 'Person', name: 'Khalid Abdi' },
            inLanguage: 'en',
          }),
        }}
      />
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const url = absoluteUrl(page.url);
  const title = page.data.title;
  const description = page.data.description ?? site.description;
  const ogImage = absoluteUrl(
    `/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`
  );

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `${title} — ${site.name}`,
      description,
      siteName: site.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — ${site.name}`,
      description,
      images: [ogImage],
    },
  };
}
