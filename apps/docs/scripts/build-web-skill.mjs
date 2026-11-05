/**
 * Writes the component half of the web collection's agent skill:
 *
 * - `skills/panelui-web/components.md` — the index, every component with a
 *   line on what it is and a link to its reference.
 * - `skills/panelui-web/components/<slug>.md` — one reference per component:
 *   the import line, when to use it, the parts, every prop with its type,
 *   default and documentation, the notes from its docs page, and its lead demo
 *   as a worked example.
 *
 * It is generated from the same three things the docs pages are: the props
 * read off the TypeScript, `web-usage/<slug>.json`, and the demos. A skill
 * that names a prop a component does not have is worse than no skill, and a
 * hand-written list is wrong by the next change.
 *
 * `SKILL.md`, `setup.md` and `theming.md` beside them are written by hand.
 * This stamps the package's version into the manifest and touches nothing
 * else in it.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WEB_TARGET } from './build-web-registry.mjs';
import { demoSource, readWebApi } from './web-source.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SKILL = path.join(ROOT, 'skills/panelui-web');
const PAGES = path.join(SKILL, 'components');

const meta = JSON.parse(fs.readFileSync(path.join(HERE, 'web-meta.json'), 'utf8'));
const api = readWebApi();

const SECTIONS = {
  actions: 'Actions',
  forms: 'Forms and input',
  overlays: 'Overlays',
  navigation: 'Navigation',
  layout: 'Layout and structure',
  data: 'Data',
  feedback: 'Feedback and status',
  media: 'Media and motion',
  ai: 'AI components',
};

const titleOf = (entry) => entry[3]?.title ?? entry[0];
const usageOf = (slug) =>
  JSON.parse(fs.readFileSync(path.join(HERE, 'web-usage', `${slug}.json`), 'utf8'));

/** A table cell cannot hold a pipe or a line break, and a prop's type is full of the first. */
const cell = (text) =>
  String(text ?? '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();

function propsTable(entry, iface) {
  const fields = iface.fields.filter((field) => field.name !== 'children');
  if (fields.length === 0) return '';
  const own = entry.byInterface?.[iface.name];
  const rows = fields.map((field) => {
    const value = own ? (own[field.name] ?? entry.variantDefaults?.[field.name]) : entry.defaults?.[field.name];
    const fallback = value !== undefined ? `\`${cell(value)}\`` : field.optional ? '—' : '**required**';
    return `| \`${field.name}\` | \`${cell(field.type)}\` | ${fallback} | ${cell(field.doc) || '—'} |`;
  });
  return `#### \`${iface.name}\`\n\n| Prop | Type | Default | What it does |\n| --- | --- | --- | --- |\n${rows.join('\n')}`;
}

function page(slug) {
  const entry = api[slug];
  const [name, summary] = meta[slug];
  const use = usageOf(slug);
  const names = [name, ...(use.extraImports ?? [])].join(', ');

  const out = [`# ${titleOf(meta[slug])}`, summary];
  out.push(
    `\`\`\`tsx\nimport { ${names} } from "@/components/${WEB_TARGET}/${slug}"\n\`\`\`\n\nFrom npm the path is \`panelui-web/${slug}\`. Install with \`npx shadcn@latest add @panelui/${slug}\`.`
  );
  if (use.intro) out.push(`## When to use it\n\n${use.intro}`);
  if (use.usage) out.push(`## Usage\n\n\`\`\`tsx\n${use.usage}\n\`\`\``);
  if (use.anatomy) {
    const parts = Object.entries(use.parts ?? {}).map(([part, text]) => `- \`${name}.${part}\` — ${text}`);
    out.push(`## Parts\n\n\`\`\`tsx\n${use.anatomy}\n\`\`\`${parts.length ? `\n\n${parts.join('\n')}` : ''}`);
  }

  const tables = entry.interfaces.map((iface) => propsTable(entry, iface)).filter(Boolean);
  if (tables.length > 0) {
    out.push(
      `## Props\n\n${use.propsNote ?? 'Every part also takes the props of the element it renders, and a `className`.'}\n\n${tables.join('\n\n')}`
    );
  }

  const source = fs.readFileSync(path.join(ROOT, 'packages/web/src/components', slug, 'index.tsx'), 'utf8');
  if (entry.parts.length > 0 && source.startsWith("'use client'")) {
    out.push(
      `## In a Server Component\n\n\`${name}\` is a client component. A Server Component cannot read \`${name}.${entry.parts[0]}\` off the import, so import each part by name: ${entry.parts.map((part) => `\`${name}${part}\``).join(', ')}.`
    );
  }
  // The docs page's notes, one level down so they sit under this file's own heading.
  if (use.notes) out.push(`## Notes\n\n${use.notes.replace(/^### /gm, '#### ')}`);
  if (use.demo) out.push(`## Example\n\n\`\`\`tsx\n${demoSource(`${slug}/${use.demo}`)}\n\`\`\``);

  return `${out.join('\n\n')}\n`;
}

const slugs = Object.keys(meta).sort((a, b) => titleOf(meta[a]).localeCompare(titleOf(meta[b])));

fs.rmSync(PAGES, { recursive: true, force: true });
fs.mkdirSync(PAGES, { recursive: true });
for (const slug of slugs) {
  if (!api[slug]) throw new Error(`web skill: no source found for ${slug}`);
  fs.writeFileSync(path.join(PAGES, `${slug}.md`), page(slug));
}

const sections = Object.entries(SECTIONS)
  .map(([category, heading]) => {
    const rows = slugs
      .filter((slug) => (meta[slug][3]?.category ?? 'layout') === category)
      .map((slug) => `- [${titleOf(meta[slug])}](components/${slug}.md) — ${meta[slug][1]}`);
    return rows.length ? `## ${heading}\n\n${rows.join('\n')}` : null;
  })
  .filter(Boolean);

fs.writeFileSync(
  path.join(SKILL, 'components.md'),
  `# Components\n\nGenerated from the collection's source. Read a component's own file before using it: the props in it are the real ones.\n\n${sections.join('\n\n')}\n`
);

/* The manifest's version is the package's. Nothing else in it is touched. */
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/web/package.json'), 'utf8')).version;
const manifest = path.join(SKILL, 'SKILL.md');
const text = fs.readFileSync(manifest, 'utf8');
const stamped = text.replace(/^(  version: ).*$/m, `$1${version}`);
if (stamped !== text) fs.writeFileSync(manifest, stamped);

console.log(`web skill: ${slugs.length} components -> skills/panelui-web (v${version})`);
