/**
 * Builds the web collection's registry, served at panelui.dev/r/web.
 *
 * The collection is published two ways: as the `panelui-web` package, and as
 * items the shadcn CLI copies into a project. Both come from
 * `packages/web/src`, and this is the half that turns that source into
 * copy-in items, so the two cannot drift apart.
 *
 * What changes on the way out is only what has to: an import that reached
 * across the package becomes the alias a project already has. `../../lib/cn`
 * is the project's own `cn`, another component is its copied file, and
 * anything from npm is listed for the CLI to install. A relative import this
 * does not know how to translate is an error rather than a guess, because a
 * guess is a file that fails to compile in somebody else's project.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SRC = path.join(ROOT, 'packages/web/src/components');
const OUT = path.join(HERE, '../public/r/web');
const SITE = 'https://panelui.dev';

/** Where an item's files land, under the project's own components alias. */
export const WEB_TARGET = 'panelui';

const meta = JSON.parse(fs.readFileSync(path.join(HERE, 'web-meta.json'), 'utf8'));

/** Present in every React project; listing them would be noise. */
const PROVIDED = new Set(['react', 'react-dom']);

/** `@scope/name/sub/path` and `name/sub` both install as their package. */
function packageOf(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

// A specifier starts with a name character and holds no whitespace, so a string
// that merely ends in the word, such as `side === 'from' ? …`, is not taken for an import.
const IMPORT = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([@\w./-][^'"\s]*)\2/g;

/**
 * The roles the collection draws in that a stock shadcn theme does not define.
 *
 * `primary`, `destructive`, `muted` and the rest are in every theme the CLI
 * writes. These three are not, and a component that reads one of them from a
 * theme without it draws nothing where the colour should be. So an item that
 * uses one carries it, and the CLI adds it to the project's stylesheet. They
 * are the same in light and dark, as they are in PanelUI's own theme.
 */
const STATUS_TOKENS = {
  success: 'oklch(0.696 0.17 162.48)',
  warning: 'oklch(0.769 0.188 70.08)',
  info: 'oklch(0.623 0.214 259.815)',
};

/** The files of one component, entry first, as the project will receive them. */
export function buildItem(slug) {
  const directory = path.join(SRC, slug);
  if (!fs.existsSync(path.join(directory, 'index.tsx'))) {
    throw new Error(`web registry: ${slug} has no packages/web/src/components/${slug}/index.tsx`);
  }
  const [name, summary] = meta[slug];

  const sources = fs
    .readdirSync(directory)
    .filter((file) => /\.tsx?$/.test(file))
    .sort((a, b) => (a === 'index.tsx' ? -1 : b === 'index.tsx' ? 1 : a.localeCompare(b)));
  const single = sources.length === 1;

  const dependencies = new Set();
  const registryDependencies = new Set();

  const files = sources.map((file) => {
    const content = fs
      .readFileSync(path.join(directory, file), 'utf8')
      .replace(IMPORT, (match, lead, quote, specifier) => {
        const as = (next) => `${lead}${quote}${next}${quote}`;
        if (!specifier.startsWith('.')) {
          const dependency = packageOf(specifier);
          if (!PROVIDED.has(dependency)) dependencies.add(dependency);
          return match;
        }
        if (specifier === '../../lib/cn') {
          // The project's own helper, which the official `utils` item provides.
          registryDependencies.add('utils');
          return as('@/lib/utils');
        }
        const sibling = /^\.\.\/([a-z0-9-]+)$/.exec(specifier);
        if (sibling) {
          if (!meta[sibling[1]]) {
            throw new Error(`web registry: ${slug} imports ${specifier}, which has no web-meta.json entry`);
          }
          // Same-registry items are addressed by URL; a bare name would mean
          // an official item of that name.
          registryDependencies.add(`${SITE}/r/web/${sibling[1]}.json`);
          return as(`@/components/${WEB_TARGET}/${sibling[1]}`);
        }
        if (/^\.\/[a-z0-9-]+$/.test(specifier) && !single) return match;
        throw new Error(`web registry: ${slug}/${file} has an import that cannot be translated: ${specifier}`);
      });

    const relative = single ? `${slug}.tsx` : `${slug}/${file}`;
    return {
      path: `components/${WEB_TARGET}/${relative}`,
      type: 'registry:component',
      // The placeholder resolves through the project's components alias, so a
      // project that keeps its components somewhere else still gets them there.
      target: `@components/${WEB_TARGET}/${relative}`,
      content,
    };
  });

  const tokens = Object.fromEntries(
    Object.entries(STATUS_TOKENS).filter(([token]) =>
      files.some((file) => file.content.includes(`var(--${token})`))
    )
  );

  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: slug,
    type: 'registry:component',
    title: meta[slug][3]?.title ?? name,
    description: summary,
    dependencies: [...dependencies].sort(),
    ...(dependencies.has('d3-shape') ? { devDependencies: ['@types/d3-shape'] } : {}),
    registryDependencies: [...registryDependencies].sort(),
    ...(Object.keys(tokens).length > 0 ? { cssVars: { light: tokens, dark: tokens } } : {}),
    files,
  };
}

export function buildWebRegistry() {
  const slugs = Object.keys(meta).sort();
  const onDisk = fs
    .readdirSync(SRC, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const undocumented = onDisk.filter((slug) => !meta[slug]);
  if (undocumented.length > 0) {
    throw new Error(`web registry: no web-meta.json entry for ${undocumented.join(', ')}`);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const items = slugs.map(buildItem);
  for (const item of items) {
    fs.writeFileSync(path.join(OUT, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  }

  // The index a `shadcn list` or a configured `@panelui` namespace reads. It
  // carries no file contents: it is the catalogue, and each item is a request.
  const index = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'panelui',
    homepage: `${SITE}/docs/web`,
    items: items.map(({ $schema, files, ...item }) => ({
      ...item,
      files: files.map(({ content, ...file }) => file),
    })),
  };
  fs.writeFileSync(path.join(OUT, 'registry.json'), `${JSON.stringify(index, null, 2)}\n`);

  return items;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const items = buildWebRegistry();
  console.log(`web registry: ${items.length} items -> public/r/web`);
}
