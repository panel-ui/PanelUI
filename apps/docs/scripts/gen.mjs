import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Repo root, three levels up from apps/docs/scripts. */
const ROOT = path.resolve(HERE, '../../..');

const S = HERE;
const api = JSON.parse(fs.readFileSync(`${S}/api.json`, 'utf8'));
const meta = JSON.parse(fs.readFileSync(`${S}/meta.json`, 'utf8'));
const usage = JSON.parse(fs.readFileSync(`${S}/usage.json`, 'utf8'));
const outDir = path.join(HERE, '../content/docs/components');
fs.mkdirSync(outDir, { recursive: true });

const esc = (s) => String(s).replace(/\|/g, '\\|');
const inlineCode = (s) => '`' + String(s).replace(/`/g, '') + '`';

/**
 * A framed screenshot. Used both for the page's own preview, under the intro,
 * and for an example that is easier shown than described.
 */
const previewTag = (p) =>
  `<Preview\n  src="${p.src}"\n  alt="${p.alt}"\n  width={${p.width}}\n  height={${p.height}}${p.caption ? `\n  caption="${p.caption}"` : ''}\n/>`;

/** Props inherited from React Native, documented once rather than per row. */
const INHERITED = /^(ViewProps|TextProps|ViewProps, VariantProps|.*VariantProps.*)$/;

function propsTable(iface, defaults) {
  const rows = iface.fields
    .filter((f) => f.name !== 'children')
    .map((f) => {
      const def = defaults[f.name] !== undefined ? inlineCode(defaults[f.name]) : '—';
      return `| ${inlineCode(f.name)} | ${inlineCode(esc(f.type))} | ${def} | ${esc(f.doc || '')} |`;
    });
  if (!rows.length) return null;
  return ['| Prop | Type | Default | Description |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

let count = 0;
for (const [slug, [name, summary, keyword]] of Object.entries(meta)) {
  const c = api[slug];
  if (!c) { console.error('missing api for', slug); continue; }
  const u = usage[slug] ?? {};

  const parts = c.parts.length ? c.parts.map((p) => `${name}.${p}`) : [];
  const imports = [name, ...(u.extraImports ?? [])];

  const sections = [];

  /*
   * A screenshot of the component running on a device, directly under the
   * intro — the first thing on the page should be what the thing looks like,
   * not a paragraph about it.
   */
  const preview = u.preview ? `\n\n${previewTag(u.preview)}` : '';

  sections.push(`---
title: ${name}
description: ${summary}
---

${u.intro ?? summary}${preview}

## Installation

${name} ships with the library — no separate install.

\`\`\`tsx
import { ${imports.join(', ')} } from 'panelui-native';
\`\`\`

Or copy the source into your project, to own and edit it:

\`\`\`bash
npx panelui-cli@latest add ${slug}
\`\`\`

## Usage

\`\`\`tsx
${u.usage ?? `<${name} />`}
\`\`\``);

  if (parts.length) {
    sections.push(`## Composition

\`\`\`tsx
${u.anatomy ?? `<${name}>\n  ${parts.map((p) => `<${p}>…</${p}>`).join('\n  ')}\n</${name}>`}
\`\`\`

${u.partNotes ?? parts.map((p) => `- **\`${p}\`** — ${u.parts?.[p.split('.')[1]] ?? 'See props below.'}`).join('\n')}`);
  }

  // Worked examples, one heading each. This is the section people actually
  // read — a prop table tells you a prop exists, an example tells you what to
  // write.
  if (u.examples?.length) {
    sections.push(`## Examples

${u.examples.map((ex) => [
  `### ${ex.title}`,
  ex.description ? `\n\n${ex.description}` : '',
  // A shot of the example itself, above its code — for the ones where the
  // result is the point and the snippet is just how you get there.
  ex.preview ? `\n\n${previewTag(ex.preview)}` : '',
  `\n\n\`\`\`tsx\n${ex.code}\n\`\`\``,
].join('')).join('\n\n')}`);
  }

  const variantKeys = Object.entries(c.variants).filter(([k]) => !['true', 'false'].includes(k) && !['checked', 'disabled', 'completed', 'isDisabled'].includes(k));
  if (variantKeys.length) {
    sections.push(`## Variants

${variantKeys.map(([k, opts]) => {
  const def = c.defaults[k];
  const list = opts.map((o) => `- \`${o}\`${def === o ? ' *(default)*' : ''}`).join('\n');
  // A snippet under every variant key, so the list is copy-pasteable rather
  // than something you have to translate into JSX yourself.
  const snippet = u.variantCode?.[k]
    ?? opts.map((o) => `<${name} ${k}="${o}">…</${name}>`).join('\n');
  return `### \`${k}\`\n\n${list}\n\n\`\`\`tsx\n${snippet}\n\`\`\``;
}).join('\n\n')}`);
  }

  const tables = c.interfaces
    .map((i) => ({ i, t: propsTable(i, c.defaults) }))
    .filter((x) => x.t);
  if (tables.length) {
    sections.push(`## API Reference

${tables.map(({ i, t }) => {
  const label = i.name.replace(/Props$/, '');
  const heading = label === name ? name : `${name}.${label.replace(new RegExp('^' + name), '')}`;
  return `### ${heading.replace(/\.$/, '')}\n\n${t}`;
}).join('\n\n')}

Every part also accepts the underlying React Native props (\`ViewProps\` or \`TextProps\`) and a \`className\` for Tailwind utilities.`);
  }

  if (u.notes) sections.push(`## Notes\n\n${u.notes}`);

  fs.writeFileSync(path.join(outDir, `${slug}.mdx`), sections.join('\n\n') + '\n');
  count++;
}

fs.writeFileSync(
  path.join(outDir, 'meta.json'),
  JSON.stringify({ title: 'Components', pages: Object.keys(meta) }, null, 2) + '\n'
);
console.log('wrote', count, 'component pages');
