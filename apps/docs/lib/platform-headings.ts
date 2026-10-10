/**
 * Which of a page's headings sit inside a `<Platform only="…">` block, so the
 * page can hide their table-of-contents entries along with the block.
 *
 * Read from the page's raw MDX at render time: walk it line by line, skipping
 * code fences and frontmatter, and pair each Markdown heading with the TOC
 * entry at the same position — the TOC lists every heading, in order, with the
 * id Fumadocs gave it. If the counts disagree, nothing is hidden rather than
 * the wrong entries. `<Platform>` tags go on lines of their own.
 */

export type PlatformName = 'app' | 'web';
export type PlatformHeadings = Record<PlatformName, string[]>;

export function platformHeadings(raw: string, tocUrls: string[]): PlatformHeadings | null {
  const lines = raw.split('\n');
  let start = 0;
  if (lines[0]?.trim() === '---') {
    const end = lines.indexOf('---', 1);
    start = end === -1 ? 0 : end + 1;
  }

  const inside: (PlatformName | undefined)[] = [];
  const stack: PlatformName[] = [];
  let fence: string | null = null;

  for (const line of lines.slice(start)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (fence === null) fence = marker;
      else if (marker.startsWith(fence)) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const open = /^\s*<Platform only="(app|web)">\s*$/.exec(line);
    if (open) {
      stack.push(open[1] as PlatformName);
      continue;
    }
    if (/^\s*<\/Platform>\s*$/.test(line)) {
      stack.pop();
      continue;
    }
    if (/^#{1,6}\s/.test(line)) inside.push(stack.at(-1));
  }

  if (inside.length !== tocUrls.length) return null;
  const headings: PlatformHeadings = { app: [], web: [] };
  inside.forEach((platform, index) => {
    const id = tocUrls[index]?.replace(/^#/, '');
    if (platform && id) headings[platform].push(id);
  });
  return headings.app.length > 0 || headings.web.length > 0 ? headings : null;
}
