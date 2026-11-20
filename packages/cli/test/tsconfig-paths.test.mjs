import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  aliasSourceRoot,
  aliasToDir,
  applyAliases,
  defaultConfig,
  targetPath,
} from '../src/config.mjs';
import { diagnose } from '../src/doctor.mjs';
import { detectCssEntry, patchCss } from '../src/patch.mjs';
import { stripJsonc } from '../src/tsconfig.mjs';
import { CliError } from '../src/ui.mjs';

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panelui-cli-paths-'));
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}

function withProject(files, run) {
  const root = project(files);
  return Promise.resolve(run(root)).finally(() =>
    fs.rmSync(root, { recursive: true, force: true })
  );
}

const srcTsconfig = { compilerOptions: { paths: { '@/*': ['./src/*'] } } };
const relative = (root, file) => path.relative(root, file).split(path.sep).join('/');

test('a src/ mapping puts files under src/ and keeps the alias in imports', () =>
  withProject({ 'tsconfig.json': srcTsconfig }, (root) => {
    const config = defaultConfig();

    assert.equal(relative(root, targetPath(root, config, 'ui/button.tsx')), 'src/components/ui/button.tsx');
    assert.equal(relative(root, targetPath(root, config, 'lib/cn.ts')), 'src/lib/cn.ts');
    assert.equal(relative(root, targetPath(root, config, 'hooks/use-x.ts')), 'src/hooks/use-x.ts');

    const source = "import { Text } from '@/components/ui/text';\n";
    assert.equal(applyAliases(source, config), source);
  }));

test('a tsconfig with comments and trailing commas is read', () =>
  withProject(
    {
      'tsconfig.json': `{
  // Expo's base, plus our alias.
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    /* src layout */
    "paths": { "@/*": ["./src/*"], },
    "strict": true,
  },
  "include": ["**/*.ts", "src/**/*.tsx", "a // not a comment"],
}`,
    },
    (root) => {
      assert.equal(aliasToDir('@/components/ui', root), 'src/components/ui');
    }
  ));

test('stripJsonc leaves string contents alone', () => {
  const source = '{ "a": "http://x/*y*/", "b": [1, 2,], }';
  assert.deepEqual(JSON.parse(stripJsonc(source)), { a: 'http://x/*y*/', b: [1, 2] });
});

test('baseUrl, exact keys and the longest prefix decide the folder', () =>
  withProject(
    {
      'tsconfig.json': {
        compilerOptions: {
          baseUrl: './src',
          paths: {
            '@/*': ['*'],
            '@/lib': ['./shared/lib'],
            '@/components/*': ['./view/*'],
          },
        },
      },
    },
    (root) => {
      assert.equal(aliasToDir('@/hooks', root), 'src/hooks');
      assert.equal(aliasToDir('@/lib', root), 'src/shared/lib');
      assert.equal(aliasToDir('@/components/ui', root), 'src/view/ui');
    }
  ));

test('paths in an extended config are followed', () =>
  withProject(
    {
      'tsconfig.json': { extends: './config/tsconfig.base.json' },
      'config/tsconfig.base.json': { compilerOptions: { paths: { '~/*': ['../app/*'] } } },
    },
    (root) => {
      assert.equal(aliasToDir('~/components/ui', root), 'app/components/ui');
    }
  ));

test('without a matching mapping, the alias is a path from the project root', async () => {
  await withProject({}, (root) => {
    assert.equal(aliasToDir('@/components/ui', root), 'components/ui');
  });
  await withProject({ 'tsconfig.json': { compilerOptions: { paths: { '#/*': ['./src/*'] } } } }, (root) => {
    assert.equal(aliasToDir('@/components/ui', root), 'components/ui');
  });
  await withProject({ 'tsconfig.json': '{ not json' }, (root) => {
    assert.equal(aliasToDir('@/components/ui', root), 'components/ui');
  });
});

test('a mapping that leaves the project, or is not a plain path, is refused', async () => {
  await withProject(
    { 'tsconfig.json': { compilerOptions: { paths: { '@/*': ['../shared/*'] } } } },
    (root) => {
      assert.throws(() => aliasToDir('@/components/ui', root), CliError);
      assert.throws(() => targetPath(root, defaultConfig(), 'ui/button.tsx'), CliError);
    }
  );
  await withProject(
    { 'tsconfig.json': { compilerOptions: { paths: { '@/*': ["./src';evil/*"] } } } },
    (root) => {
      assert.throws(() => aliasToDir('@/components/ui', root), CliError);
    }
  );
});

test('the @source root is the first folder under the mapping', () =>
  withProject({ 'tsconfig.json': srcTsconfig }, (root) => {
    assert.equal(aliasSourceRoot('@/components/ui', root), 'src/components');
    assert.equal(aliasSourceRoot('@/lib', root), 'src/lib');
  }));

test('patchCss writes paths relative to a CSS entry under src/', () =>
  withProject({ 'tsconfig.json': srcTsconfig }, async (root) => {
    const config = { ...defaultConfig(), css: 'src/global.css', theme: 'src/theme.css' };
    await patchCss(root, config, { assumeYes: true, dryRun: false });

    assert.equal(
      fs.readFileSync(path.join(root, 'src/global.css'), 'utf8'),
      [
        "@import 'tailwindcss';",
        "@import 'uniwind';",
        "@import './theme.css';",
        "@source './components';",
        "@source './lib';",
        "@source './hooks';",
        '',
      ].join('\n')
    );
    assert.equal(fs.existsSync(path.join(root, 'global.css')), false);

    fs.writeFileSync(path.join(root, 'src/theme.css'), '');
    fs.writeFileSync(path.join(root, 'panelui.json'), JSON.stringify(config));
    const css = diagnose(root).checks.find((check) => check.id === 'css');
    assert.equal(css.status, 'ok', css.message);
  }));

test('detectCssEntry reads cssEntryFile from the Metro config', () =>
  withProject(
    {
      'metro.config.js': `const { withUniwindConfig } = require('uniwind/metro');
// cssEntryFile: './old.css',
module.exports = withUniwindConfig(config, { cssEntryFile: './src/global.css' });
`,
    },
    (root) => {
      assert.equal(detectCssEntry(root), 'src/global.css');
    }
  ));

test('detectCssEntry finds an existing entry, then falls back to the alias root', async () => {
  await withProject({ 'src/global.css': "@import 'tailwindcss';\n@import 'uniwind';\n" }, (root) => {
    assert.equal(detectCssEntry(root), 'src/global.css');
  });
  await withProject({ 'tsconfig.json': srcTsconfig }, (root) => {
    assert.equal(detectCssEntry(root), 'src/global.css');
  });
  await withProject({}, (root) => {
    assert.equal(detectCssEntry(root), 'global.css');
  });
  await withProject({ 'metro.config.js': "withUniwindConfig(c, { cssEntryFile: '../outside.css' })" }, (root) => {
    assert.equal(detectCssEntry(root), 'global.css');
  });
});
