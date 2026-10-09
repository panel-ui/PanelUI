/**
 * Writes the Blocks section of the docs: one page per block, the index, and
 * the section's meta.json.
 *
 * Runs after build-registry.mjs and reads what it wrote. A block page shows
 * the source a reader gets from `panelui-cli add` — imports already rewritten
 * to their project's aliases — so it is taken from the registry item rather
 * than from `packages/panelui/blocks`, whose imports point into the library's
 * own tree and would not compile anywhere else.
 *
 * Prose comes from blocks.json: `[name, summary, keyword, options]`, where the
 * options carry `intro`, `notes`, `preview` / `previewVideo` and `addedIn`.
 * Everything else on the page is derived, so it cannot drift from the code.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { statusOf, yamlScalar } from './page-status.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = path.join(HERE, '../public/r');
const OUT = path.join(HERE, '../content/docs/blocks');

const blocks = JSON.parse(fs.readFileSync(path.join(HERE, 'blocks.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(HERE, 'meta.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(REGISTRY, 'index.json'), 'utf8'));
const byName = new Map(index.map((item) => [item.name, item]));

const previewTag = (p) =>
  `<Preview\n  src="${p.src}"\n  alt="${p.alt}"\n  width={${p.width}}\n  height={${p.height}}${p.caption ? `\n  caption="${p.caption}"` : ''}\n/>`;

const previewVideoTag = (p) =>
  `<PreviewVideo\n  src="${p.src}"${p.poster ? `\n  poster="${p.poster}"` : ''}\n  alt="${p.alt}"\n  width={${p.width}}\n  height={${p.height}}${p.caption ? `\n  caption="${p.caption}"` : ''}\n/>`;

/** The one component a block file exports, which is what a reader renders. */
function exportedBlock(slug, content) {
  const names = [...content.matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
  if (names.length !== 1 || !names[0].endsWith('Block')) {
    throw new Error(
      `${slug}: a block file exports exactly one function, named <Name>Block — found ${names.join(', ') || 'none'}`
    );
  }
  return names[0];
}

/**
 * The components a block is built from, linked to their pages.
 *
 * Only the documented ones: the primitives and utilities a component pulls in
 * (text, portal, cn…) are installed with it, but listing them here would bury
 * the six things the block is actually made of under the plumbing.
 */
function builtFrom(item) {
  return item.registryDependencies
    .filter((name) => meta[name] && byName.get(name)?.docsPath)
    .map((name) => ({ name, title: meta[name][3]?.title ?? meta[name][0] }))
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(({ name, title }) => `- [${title}](/docs/${byName.get(name).docsPath})`)
    .join('\n');
}

fs.mkdirSync(OUT, { recursive: true });

const written = [];

for (const [slug, entry] of Object.entries(blocks)) {
  const [title, summary, , options = {}] = entry;
  const item = JSON.parse(fs.readFileSync(path.join(REGISTRY, `${slug}.json`), 'utf8'));
  if (item.type !== 'registry:block') throw new Error(`${slug}: registry item is not a block`);
  if (byName.get(slug)?.docsPath !== `blocks/${slug}`) {
    throw new Error(`${slug}: the registry index does not route this block to blocks/${slug}`);
  }

  const [file] = item.files;
  if (file.content.includes('```')) throw new Error(`${slug}: source contains a code fence`);
  const component = exportedBlock(slug, file.content);
  const status = statusOf(options);
  const target = file.path.replace(/^ui\//, 'components/ui/');

  const sections = [
    `---\ntitle: ${yamlScalar(title)}\ndescription: ${yamlScalar(summary)}${status ? `\nstatus: ${status}` : ''}\n---`,
  ];

  if (options.previewVideo) sections.push(previewVideoTag(options.previewVideo));
  else if (options.preview) sections.push(previewTag(options.preview));

  if (!options.intro) throw new Error(`${slug}: blocks.json has no intro`);
  sections.push(options.intro);

  const dependencies = item.dependencies.length
    ? ` It also installs ${item.dependencies.map((dep) => `\`${dep}\``).join(', ')} if the project does not have ${item.dependencies.length === 1 ? 'it' : 'them'}.`
    : '';

  sections.push(`## Installation

Blocks are not part of the npm package. The CLI copies the file into your project, and from then on it is yours to edit.

\`\`\`bash
npx panelui-cli@latest add ${slug}
\`\`\`

That writes \`${target}\`, plus every component it is built from that the project does not already have.${dependencies}`);

  sections.push(`## Usage

A block is a whole screen. Render it as the only child of a route, and pass \`onBack\` if the screen should show a back button.

\`\`\`tsx title="app/${slug}.tsx"
import { router } from 'expo-router';
import { ${component} } from '@/components/ui/blocks/${slug}';

export default function Screen() {
  return <${component} onBack={router.back} />;
}
\`\`\`

The sample data is a set of typed constants at the top of the file. Replace them with your own, or turn them into props.`);

  const parts = builtFrom(item);
  if (parts) sections.push(`## Built from\n\n${parts}`);

  if (options.notes) sections.push(`## Notes\n\n${options.notes}`);

  sections.push(`## Source\n\n\`\`\`tsx title="${target}"\n${file.content.trimEnd()}\n\`\`\``);

  fs.writeFileSync(path.join(OUT, `${slug}.mdx`), sections.join('\n\n') + '\n');
  written.push(slug);
}

const slugs = Object.keys(blocks);

const list = slugs
  .map((slug) => `- [${blocks[slug][0]}](/docs/blocks/${slug}) — ${blocks[slug][1]}`)
  .join('\n');

fs.writeFileSync(
  path.join(OUT, 'index.mdx'),
  `---
title: Blocks
description: Whole screens built from PanelUI components, copied into your project with the CLI.
---

A block is a complete screen — a boarding pass, a wallet, an onboarding flow — composed from the components in this library. It is a starting point to copy and change, not a component to configure: it has no props beyond \`onBack\` and \`className\`, and its sample data sits at the top of the file.

Blocks are installed with the CLI and are not part of the npm package. Each one brings the components it is built from, so it works in a project that has none of them yet.

\`\`\`bash
npx panelui-cli@latest add <block>
\`\`\`

${list || 'There are no blocks yet.'}
`
);

fs.writeFileSync(
  path.join(OUT, 'meta.json'),
  JSON.stringify({ title: 'Blocks', pages: ['index', ...slugs] }, null, 2) + '\n'
);

// A page left behind by a removed block is deleted rather than kept in a
// section that no longer lists it.
const keep = new Set([...slugs.map((slug) => `${slug}.mdx`), 'index.mdx', 'meta.json']);
for (const file of fs.readdirSync(OUT)) {
  if (!keep.has(file)) fs.rmSync(path.join(OUT, file));
}

console.log(`blocks: ${written.length} pages -> content/docs/blocks`);
