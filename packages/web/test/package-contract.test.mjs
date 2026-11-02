/**
 * What has to stay true of the web package's source for both ways of shipping
 * it to work: the built package, and the items the shadcn CLI copies.
 *
 * Read as text rather than imported. The files are TSX, and the questions are
 * about how they are written, not what they do.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const components = path.join(root, 'src/components');
const slugs = fs
  .readdirSync(components, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const sourcesOf = (slug) =>
  fs
    .readdirSync(path.join(components, slug))
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => ({ file, source: fs.readFileSync(path.join(components, slug, file), 'utf8') }));

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g;

test('there is at least one component, each with an entry', () => {
  assert.ok(slugs.length > 0);
  for (const slug of slugs) {
    assert.ok(fs.existsSync(path.join(components, slug, 'index.tsx')), `${slug}/index.tsx`);
  }
});

test('an entry that holds state or handles events is a client module', () => {
  // Without the directive a Server Component that imports one fails at build,
  // in the reader's project. One that needs neither is left as it is, so it
  // can be rendered on the server and costs the page no JavaScript.
  const CLIENT_ONLY =
    /\buse(?:State|Effect|LayoutEffect|Ref|Memo|Callback|Context|Id|ImperativeHandle|Reducer|SyncExternalStore|Render)\(|\bcreateContext\(|\bon[A-Z]\w*=\{/;
  let server = 0;
  for (const slug of slugs) {
    const entry = fs.readFileSync(path.join(components, slug, 'index.tsx'), 'utf8');
    const directive = /^'use client';\n/.test(entry);
    if (CLIENT_ONLY.test(entry)) {
      assert.ok(directive, `${slug}/index.tsx uses state or events and must start with 'use client'`);
    } else {
      assert.ok(!directive, `${slug}/index.tsx needs no 'use client' and should not have one`);
      server += 1;
    }
  }
  // StatStrip is the one that is not, and the test should notice if the
  // pattern above stops recognising client code altogether.
  assert.ok(server < slugs.length, 'no component was recognised as a client module');
});

test('a compound client component also exports its parts by name', () => {
  // `Planet.Globe` cannot be read off a client module from a Server
  // Component. `PlanetGlobe` can, so every dotted part needs a named twin.
  for (const slug of slugs) {
    const entry = fs.readFileSync(path.join(components, slug, 'index.tsx'), 'utf8');
    const assigned = /export const (\w+) = Object\.assign\(\w+, \{([\s\S]*?)\n\}\)/.exec(entry);
    if (!assigned) continue;
    const [, name, body] = assigned;
    for (const [, part] of body.matchAll(/^\s*(\w+):/gm)) {
      const exported = new RegExp(`export \\{[^}]*\\b${name}${part}\\b[^}]*\\}`).test(entry);
      assert.ok(exported, `${slug}: ${name}.${part} has no named export ${name}${part}`);
    }
  }
});

test('relative imports are ones both the build and the registry can follow', () => {
  // `../../lib/cn`, a sibling component, or a file in the same folder. Anything
  // else is completed by neither `scripts/build.mjs` nor the registry builder.
  const allowed = [/^\.\.\/\.\.\/lib\/cn$/, /^\.\.\/[a-z0-9-]+$/, /^\.\/[a-z0-9-]+$/];
  for (const slug of slugs) {
    for (const { file, source } of sourcesOf(slug)) {
      for (const [, specifier] of source.matchAll(IMPORT)) {
        if (!specifier.startsWith('.')) continue;
        assert.ok(
          allowed.some((pattern) => pattern.test(specifier)),
          `${slug}/${file}: '${specifier}' is not an import the build can complete`
        );
      }
    }
  }
});

test('a sibling component that is imported exists', () => {
  for (const slug of slugs) {
    for (const { file, source } of sourcesOf(slug)) {
      for (const [, specifier] of source.matchAll(IMPORT)) {
        const sibling = /^\.\.\/([a-z0-9-]+)$/.exec(specifier)?.[1];
        if (sibling) assert.ok(slugs.includes(sibling), `${slug}/${file} imports missing ${sibling}`);
      }
    }
  }
});

test('the root entry exports every component', () => {
  const index = fs.readFileSync(path.join(root, 'src/index.ts'), 'utf8');
  for (const slug of slugs) {
    assert.ok(index.includes(`'./components/${slug}'`), `src/index.ts does not export ${slug}`);
  }
});

test('every npm import is a declared dependency', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  const packageOf = (specifier) =>
    specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];

  for (const slug of slugs) {
    for (const { file, source } of sourcesOf(slug)) {
      for (const [, specifier] of source.matchAll(IMPORT)) {
        if (specifier.startsWith('.')) continue;
        assert.ok(
          declared.has(packageOf(specifier)),
          `${slug}/${file} imports ${specifier}, which package.json does not declare`
        );
      }
    }
  }
});

test('the package is side-effect free and resolves one entry per component', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.sideEffects, false);
  assert.equal(manifest.type, 'module');
  assert.deepEqual(manifest.exports['./*'], {
    types: './dist/components/*/index.d.ts',
    default: './dist/components/*/index.js',
  });
});
