import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  layoutLinkPrefetch,
  REPEATED_LAYOUT_ROUTES,
} from '../components/layout-link-policy.ts';

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(docs, file), 'utf8');

/**
 * Whitespace collapsed, so these assertions are about the destinations rather
 * than about how the file is laid out.
 *
 * They were exact source excerpts, indentation included, which meant lifting a
 * link out of the array it was written in — same type, same url, same text —
 * failed a test whose subject had not changed. What has to hold is that the
 * destination is still in the layout config, not which column it starts in.
 */
const flat = (source) => source.replace(/\s+/g, ' ');

test('layout prefetch policy covers every repeated route and preserves overrides', () => {
  assert.deepEqual([...REPEATED_LAYOUT_ROUTES], ['/', '/docs', '/docs/components']);

  for (const href of REPEATED_LAYOUT_ROUTES) {
    assert.equal(layoutLinkPrefetch(href), false, href);
    assert.equal(layoutLinkPrefetch(href, true), true, `${href} explicit true`);
  }

  assert.equal(layoutLinkPrefetch('/docs/installation'), null);
  assert.equal(layoutLinkPrefetch('https://github.com/panel-ui/PanelUI'), null);
  assert.equal(layoutLinkPrefetch('/docs/installation', false), false);
});

test('every repeated layout instance uses the shared policy', () => {
  const instances = [
    ['brand title', 'app/layout.config.tsx', "url: '/'"],
    ['Docs navigation', 'app/layout.config.tsx', "text: 'Docs', url: '/docs'"],
    /*
     * Components sits in `nav.children` rather than in `links`, because that is
     * the only slot either layout renders on the left of the bar. It is still a
     * repeated layout destination, so what has to hold is that it goes through
     * LayoutLink — not that it is written as a `links` entry.
     */
    [
      'Components navigation',
      'app/layout.config.tsx',
      '<LayoutLink\n        href="/docs/components"',
    ],
    [
      'Components mobile navigation',
      'app/layout.config.tsx',
      "text: 'Components',\n      url: '/docs/components',\n      active: 'nested-url',\n      on: 'menu'",
    ],
    [
      'Get started navigation',
      'app/layout.config.tsx',
      "text: 'Get started',\n      url: '/docs'",
    ],
    ['Docs footer', 'app/(home)/page.tsx', '<LayoutLink href="/docs"'],
    ['Components footer', 'app/(home)/page.tsx', '<LayoutLink href="/docs/components"'],
  ];

  for (const [name, file, source] of instances) {
    assert.ok(flat(read(file)).includes(flat(source)), `${name} must remain covered`);
  }

  assert.match(read('app/layout.tsx'), /components=\{\{ Link: LayoutLink \}\}/);
});

test('Components remains reachable on the home mobile menu without duplicating the docs tree', () => {
  const options = read('app/layout.config.tsx');

  assert.match(options, /export const homeOptions: BaseLayoutProps/);
  assert.match(options, /on: 'menu'/);
  assert.match(read('app/(home)/layout.tsx'), /<HomeLayout \{\.\.\.homeOptions\}>/);
  assert.match(read('app/docs/layout.tsx'), /<DocsLayout[\s\S]*\{\.\.\.baseOptions\}/);
});

test('primary content links keep Next prefetch and link behavior passes through', () => {
  const home = read('app/(home)/page.tsx');
  const hero = read('components/hero/index.tsx');
  const showcase = read('components/showcase/index.tsx');
  const layoutLink = read('components/layout-link.tsx');

  // The hero's Get Started goes through Link, not LayoutLink, so Next still
  // prefetches it. Its destination comes from the Expo / Web tab, and the
  // Expo one, shown first, is the docs home.
  assert.match(home, /<Hero \/>/);
  assert.match(hero, /<Button render=\{<Link href=\{start\} \/>\}>/);
  assert.match(hero, /value: 'expo',[\s\S]*?start: '\/docs',/);
  assert.match(showcase, /render=\{<Link href="\/docs\/components" \/>\}/);
  assert.match(home, /<Link href=\{site\.repo\}/);
  assert.match(layoutLink, /prefetch=\{layoutLinkPrefetch\(href, prefetch\)\} \{\.\.\.props\}/);
});
