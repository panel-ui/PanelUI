/**
 * The web collection's registry and docs, checked against the source they are
 * generated from.
 *
 * The generators guarantee most of this by construction. These are the parts
 * that only go wrong quietly: a copied file that still reaches back into the
 * package, a demo whose shown source would not compile in a reader's project,
 * a component with a page and no registry item.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const docs = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(docs, file), 'utf8');
const meta = JSON.parse(read('scripts/web-meta.json'));
const slugs = Object.keys(meta).sort();
const item = (slug) => JSON.parse(read(`public/r/web/${slug}.json`));
const pageOf = (slug) =>
  `content/docs/web/${meta[slug][3]?.category === 'charts' ? 'charts' : 'components'}/${slug}.mdx`;

test('every component has an item, a page and a usage module', () => {
  for (const slug of slugs) {
    assert.ok(fs.existsSync(path.join(docs, `public/r/web/${slug}.json`)), `${slug}: registry item`);
    assert.ok(fs.existsSync(path.join(docs, pageOf(slug))), `${slug}: page`);
    assert.ok(fs.existsSync(path.join(docs, `scripts/web-usage/${slug}.json`)), `${slug}: usage`);
  }
});

test('a chart in the app is a chart on the web', () => {
  const app = JSON.parse(read('scripts/meta.json'));
  for (const slug of slugs) {
    if (app[slug]?.[3]?.group !== 'charts') continue;
    assert.equal(meta[slug][3]?.category, 'charts', `${slug}: web-meta.json category`);
  }
});

test('a copied file reaches nothing outside the project it lands in', () => {
  for (const slug of slugs) {
    for (const file of item(slug).files) {
      assert.match(file.target, /^@components\/panelui\//, `${slug}: ${file.target}`);
      // Whatever was `../` in the package has to have become an alias.
      assert.doesNotMatch(file.content, /from\s*['"]\.\.\//, `${slug}: ${file.path} still imports ../`);
      assert.doesNotMatch(file.content, /panelui-web/, `${slug}: ${file.path} imports the package`);
    }
  }
});

test('items address their own registry by URL and the official one by name', () => {
  for (const slug of slugs) {
    for (const dependency of item(slug).registryDependencies) {
      assert.ok(
        dependency === 'utils' || /^https:\/\/panelui\.dev\/r\/web\/[a-z0-9-]+\.json$/.test(dependency),
        `${slug}: unexpected registry dependency ${dependency}`
      );
    }
  }
});

test('the index lists every item and carries no file contents', () => {
  const index = JSON.parse(read('public/r/web/registry.json'));
  assert.deepEqual(index.items.map((entry) => entry.name).sort(), slugs);
  for (const entry of index.items) {
    for (const file of entry.files) assert.equal(file.content, undefined, `${entry.name}: index has contents`);
  }
});

test('demos import the package, and pages show the path a project has', () => {
  for (const slug of slugs) {
    const directory = path.join(docs, 'components/web-demos', slug);
    const demos = fs.readdirSync(directory).filter((file) => file.endsWith('.tsx'));
    assert.ok(demos.length > 0, `${slug} has no demos`);
    for (const demo of demos) {
      const source = fs.readFileSync(path.join(directory, demo), 'utf8');
      assert.match(source, /export default function /, `${slug}/${demo} needs a default export`);
      assert.match(source, /from 'panelui-web\/[a-z0-9-]+'/, `${slug}/${demo} must import the package`);
    }
    const page = read(pageOf(slug));
    assert.doesNotMatch(page, /from ['"]panelui-web\//, `${slug}: page shows a package import in code`);
    assert.match(page, /@\/components\/panelui\//, `${slug}: page does not show the copied path`);
  }
});

test('demos are built from panelui-web, never from the docs site\'s own ui folder', () => {
  // A page copies its demo's source onto the screen, so a component imported
  // from the site's `@/components/ui` reads as one the package provides, and
  // a reader who installs the package finds it missing.
  const root = path.join(docs, 'components/web-demos');
  const walk = (directory) =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]
    );
  for (const file of walk(root).filter((name) => name.endsWith('.tsx'))) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(
      source,
      /from ['"]@\/components\/ui\//,
      `${path.relative(root, file)} imports from @/components/ui; use the panelui-web component`
    );
  }
});

test('every demo a page names is in the generated map', () => {
  const map = read('components/web-demos/index.generated.tsx');
  for (const slug of slugs) {
    const page = read(pageOf(slug));
    for (const [, name] of page.matchAll(/<ComponentPreview name="([^"]+)"/g)) {
      assert.ok(map.includes(`'${name}': dynamic(`), `${name} is shown but not in the map`);
    }
  }
});

test('the skill has a reference for every component and for nothing else', () => {
  const skill = path.resolve(docs, '../../skills/panelui-web');
  const pages = fs
    .readdirSync(path.join(skill, 'components'))
    .map((file) => file.replace(/\.md$/, ''))
    .sort();
  assert.deepEqual(pages, slugs);
  const index = fs.readFileSync(path.join(skill, 'components.md'), 'utf8');
  for (const slug of slugs) {
    assert.match(index, new RegExp(`\\(components/${slug}\\.md\\)`), `${slug}: listed in components.md`);
    const page = fs.readFileSync(path.join(skill, 'components', `${slug}.md`), 'utf8');
    assert.match(page, new RegExp(`from "@/components/panelui/${slug}"`), `${slug}: import line`);
    // The worked example is shown the way a project imports it, never the package's own path.
    assert.doesNotMatch(page, /from ['"]panelui-web\//, `${slug}: example imports the package`);
  }
});

test('the skill manifest carries the package version', () => {
  const version = JSON.parse(read('../../packages/web/package.json')).version;
  const manifest = read('../../skills/panelui-web/SKILL.md');
  assert.match(manifest, new RegExp(`^  version: ${version.replaceAll('.', '\\.')}$`, 'm'));
});

test('every component has a thumb for the index, and the index shows the gallery', () => {
  for (const slug of slugs) {
    assert.ok(
      fs.existsSync(path.join(docs, `components/web-demos/${slug}/thumb.tsx`)),
      `${slug}: thumb demo`
    );
  }
  assert.match(read('content/docs/web/components/index.mdx'), /<WebComponentGallery \/>/);
});

/*
 * The site is built on Vercel from `apps/docs`, and an install run from there
 * brings only what the docs app depends on, directly or through a workspace
 * it names. The pages import the web components' source by path, so that
 * source's own imports have to arrive the same way. CI installs every
 * workspace from the root and cannot see one that is missing: the first
 * deploy of the web collection failed on exactly this, with every check green.
 */
test('the docs app can install what the web components import', () => {
  const web = path.resolve(docs, '../../packages/web');
  const webPackage = JSON.parse(fs.readFileSync(path.join(web, 'package.json'), 'utf8'));
  const docsPackage = JSON.parse(read('package.json'));

  assert.ok(
    docsPackage.dependencies?.['panelui-web'],
    'apps/docs must depend on panelui-web: its pages import that source, and Vercel installs from apps/docs'
  );

  // And the package says everything its source reaches for, so naming the package is enough.
  const declared = new Set([
    ...Object.keys(webPackage.dependencies ?? {}),
    ...Object.keys(webPackage.peerDependencies ?? {}),
  ]);
  const sources = fs
    .readdirSync(path.join(web, 'src'), { recursive: true })
    .filter((file) => /\.tsx?$/.test(String(file)));
  for (const file of sources) {
    const source = fs.readFileSync(path.join(web, 'src', String(file)), 'utf8');
    for (const [, specifier] of source.matchAll(/from\s+['"]([^'".][^'"]*)['"]/g)) {
      // `@scope/name/sub/path` and `name/sub/path` both belong to the package before the sub path.
      const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
      assert.ok(declared.has(name), `${file} imports ${specifier}, which packages/web/package.json does not declare`);
    }
  }
});
