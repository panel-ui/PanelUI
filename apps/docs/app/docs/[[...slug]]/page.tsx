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

/** One rung of a `BreadcrumbList`. The last has no `url` — it is this page. */
interface Crumb {
  name: string;
  url?: string;
}

/**
 * The trail a search result draws above the title, in place of the raw path
 * it would otherwise guess at from the URL.
 *
 * Every rung but the last has to link somewhere that exists: Google discards a
 * trail pointing at a 404, which would leave the page worse off than with no
 * markup at all. Most sidebar groups are not pages — `/docs/components` is a
 * folder whose contents are spread into the sidebar by `meta.json`, and it
 * returns 404 — so an ancestor earns a rung only when `source` resolves it.
 * That is true of `/docs` and `/docs/ai` today, and becomes true of any group
 * that later gains an index page, without this needing to be told.
 */
function breadcrumbTrail(slug: string[], title: string): Crumb[] {
  // The docs root is its own page; a trail from it to itself says nothing.
  if (slug.length === 0) return [];

  const trail: Crumb[] = [];
  const root = source.getPage([]);
  if (root) trail.push({ name: 'Docs', url: absoluteUrl(root.url) });

  for (let depth = 1; depth < slug.length; depth++) {
    const ancestor = source.getPage(slug.slice(0, depth));
    if (ancestor) {
      trail.push({ name: ancestor.data.title, url: absoluteUrl(ancestor.url) });
    }
  }

  trail.push({ name: title });
  return trail;
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
  const trail = breadcrumbTrail(slug ?? [], page.data.title);

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

      {/* One graph rather than two script tags: the article and the trail
          describe the same page, and a single block is what a validator and a
          reader both expect to find.

          TechArticle marks the page up so search engines and AI answer engines
          can attribute it. BreadcrumbList is what turns the URL line of a
          result from a guessed path into named rungs. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
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
              },
              // A single rung is not a trail, so pages that resolve to one —
              // the docs root — emit no BreadcrumbList at all rather than a
              // degenerate one.
              ...(trail.length > 1
                ? [
                    {
                      '@type': 'BreadcrumbList',
                      itemListElement: trail.map((crumb, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        name: crumb.name,
                        // Omitted on the last rung, which is this page: there
                        // is nowhere for it to link to.
                        ...(crumb.url ? { item: crumb.url } : {}),
                      })),
                    },
                  ]
                : []),
            ],
          }),
        }}
      />
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

/**
 * Which part of the docs a page belongs to, for the line above the title on
 * its social card. Taken from the first slug segment, which is the folder the
 * page is filed in and therefore the sidebar group it appears under.
 *
 * Anything unlisted falls back to the generic label rather than guessing a
 * name from the folder — a card is read by people who have not been to the
 * site, and a heading like "ai-components" tells them less than nothing.
 */
const SECTIONS: Record<string, string> = {
  components: 'Components',
  charts: 'Charts',
  'ai-components': 'AI Components',
  ai: 'AI',
  form: 'Form',
  hooks: 'Hooks',
  utilities: 'Utilities',
  integrations: 'Integrations',
};

function sectionOf(slug: string[] | undefined): string {
  return (slug?.[0] && SECTIONS[slug[0]]) || `${site.name} docs`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const url = absoluteUrl(page.url);
  const title = page.data.title;
  const description = page.data.description ?? site.description;
  const ogImage = absoluteUrl(
    `/og?title=${encodeURIComponent(title)}` +
      `&description=${encodeURIComponent(description)}` +
      `&eyebrow=${encodeURIComponent(sectionOf(slug))}`
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
      // `type` as well as the dimensions: a crawler that will not fetch the
      // image before laying the card out has then been told everything about
      // it, which is what the site root's card declares too.
      images: [{ url: ogImage, width: 1200, height: 630, alt: title, type: 'image/png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — ${site.name}`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title, type: 'image/png' }],
    },
  };
}
