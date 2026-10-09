import { fail } from './ui.mjs';

export const DISCOVERY_TYPES = ['ui', 'chart', 'block', 'hook', 'lib', 'theme'];

export function kindOf(item) {
  if (DISCOVERY_TYPES.includes(item.kind)) return item.kind;
  if (item.docsPath?.startsWith('charts/')) return 'chart';
  const legacy = item.type?.replace('registry:', '');
  return DISCOVERY_TYPES.includes(legacy) ? legacy : 'ui';
}

function compareNames(a, b) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** Filter/rank the index; legacy registries need only name, type and description. */
export function discover(index, { type, search } = {}) {
  if (type && !DISCOVERY_TYPES.includes(type)) {
    fail(`Unknown registry type "${type}".`, `Try: ${DISCOVERY_TYPES.join(', ')}.`);
  }

  const query = String(search ?? '').trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  return index
    .filter((item) => !type || kindOf(item) === type)
    .map((item) => {
      const name = String(item.name ?? '').toLowerCase();
      const description = String(item.description ?? '').toLowerCase();
      const haystack = `${name} ${description}`;
      if (terms.some((term) => !haystack.includes(term))) return null;
      // Exact names beat prefixes, then name matches, then description-only matches.
      const score = !query
        ? 0
        : name === query
          ? 0
          : name.startsWith(query)
            ? 1
            : terms.every((term) => name.includes(term))
              ? 2
              : description.includes(query)
                ? 3
                : 4;
      return { item, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || compareNames(a.item, b.item))
    .map(({ item }) => item);
}
