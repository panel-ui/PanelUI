import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = resolve(root, 'package.json');
const json = JSON.parse(readFileSync(packagePath, 'utf8'));
const rootBarrel = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
const hookBarrel = readFileSync(resolve(root, 'src/hooks/index.ts'), 'utf8');

const conditions = (source, output, declaration) => ({
  types: `./lib/typescript/src/${declaration}`,
  'react-native': `./src/${source}`,
  default: `./lib/module/${output}`,
});

const components = readdirSync(resolve(root, 'src/components'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
for (const name of components) {
  if (!existsSync(resolve(root, `src/components/${name}/index.tsx`))) {
    throw new Error(`Component subpath has no index.tsx: ${name}`);
  }
  if (!rootBarrel.includes(`from './components/${name}'`)) {
    throw new Error(`Component subpath is not root-public: ${name}`);
  }
}

const hooks = readdirSync(resolve(root, 'src/hooks'))
  .filter((name) => name.startsWith('use-') && name.endsWith('.ts'))
  .map((name) => name.slice(0, -3))
  .sort();
for (const name of hooks) {
  const barrel = name === 'use-direction' ? rootBarrel : hookBarrel;
  const source = name === 'use-direction' ? './components/direction' : `./${name}`;
  if (!barrel.includes(`from '${source}'`)) {
    throw new Error(`Hook subpath is not root-public: ${name}`);
  }
}

// Leaf modules are eligible only when their file is imported by the root
// barrel and does not carry private siblings behind a wildcard.
const leaves = [
  ['./provider', 'providers/panel-ui-provider.tsx'],
  ['./theme', 'theme/use-theme.ts'],
  // The two an app reaches for first once it is importing by subpath rather
  // than from the root, and the two whose absence sent it back to the root.
  ['./icons', 'icons/index.tsx'],
  ['./primitives/text', 'primitives/text.tsx'],
  ['./primitives/animated-pressable', 'primitives/animated-pressable.tsx'],
  ['./primitives/glass', 'primitives/glass.tsx'],
  ['./primitives/keyboard-avoider', 'primitives/keyboard-avoider.tsx'],
  ['./primitives/portal', 'primitives/portal.tsx'],
  ['./primitives/scrim', 'primitives/scrim.tsx'],
  ['./primitives/scroll-progress', 'primitives/scroll-progress.tsx'],
  // Types only. A component's ref and its event types are named here, so a
  // wrapper can type them without importing the root entry.
  ['./primitives/refs', 'primitives/refs.ts'],
  ['./utils/cn', 'utils/cn.ts'],
  ['./utils/color', 'utils/color.ts'],
  ['./utils/time', 'utils/time.ts'],
];

const generated = {
  './components/*': conditions(
    'components/*/index.tsx',
    'components/*/index.js',
    'components/*/index.d.ts'
  ),
  './hooks/*': conditions('hooks/*.ts', 'hooks/*.js', 'hooks/*.d.ts'),
};

for (const [subpath, source] of leaves) {
  const stem = source.replace(/\.tsx?$/, '');
  // A directory is imported by its name, not by its `index` — `./icons`, not
  // `./icons/index` — so that is the specifier the barrel is searched for.
  const specifier = stem.replace(/\/index$/, '');
  if (!existsSync(resolve(root, `src/${source}`))) throw new Error(`Missing ${source}`);
  if (!rootBarrel.includes(`from './${specifier}'`)) {
    throw new Error(`Leaf subpath is not root-public: ${subpath}`);
  }
  if (generated[subpath]) throw new Error(`Duplicate subpath: ${subpath}`);
  generated[subpath] = conditions(source, `${stem}.js`, `${stem}.d.ts`);
}

const managed = (key) =>
  key === './components/*' ||
  key === './hooks/*' ||
  key === './provider' ||
  key === './theme' ||
  key === './icons' ||
  key.startsWith('./primitives/') ||
  key.startsWith('./utils/');
const actual = Object.fromEntries(Object.entries(json.exports).filter(([key]) => managed(key)));

if (process.argv.includes('--write')) {
  const unmanaged = Object.fromEntries(Object.entries(json.exports).filter(([key]) => !managed(key)));
  json.exports = { '.': unmanaged['.'], ...generated };
  for (const [key, value] of Object.entries(unmanaged)) {
    if (key !== '.') json.exports[key] = value;
  }
  writeFileSync(packagePath, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`Generated ${components.length + hooks.length + leaves.length} subpaths.`);
} else if (JSON.stringify(actual) !== JSON.stringify(generated)) {
  throw new Error('Package subpath exports have drifted; run npm run generate:subpaths.');
} else {
  console.log(`Verified ${components.length + hooks.length + leaves.length} subpaths.`);
}
