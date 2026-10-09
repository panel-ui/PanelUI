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
const DOCS = path.join(HERE, '../content/docs');

const meta = JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'), 'utf8'));
const blocks = JSON.parse(fs.readFileSync(path.join(HERE, 'blocks.json'), 'utf8'));
/** Whole screens built from the components. Beside `src`, so npm never ships them. */
const BLOCKS = path.join(ROOT, 'packages/panelui/blocks');

/** Always present in an Expo app — listing them would be noise. */
const PROVIDED = new Set(['react', 'react-native']);

/**
 * Reached only through a lazy require inside a try/catch, so the component
 * works without them. Reported to the user, never installed on their behalf.
 */
const OPTIONAL = new Set([
  '@expo/ui',
  '@maplibre/maplibre-react-native',
  'expo-blur',
  'expo-clipboard',
  'expo-file-system',
  'expo-glass-effect',
  'expo-haptics',
  'expo-location',
  'react-native-keyboard-controller',
  'react-native-view-shot',
]);

/** Canonical aliases. The CLI rewrites these if the project uses others. */
const ALIAS = {
  components: '@/components/ui',
  lib: '@/lib',
  hooks: '@/hooks',
};

/**
 * The primitives, hooks and utilities are not in meta.json — that file only
 * covers documented components. Written out rather than generated, because
 * "Primitive: portal." helps nobody choose whether they want it.
 */
const SUPPORT_DESCRIPTIONS = {
  text: 'Themed text with a size, weight and muted scale. Most components build on it.',
  portal: 'Renders content above everything else. Required by every overlay.',
  'animated-pressable': 'Pressable with UI-thread press feedback.',
  'keyboard-avoider': 'View that lifts itself clear of the software keyboard.',
  scrim: 'The backdrop behind an overlay — a dim, or a blur when expo-blur is installed.',
  glass:
    'The iOS system material, drawn where it exists and a solid surface everywhere else.',
  'panel-ui-provider': 'Root provider: gesture root, themed background, portal host, toasts.',
  icons: 'The icon set, plus the colour context components use to tint them.',
  cn: 'Merges Tailwind class names, with later classes winning conflicts.',
  chart: 'Scales, monotone curves and path building. Shared by every chart.',
  'chart-accessibility': 'Speaks a chart as a list of its data, beside the drawing.',
  'finite-chart': 'Keeps non-finite data and domains out of chart geometry.',
  color: 'HSV colour arithmetic, parsing and formatting. Every function a worklet.',
  date: 'Day and month arithmetic, and locale-aware date formatting.',
  time: 'Time-of-day arithmetic, and locale-aware time formatting.',
  native: 'Optional bridge to the platform UI toolkit, behind the `native` prop.',
  haptics: 'Optional bridge to the platform haptic engine, behind the `haptics` prop.',
  'use-theme': 'Read and change the active theme.',
  'use-breakpoint': 'Responsive state derived from the window size.',
  'use-copy-to-clipboard': 'Copy text, with a temporary copied state.',
  'use-debounced-value': 'A copy of a value that settles after changes stop.',
  'use-disclosure': 'Open and closed state for an overlay.',
  'controllable-state': 'Owner-driven controlled and uncontrolled state lifecycle.',
  'use-keyboard': 'Keyboard height and visibility.',
  'use-keyboard-avoidance': 'Lift an element just clear of the software keyboard.',
  'use-previous': 'The value from the previous render.',
  collapse: 'Keeps content mounted while animating its measured height open or closed.',
  'scroll-progress':
    'Shares UI-thread scroll offset, viewport, content size and scroller position with descendants.',
  'modal-isolation-store': 'Tracks nested modal owners without releasing isolation too early.',
  'focus-restoration-store': 'Returns browser focus through nested overlays in last-opened order.',
  'use-back-handler': 'Consumes the Android hardware back press while an overlay is active.',
  'use-direction': 'Reads the nearest LTR or RTL direction, falling back to the device setting.',
  'use-reveal-progress': 'Reports how far an element has travelled through its scroll viewport.',
  'use-scroll-sections': 'Tracks the active measured section and scrolls directly to one.',
  'use-skeleton-handoff': 'Holds a placeholder through a fade as the real content arrives.',
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
  'chart',
  'registry:lib',
  [path.join(SRC, 'utils/chart.ts')],
  () => 'lib/chart.ts',
  () => `${ALIAS.lib}/chart`
);

register(
  'color',
  'registry:lib',
  [path.join(SRC, 'utils/color.ts')],
  () => 'lib/color.ts',
  () => `${ALIAS.lib}/color`
);

register(
  'date',
  'registry:lib',
  [path.join(SRC, 'utils/date.ts')],
  () => 'lib/date.ts',
  () => `${ALIAS.lib}/date`
);

register(
  'time',
  'registry:lib',
  [path.join(SRC, 'utils/time.ts')],
  () => 'lib/time.ts',
  () => `${ALIAS.lib}/time`
);

register(
  'haptics',
  'registry:lib',
  [path.join(SRC, 'utils/haptics.ts')],
  () => 'lib/haptics.ts',
  () => `${ALIAS.lib}/haptics`
);

// `native-host.tsx` rides with the bridge rather than standing on its own:
// it is the bridge's only React component, and nothing imports one without
// the other.
register(
  'native',
  'registry:lib',
  [path.join(SRC, 'native/index.ts'), path.join(SRC, 'native/native-host.tsx')],
  (f) => (path.basename(f) === 'index.ts' ? 'lib/native.ts' : `lib/${path.basename(f)}`),
  (f) =>
    path.basename(f) === 'index.ts'
      ? `${ALIAS.lib}/native`
      : `${ALIAS.lib}/${path.basename(f).replace(/\.tsx$/, '')}`
);

for (const file of fs.readdirSync(path.join(SRC, 'hooks')).sort()) {
  // index.ts is a barrel; copying it would force all seven hooks on someone
  // who wanted one.
  if (!/^use-.*\.ts$/.test(file)) continue;
  const name = file.replace(/\.ts$/, '');
  const sourceFiles = [path.join(SRC, 'hooks', file)];
  if (name === 'use-breakpoint') {
    sourceFiles.unshift(path.join(SRC, 'hooks', 'breakpoint-contract.ts'));
  }
  register(
    name,
    'registry:hook',
    sourceFiles,
    (source) => `hooks/${path.basename(source)}`,
    (source) => `${ALIAS.hooks}/${path.basename(source).replace(/\.ts$/, '')}`
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

/*
 * Blocks: whole screens composed from the components, copy-in only.
 *
 * Registered last so a block can never take a name a component already has —
 * `add <name>` has to mean one thing. The files land under `ui/blocks/`, which
 * every published CLI already routes to the components alias; a block needs
 * nothing from the CLI that a component does not.
 *
 * Every file in the folder needs an entry in blocks.json and every entry needs
 * a file, so a block cannot ship without its docs page or be documented
 * without existing.
 */
const blockFiles = fs.existsSync(BLOCKS)
  ? fs.readdirSync(BLOCKS).filter((file) => /\.tsx$/.test(file)).map((file) => file.replace(/\.tsx$/, ''))
  : [];
for (const slug of blockFiles) {
  if (!blocks[slug]) throw new Error(`packages/panelui/blocks/${slug}.tsx has no entry in blocks.json`);
}
for (const slug of Object.keys(blocks)) {
  if (!blockFiles.includes(slug)) {
    throw new Error(`blocks.json lists ${slug}, but packages/panelui/blocks/${slug}.tsx does not exist`);
  }
  if (items.has(slug)) throw new Error(`${slug}: a block cannot share a name with another registry item`);
  register(
    slug,
    'registry:block',
    [path.join(BLOCKS, `${slug}.tsx`)],
    () => `ui/blocks/${slug}.tsx`,
    () => `${ALIAS.components}/blocks/${slug}`
  );
}

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

  const [, description] = (item.type === 'registry:block' ? blocks[name] : meta[name]) ?? [];

  built.push({
    name,
    type: item.type,
    description: description ?? descriptionFor(name),
    registryDependencies: [...registryDependencies].sort(),
    dependencies: [...dependencies].sort(),
    optionalDependencies: [...optionalDependencies].sort(),
    files,
  });
}

function descriptionFor(name) {
  return SUPPORT_DESCRIPTIONS[name] ?? `${name}.`;
}

function discoveryFor(name, type) {
  if (type === 'registry:block') {
    const options = blocks[name]?.[3] ?? {};
    return {
      kind: 'block',
      group: 'blocks',
      stability: options.alpha ? 'alpha' : options.beta ? 'beta' : 'stable',
    };
  }
  const options = meta[name]?.[3] ?? {};
  const group =
    options.group ??
    (type === 'registry:hook'
      ? 'hooks'
      : type === 'registry:lib'
        ? 'utilities'
        : type === 'registry:theme'
          ? 'theme'
          : 'components');
  return {
    kind: group === 'charts' ? 'chart' : type.replace('registry:', ''),
    group,
    stability: options.alpha ? 'alpha' : options.beta ? 'beta' : 'stable',
  };
}

/** The markdown route for an item, but only when that page actually exists. */
function docsPathFor(name, type) {
  // Written by gen-blocks.mjs, which runs after this and reads what it wrote —
  // so the page cannot be checked for here, and gen-blocks fails instead if it
  // does not write one.
  if (type === 'registry:block') return `blocks/${name}`;

  const entry = meta[name];
  const group = entry
    ? (entry[3]?.group ?? 'components')
    : type === 'registry:hook'
      ? 'hooks'
      : type === 'registry:lib'
        ? 'utilities'
        : null;
  if (!group) return undefined;

  const docsPath = `${group}/${name}`;
  if (fs.existsSync(path.join(DOCS, `${docsPath}.mdx`))) return docsPath;

  // Every meta entry promises a generated page. A stale group must fail the
  // registry build rather than ship a route that the MCP will trust and 404.
  if (entry) throw new Error(`${name}: documentation page ${docsPath}.mdx does not exist`);
  return undefined;
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

const placeholders = built.filter((item) => item.description === `${item.name}.`);
if (placeholders.length) {
  throw new Error(
    `placeholder registry descriptions: ${placeholders.map((item) => item.name).join(', ')}`
  );
}

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
      .map(({ name, type, description, registryDependencies }) => {
        const docsPath = docsPathFor(name, type);
        return {
          name,
          type,
          ...discoveryFor(name, type),
          description,
          registryDependencies,
          ...(docsPath ? { docsPath } : {}),
        };
      })
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
