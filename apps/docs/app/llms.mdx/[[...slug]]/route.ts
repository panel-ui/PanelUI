import { notFound } from 'next/navigation';
import { source } from '@/lib/source';

/**
 * Raw Markdown for a docs page.
 *
 * This is what `MarkdownCopyButton` fetches for "Copy Page", and what an LLM
 * gets if pointed at the URL directly — the docs without the chrome.
 *
 * It lives at the app root rather than beside the page because Next requires
 * an optional catch-all to be the last segment of a route.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const content = await page.data.getText('raw');

  return new Response(content, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
