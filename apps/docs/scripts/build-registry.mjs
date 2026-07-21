/**
 * Builds the per-component registry served at panelui.dev/r.
 *
 * The library is normally consumed as one npm package. This emits the same
 * source as standalone, copy-in items so a project can take a single component
 * and own it — dependencies resolved, relative imports rewritten to project
 * aliases, npm packages listed.
 *
 * It reads `packages/panelui/src` directly, so the registry can never drift
 * from the library. Run it whenever the source changes; the docs build does.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SRC = path.join(ROOT, 'packages/panelui/src');
const OUT = path.join(HERE, '../public/r');

const meta = JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'), 'utf8'));

/** Always present in an Expo app — listing them would be noise. */
const PROVIDED = new Set(['react', 'react-native']);

/**
 * Reached only through a lazy require inside a try/catch, so the component
 * works without them. Reported to the user, never installed on their behalf.
 */
const OPTIONAL = new Set([
  '@expo/ui',
  'expo-clipboard',
  'react-native-keyboard-controller',
]);

/** Canonical aliases. The CLI rewrites these if the project uses others. */
const ALIAS = {
  components: '@/components/ui',
  lib: '@/lib',
  hooks: '@/hooks',
};

/* ------------------------------------------------------------------ *
 * 1. Build the manifest: every source file, its item, and where it lands.
 * ------------------------------------------------------------------ */

/** @type {Map<string, {item: string, dest: string, alias: string}>} */
const bySource = new Map();
/** @type {Map<string, {name: string, type: string, files: string[]}>} */
const items = new Map();

function register(name, type, sourceFiles, destOf, aliasOf) {
  items.set(name, { name, type, files: sourceFiles });
  for (const file of sourceFiles) {
    bySource.set(file, { item: name, dest: destOf(file), alias: aliasOf(file) });
  }
}

// Components. `toast` is the only one whose directory holds more than
// index.tsx, so whole directories are copied rather than a single file.
for (const dir of fs.readdirSync(path.join(SRC, 'components')).sort()) {
  const componentDir = path.join(SRC, 'components', dir);
  if (!fs.statSync(componentDir).isDirectory()) continue;

  const files = fs
    .readdirSync(componentDir)
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => path.join(componentDir, f));
  if (!files.length) continue;

  register(
    dir,
    'registry:ui',
    files,
    (f) => `ui/${path.basename(f) === 'index.tsx' ? `${dir}.tsx` : path.basename(f)}`,
    (f) =>
      `${ALIAS.components}/${
        path.basename(f) === 'index.tsx' ? dir : path.basename(f).replace(/\.tsx?$/, '')
      }`
  );
}

// Primitives land beside components — they are components too, just unstyled.
for (const file of fs.readdirSync(path.join(SRC, 'primitives')).sort()) {
  if (!/\.tsx?$/.test(file)) continue;
  const name = file.replace(/\.tsx?$/, '');
  register(
    name,
    'registry:ui',
    [path.join(SRC, 'primitives', file)],
    () => `ui/${file}`,
    () => `${ALIAS.components}/${name}`
  );
}

register(
  'icons',
  'registry:ui',
  [path.join(SRC, 'icons/index.tsx')],
  () => 'ui/icons.tsx',
  () => `${ALIAS.components}/icons`
);

register(
  'cn',
  'registry:lib',
  [path.join(SRC, 'utils/cn.ts')],
  () => 'lib/cn.ts',
  () => `${ALIAS.lib}/cn`
);

register(
  'native',
  'registry:lib',
  [path.join(SRC, 'native/index.ts')],
  () => 'lib/native.ts',
  () => `${ALIAS.lib}/native`
);

for (const file of fs.readdirSync(path.join(SRC, 'hooks')).sort()) {
  // index.ts is a barrel; copying it would force all seven hooks on someone
  // who wanted one.
  if (!/^use-.*\.ts$/.test(file)) continue;
  const name = file.replace(/\.ts$/, '');
  register(
    name,
    'registry:hook',
    [path.join(SRC, 'hooks', file)],
    () => `hooks/${file}`,
    () => `${ALIAS.hooks}/${name}`
  );
}

register(
  'use-theme',
  'registry:hook',
  [path.join(SRC, 'theme/use-theme.ts')],
  () => 'hooks/use-theme.ts',
  () => `${ALIAS.hooks}/use-theme`
);

register(
  'panel-ui-provider',
  'registry:ui',
  [path.join(SRC, 'providers/panel-ui-provider.tsx')],
  () => 'ui/panel-ui-provider.tsx',
  () => `${ALIAS.components}/panel-ui-provider`
);

/* ------------------------------------------------------------------ *
 * 2. Rewrite imports and collect dependencies.
 * ------------------------------------------------------------------ */

/** Resolve a relative specifier against a file, trying the usual extensions. */
function resolveRelative(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, 'index.tsx'),
    path.join(base, 'index.ts'),
  ];
  return candidates.find((c) => bySource.has(c));
}

/**
 * Every specifier in the file: static imports, `export … from`, type imports,
 * and the lazy `require()` / `await import()` calls used for optional peers.
 */
function specifiersOf(source) {
  const found = [];
  const patterns = [
    /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+'([^']+)'/g,
    /(?:^|\n)\s*import\s+'([^']+)'/g,
    /require\(\s*'([^']+)'\s*\)/g,
    /import\(\s*'([^']+)'\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) found.push(m[1]);
  }
  return found;
}

/** Package name from a specifier: `@expo/ui/swift-ui` → `@expo/ui`. */
function packageName(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

const built = [];

for (const [name, item] of items) {
  const registryDependencies = new Set();
  const dependencies = new Set();
  const optionalDependencies = new Set();
  const files = [];

  for (const sourceFile of item.files) {
    let source = fs.readFileSync(sourceFile, 'utf8');

    for (const spec of specifiersOf(source)) {
      if (spec.startsWith('.')) {
        const target = resolveRelative(sourceFile, spec);
        if (!target) {
          throw new Error(`${sourceFile}: cannot resolve '${spec}'`);
        }
        const entry = bySource.get(target);

        // A sibling file inside the same item is copied with it, so it is not
        // a registry dependency — but the import still needs rewriting.
        if (entry.item !== name) registryDependencies.add(entry.item);

        source = source.replaceAll(`'${spec}'`, `'${entry.alias}'`);
        continue;
      }

      const pkg = packageName(spec);
      if (PROVIDED.has(pkg)) continue;
      if (OPTIONAL.has(pkg)) optionalDependencies.add(pkg);
      else dependencies.add(pkg);
    }

    const { dest } = bySource.get(sourceFile);
    files.push({ path: dest, type: item.type, content: source });
  }

  const [, description] = meta[name] ?? [];

  built.push({
    name,
    type: item.type,
    description: description ?? descriptionFor(name, item.type),
    registryDependencies: [...registryDependencies].sort(),
    dependencies: [...dependencies].sort(),
    optionalDependencies: [...optionalDependencies].sort(),
    files,
  });
}

/** Fallback for the parts that are not components and so are not in meta.json. */
function descriptionFor(name, type) {
  const label = type === 'registry:hook' ? 'Hook' : type === 'registry:lib' ? 'Utility' : 'Primitive';
  return `${label}: ${name}.`;
}

/* ------------------------------------------------------------------ *
 * 3. The theme, which is global rather than per component.
 * ------------------------------------------------------------------ */

built.push({
  name: 'theme',
  type: 'registry:theme',
  description: 'Design tokens for every theme, in light and dark.',
  registryDependencies: [],
  dependencies: [],
  optionalDependencies: [],
  files: [
    {
      path: 'theme.css',
      type: 'registry:theme',
      content: fs.readFileSync(path.join(ROOT, 'packages/panelui/theme.css'), 'utf8'),
    },
  ],
});

/* ------------------------------------------------------------------ *
 * 4. Write.
 * ------------------------------------------------------------------ */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const item of built) {
  fs.writeFileSync(path.join(OUT, `${item.name}.json`), JSON.stringify(item, null, 2) + '\n');
}

fs.writeFileSync(
  path.join(OUT, 'index.json'),
  JSON.stringify(
    built
      .map(({ name, type, description, registryDependencies }) => ({
        name,
        type,
        description,
        registryDependencies,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    null,
    2
  ) + '\n'
);

// A leftover relative import means a file would land in a project and fail to
// resolve, so it is worth failing the build over.
const leaking = built.flatMap((item) =>
  item.files
    .filter((f) => /from\s+'\.\.?\//.test(f.content))
    .map((f) => `${item.name}: ${f.path}`)
);
if (leaking.length) {
  throw new Error(`unrewritten relative imports:\n  ${leaking.join('\n  ')}`);
}

console.log(`registry: ${built.length} items -> public/r`);
