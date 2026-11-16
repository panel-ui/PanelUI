import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

const server = createFromSource(source, {
  language: 'english',
});

interface Result {
  type: 'page' | 'heading' | 'text';
  content: string;
}

/**
 * How closely a page's title answers the query: its own name first, then a
 * title that starts with it, then one that contains it. Lower is closer.
 */
function rankOf(title: string, query: string): number {
  const name = title.trim().toLowerCase();
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  return 3;
}

/**
 * The search, with pages named for the query first. Full-text ranking alone
 * put a page that merely mentions a component in a heading, such as Button
 * Group's "Toolbar" section, above the component's own page, so the result
 * Enter opened was the wrong one. Each page keeps its headings with it, and
 * pages of equal rank keep the search's own order.
 */
export async function GET(request: Request): Promise<Response> {
  const response = await server.GET(request);
  const query = new URL(request.url).searchParams.get('query')?.trim().toLowerCase() ?? '';
  if (!response.ok || query === '') return response;

  const results = (await response.json()) as Result[];
  const groups: Result[][] = [];
  for (const result of results) {
    if (result.type === 'page' || groups.length === 0) groups.push([result]);
    else groups[groups.length - 1]!.push(result);
  }
  const ranked = groups
    .map((group, index) => ({ group, index, rank: group[0]!.type === 'page' ? rankOf(group[0]!.content, query) : 3 }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .flatMap(({ group }) => group);

  return Response.json(ranked, { headers: response.headers });
}
