import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { promisify } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const exec = promisify(execFile);

test('component and hook subpaths cover every public source module', async () => {
  assert.deepEqual(json.exports['./components/*'], {
    types: './lib/typescript/src/components/*/index.d.ts',
    'react-native': './src/components/*/index.tsx',
    default: './lib/module/components/*/index.js',
  });
  assert.deepEqual(json.exports['./hooks/*'], {
    types: './lib/typescript/src/hooks/*.d.ts',
    'react-native': './src/hooks/*.ts',
    default: './lib/module/hooks/*.js',
  });

  const componentNames = (await readdir(resolve(root, 'src/components'), {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const rootBarrel = await readFile(resolve(root, 'src/index.ts'), 'utf8');
  for (const name of componentNames) {
    assert.match(rootBarrel, new RegExp(`from './components/${name}'`), name);
  }

  // A hook is a `use-` module. Anything else in the folder supports one —
  // `breakpoint-contract` is the type the breakpoint hook is configured with —
  // and is reached through the hook that uses it, not on its own.
  const hookNames = (await readdir(resolve(root, 'src/hooks')))
    .filter((name) => name.startsWith('use-') && name.endsWith('.ts'))
    .map((name) => name.slice(0, -3))
    .sort();
  const hookBarrel = await readFile(resolve(root, 'src/hooks/index.ts'), 'utf8');
  for (const name of hookNames) {
    if (name === 'use-direction') {
      assert.match(rootBarrel, /from '.\/components\/direction'/, name);
    } else {
      assert.match(hookBarrel, new RegExp(`from './${name}'`), name);
    }
  }
});

test('only root-public utilities receive subpaths', () => {
  const utilityNames = Object.keys(json.exports)
    .filter((key) => key.startsWith('./utils/'))
    .map((key) => key.slice('./utils/'.length))
    .sort();
  assert.deepEqual(utilityNames, ['cn', 'color', 'time']);

  for (const name of utilityNames) {
    assert.deepEqual(json.exports[`./utils/${name}`], {
      types: `./lib/typescript/src/utils/${name}.d.ts`,
      'react-native': `./src/utils/${name}.ts`,
      default: `./lib/module/utils/${name}.js`,
    });
  }
});

test('reviewed provider, theme and foundation leaves have exact conditions', () => {
  const leaves = {
    provider: 'providers/panel-ui-provider.tsx',
    theme: 'theme/use-theme.ts',
    'primitives/animated-pressable': 'primitives/animated-pressable.tsx',
    'primitives/glass': 'primitives/glass.tsx',
    'primitives/keyboard-avoider': 'primitives/keyboard-avoider.tsx',
    'primitives/portal': 'primitives/portal.tsx',
    'primitives/scrim': 'primitives/scrim.tsx',
    'primitives/scroll-progress': 'primitives/scroll-progress.tsx',
    'primitives/refs': 'primitives/refs.ts',
  };
  for (const [name, source] of Object.entries(leaves)) {
    const stem = source.replace(/\.tsx?$/, '');
    assert.deepEqual(json.exports[`./${name}`], {
      types: `./lib/typescript/src/${stem}.d.ts`,
      'react-native': `./src/${source}`,
      default: `./lib/module/${stem}.js`,
    });
  }
  assert.ok(json.exports['./components/*'], 'Meter and Planner use the component pattern');
});

test('generated subpaths are current', async () => {
  await exec(process.execPath, ['scripts/generate-subpath-exports.mjs'], { cwd: root });
});
