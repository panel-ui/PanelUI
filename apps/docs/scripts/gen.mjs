import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadUsage } from './load-usage.mjs';
import { LIFECYCLE_CASES, loadLifecycleMatrices } from '../../../scripts/lifecycle-matrices.mjs';

/**
 * A summary as a YAML scalar the frontmatter parser will accept.
 *
 * A plain scalar ends at the first `: `, so a perfectly ordinary summary — "A
 * prompt composer: a field that grows" — turns the rest of the line into a
 * mapping key and fails the whole build. It fails at `next build` rather than
 * here, which is after the drift check has already passed and, at release
 * time, after the tag exists.
 *
 * Quoted only when it has to be, so the frontmatter of the other pages does
 * not churn.
 */
function yamlScalar(value) {
  const unsafe = /^[-?:,[\]{}#&*!|>'"%@`]|: |:$| #/.test(value);
  return unsafe ? JSON.stringify(value) : value;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Repo root, three levels up from apps/docs/scripts. */
const ROOT = path.resolve(HERE, '../../..');
const lifecycleMatrices = loadLifecycleMatrices(ROOT);

const S = HERE;
const api = JSON.parse(fs.readFileSync(`${S}/api.json`, 'utf8'));
const meta = JSON.parse(fs.readFileSync(`${S}/meta.json`, 'utf8'));
for (const slug of Object.keys(lifecycleMatrices)) {
  if (!meta[slug]) throw new Error(`lifecycle matrix has no component metadata: ${slug}`);
}
const usage = loadUsage(path.join(S, 'usage'), Object.keys(meta));
const contentDir = path.join(HERE, '../content/docs');

/** Where a component's page goes, and what its sidebar group is called. */
const GROUPS = {
  components: 'Components',
  charts: 'Charts',
  'ai-components': 'AI Components',
  form: 'Form',
};
const DEFAULT_GROUP = 'components';

/**
 * The sections of the components index, in the order it prints them, each with
 * the sentence that goes under its heading.
 *
 * A component's section comes from the `category` in its meta.json options —
 * except for the charts and the AI components, which already say what they are
 * through their group and would only be saying it twice.
 */
const CATEGORIES = {
  actions: ['Actions', 'The things a screen can be told to do, and the controls that ask.'],
  forms: ['Forms and input', 'Everything that takes a value from someone and hands it back typed.'],
  overlays: ['Overlays', 'Surfaces that arrive over the page and leave again.'],
  navigation: ['Navigation', 'Moving between places, and showing where you are in them.'],
  layout: ['Layout and structure', 'The surfaces the rest of it sits on.'],
  data: ['Data', 'Rows, sequences and numbers, laid out to be read.'],
  charts: ['Charts', 'Series drawn on the UI thread, one file each, no chart library.'],
  feedback: ['Feedback and status', 'Saying what happened, what is happening, and what is missing.'],
  media: ['Media and motion', 'Pictures, conversation and things that move.'],
  ai: ['AI components', 'The parts an assistant interface is built from.'],
};

/** Which section of the index a component belongs in. */
function categoryOf(entry) {
  const group = groupOf(entry);
  if (group === 'charts') return 'charts';
  if (group === 'ai-components') return 'ai';
  return entry[3]?.category ?? 'layout';
}

/** The version being documented, for the sidebar dots below. */
const libVersion = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'packages/panelui/package.json'), 'utf8')
).version;

/**
 * How many minor releases a mark survives, per mark.
 *
 * Deriving this from a version rather than hand-writing a `status` field means
 * nobody has to remember to take the badge off — which is the failure mode
 * every "new" marker has, and the reason half of them end up permanent.
 *
 * The two are not on the same schedule, because they are not the same news. A
 * component arriving is worth knowing about for a while, whoever you are, so
 * `new` runs for three. A component *changing* is only worth knowing about if
 * you already have it and have not upgraded yet, and that audience has moved on
 * by the next release — so `updated` runs for one, and is gone the moment
 * anything else ships. Held for three it was on so many rows at once that it
 * stopped pointing at anything.
 */
const BADGE_FOR_MINORS = { new: 3, updated: 1 };

/** True while `version` is recent enough to still be worth marking. */
function isRecent(version, mark) {
  if (!version) return false;
  const [thenMajor, thenMinor] = version.split('.').map(Number);
  const [major, minor] = libVersion.split('.').map(Number);
  if (major !== thenMajor) return major < thenMajor;
  return minor - thenMinor < BADGE_FOR_MINORS[mark];
}

/**
 * Which dot a component gets, if any.
 *
 * `addedIn` wins over `updatedIn`: a component that arrived and then changed
 * inside the same window is still news, and two marks on one row is noise.
 * `updatedIn` is bumped by hand when a component's API changes, and forgetting
 * to clear it costs nothing — it clears itself at the next release.
 */
function statusOf({ alpha, beta, addedIn, updatedIn }) {
  // `alpha` and `beta` win and never expire: they state how settled the API
  // is, not which release it landed in, so they come off the page when someone
  // decides it has settled and not a version sooner. Alpha outranks beta so a
  // half-finished promotion reads as the more cautious of the two.
  if (alpha) return 'alpha';
  if (beta) return 'beta';
  if (isRecent(addedIn, 'new')) return 'new';
  if (isRecent(updatedIn, 'updated')) return 'updated';
  return null;
}

/** Options are an optional 4th element, so the common entry stays a triple. */
const optionsOf = (entry) => entry[3] ?? {};
const groupOf = (entry) => optionsOf(entry).group ?? DEFAULT_GROUP;
/*
 * What a reader sees the component called, which is not what they type.
 *
 * A meta entry's first field is the *identifier*: the page's import statement
 * is built from it and so is every compound part name, so it has to stay
 * something that can appear in a `.tsx` file. `title` is the label, for the one
 * component whose name reads better than its identifier writes. Defaulting to
 * the identifier is why every other entry needs nothing.
 */
const titleOf = (entry) => optionsOf(entry).title ?? entry[0];

for (const group of Object.keys(GROUPS)) {
  fs.mkdirSync(path.join(contentDir, group), { recursive: true });
}

const esc = (s) => String(s).replace(/\|/g, '\\|');
const inlineCode = (s) => '`' + String(s).replace(/`/g, '') + '`';

/**
 * A framed screenshot. Used both for the page's own preview, under the intro,
 * and for an example that is easier shown than described.
 */
const previewTag = (p) =>
  `<Preview\n  src="${p.src}"\n  alt="${p.alt}"\n  width={${p.width}}\n  height={${p.height}}${p.caption ? `\n  caption="${p.caption}"` : ''}\n/>`;

/**
 * A framed screen recording, for a component whose point is that it moves —
 * a still of a sweep is a still of nothing.
 */
const previewVideoTag = (p) =>
  `<PreviewVideo\n  src="${p.src}"${p.poster ? `\n  poster="${p.poster}"` : ''}\n  alt="${p.alt}"\n  width={${p.width}}\n  height={${p.height}}${p.caption ? `\n  caption="${p.caption}"` : ''}\n/>`;

/**
 * A labelled schematic of the component's structure, drawn once for a dark
 * page and once for a light one.
 *
 * Not a `Preview`: that frames a portrait shot of a device and holds it narrow,
 * which is right for a screenshot and wrong for a wide diagram whose whole job
 * is to be read.
 */
const diagramTag = (d) =>
  `<Diagram\n  src="${d.src}"\n  srcLight="${d.srcLight}"\n  alt="${d.alt}"\n  width={${d.width}}\n  height={${d.height}}${d.caption ? `\n  caption="${d.caption}"` : ''}\n/>`;

/**
 * The shot that sits above a worked example or version — a recording when the
 * demo moves, a screenshot when it doesn't, and nothing when neither is given.
 * Prefers `previewVideo` so a component can carry both and get the moving one.
 */
const demoMedia = (x) =>
  x.previewVideo
    ? `\n\n${previewVideoTag(x.previewVideo)}`
    : x.preview
      ? `\n\n${previewTag(x.preview)}`
      : '';

/** Props inherited from React Native, documented once rather than per row. */
const INHERITED = /^(ViewProps|TextProps|ViewProps, VariantProps|.*VariantProps.*)$/;

function propsTable(iface, defaults, byInterface = {}, variantDefaults = {}) {
  /*
   * Where an interface destructures its own props, that destructuring is the
   * whole truth: a prop missing from it has no default, and must not inherit
   * one from a sibling component that happens to use the same prop name. Only
   * an interface with no block of its own falls back to the file-wide guess.
   */
  const own = byInterface[iface.name];
  const scoped = own !== undefined;
  const rows = iface.fields
    .filter((f) => f.name !== 'children')
    .map((f) => {
      const resolved = scoped
        ? (own[f.name] ?? variantDefaults[f.name])
        : defaults[f.name];
      const def = resolved !== undefined ? inlineCode(resolved) : '—';
      return `| ${inlineCode(f.name)} | ${inlineCode(esc(f.type))} | ${def} | ${esc(f.doc || '')} |`;
    });
  if (!rows.length) return null;
  return ['| Prop | Type | Default | Description |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

let count = 0;
for (const [slug, entry] of Object.entries(meta)) {
  const [name, summary, keyword] = entry;
  const options = optionsOf(entry);
  const c = api[slug];
  if (!c) { console.error('missing api for', slug); continue; }
  const u = usage[slug] ?? {};
  const lifecycle = lifecycleMatrices[slug];

  const parts = c.parts.length ? c.parts.map((p) => `${name}.${p}`) : [];
  // A single string here would spread character by character (`"useState"` →
  // `u, s, e, …`), so coerce a lone extra import up to a one-element array.
  const extra = Array.isArray(u.extraImports)
    ? u.extraImports
    : u.extraImports
      ? [u.extraImports]
      : [];
  /*
   * `extraImports` names everything a page's examples reach for, and not all of
   * it is ours. `View` and `Image` come from React Native, and putting them in
   * the `panelui-native` line was a copyable import that does not resolve —
   * which is the one thing an installation snippet must not be.
   */
  const RN_EXPORTS = new Set([
    'ActivityIndicator',
    'Alert',
    'Dimensions',
    'FlatList',
    'Image',
    'KeyboardAvoidingView',
    'Linking',
    'Platform',
    'Pressable',
    'ScrollView',
    'SectionList',
    'StyleSheet',
    'TouchableOpacity',
    'View',
  ]);
  // `Alert` is ours as well as React Native's, and where the page is about it
  // the component is the one being imported.
  const fromReactNative = extra.filter((item) => RN_EXPORTS.has(item) && item !== name);
  const imports = [name, ...extra.filter((item) => !fromReactNative.includes(item))];
  const reactNativeImport = fromReactNative.length
    ? `\nimport { ${fromReactNative.join(', ')} } from 'react-native';`
    : '';

  const sections = [];

  /*
   * A screenshot of the component running on a device, and it goes first — the
   * first thing on the page should be what the thing looks like, not a
   * paragraph about it. The title and the summary are already above it, drawn
   * from the frontmatter by the page itself, so a reader has the name and the
   * one-line description before the image and the prose after it.
   */
  const preview = u.preview
    ? previewTag(u.preview)
    : u.previewVideo
      ? previewVideoTag(u.previewVideo)
      : '';

  const status = statusOf(options);

  /*
   * The alpha and beta marks, said on the page as well as in the sidebar.
   *
   * The sidebar pill is what a reader browsing the list sees; somebody who
   * arrives from a search engine or a link never sees the sidebar entry at all,
   * and "this API is still moving" is not something to learn after building
   * against it. Only the two settled-ness marks — a `new` or `updated` dot is
   * news rather than a warning, and does not need saying twice.
   */
  const MATURITY = {
    alpha: 'Alpha — the API is still moving. Expect it to change in a minor release.',
    beta: 'Beta — the API has settled, but has not seen enough use to promise it will not move again.',
  };
  const maturity = MATURITY[status]
    ? `<Callout type="warn">${MATURITY[status]}</Callout>`
    : '';

  /*
   * The maturity warning stays above the image. It is the one thing on the page
   * a reader is worse off for meeting late, and at one line it costs the
   * preview almost nothing.
   */
  const lede = [maturity, preview, u.intro ?? summary].filter(Boolean).join('\n\n');

  sections.push(`---
title: ${titleOf(entry)}
description: ${yamlScalar(summary)}${status ? `\nstatus: ${status}` : ''}
---

${lede}

## Installation

${name} ships with the library — no separate install.

\`\`\`tsx
import { ${imports.join(', ')} } from 'panelui-native';${reactNativeImport}
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

${u.partNotes ?? parts.map((p) => `- **\`${p}\`** — ${u.parts?.[p.split('.')[1]] ?? 'See props below.'}`).join('\n')}${
  /*
   * Diagrams land here, under the parts they name, rather than at the top of
   * the page. The shot above the fold is of the component running; a labelled
   * schematic answers a different question, and it only answers it next to the
   * list of names it is labelling.
   */
  u.diagrams?.length ? `\n\n${u.diagrams.map(diagramTag).join('\n\n')}` : ''
}`);
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
  demoMedia(ex),
  `\n\n\`\`\`tsx\n${ex.code}\n\`\`\``,
].join('')).join('\n\n')}`);
  }

  /*
   * The full-screen demos in the example app, written out with their code.
   *
   * A component whose behaviour only shows at full height is listed on its own
   * screen there rather than rendered inline — and until now the docs said
   * nothing about any of them, so the one place a reader could find out what a
   * version *is* was to install the example app and go looking. Each entry is
   * the same demo, described and with the code you would write for it.
   */
  if (u.versions?.length) {
    sections.push(`## Versions

${u.versions.map((v) => [
  `### ${v.title}`,
  v.description ? `\n\n${v.description}` : '',
  demoMedia(v),
  `\n\n\`\`\`tsx\n${v.code}\n\`\`\``,
].join('')).join('\n\n')}`);
  }

  if (lifecycle) {
    const evidence = lifecycle.evidence
      .map((item) => `${inlineCode(item.file)} (${item.tests.length} tests)`)
      .join(', ');
    sections.push(`## Lifecycle contract

| Case | Contract |
| --- | --- |
${LIFECYCLE_CASES.map((key) => `| ${key} | ${esc(lifecycle.cases[key])} |`).join('\n')}

Executable evidence: ${evidence}.`);
  }

  /*
   * `tv()` variant keys are an implementation detail, and only some of them
   * are public props on the root. A key can be internal state the component
   * derives for itself, or a prop that belongs to a compound part rather than
   * the root — documenting either as `<Name key="value">` sends readers to
   * write something that does not exist. STATE_KEYS covers the ones every
   * component names the same way; `hideVariants` in its usage module covers the rest.
   */
  const STATE_KEYS = ['checked', 'disabled', 'completed', 'isDisabled', 'active', 'selected'];
  const hidden = new Set([...STATE_KEYS, ...(u.hideVariants ?? [])]);
  /*
   * The other direction: a variant prop the `tv()` does not carry. Loader
   * picks an animation from `variant`, and not one of the nine values is a
   * class name — so there is nothing for the parser to find, and the values a
   * reader most needs listed are the ones it cannot list. `extraVariants`
   * declares them by hand, after which they behave like any other key.
   */
  const declared = { ...c.variants, ...(u.extraVariants ?? {}) };
  const variantKeys = Object.entries(declared).filter(
    ([k]) => !['true', 'false'].includes(k) && !hidden.has(k)
  );
  if (variantKeys.length) {
    sections.push(`## Variants

${variantKeys.map(([k, opts]) => {
  // A `tv()` default arrives bare; one read off the component's own
  // destructuring still has the quotes it was written with.
  const def = String(c.defaults[k] ?? '').replace(/^'(.*)'$/, '$1');
  const list = opts.map((o) => `- \`${o}\`${def === o ? ' *(default)*' : ''}`).join('\n');
  // A snippet under every variant key, so the list is copy-pasteable rather
  // than something you have to translate into JSX yourself.
  // A boolean variant is written the way JSX takes it — the bare prop, or
  // `{false}` — rather than as the string it would not accept.
  const attr = (o) =>
    o === 'true' ? k : o === 'false' ? `${k}={false}` : `${k}="${o}"`;
  const snippet = u.variantCode?.[k]
    ?? opts.map((o) => `<${name} ${attr(o)}>…</${name}>`).join('\n');
  // Recordings or shots of individual variant values, each captioned with the
  // value it shows — for the keys where the difference is easier seen than read.
  const media = (u.variantMedia?.[k] ?? []).map(demoMedia).join('');
  return `### \`${k}\`\n\n${list}${media}\n\n\`\`\`tsx\n${snippet}\n\`\`\``;
}).join('\n\n')}`);
  }

  const tables = c.interfaces
    .map((i) => ({
      i,
      t: propsTable(i, c.defaults, c.byInterface ?? {}, c.variantDefaults ?? {}),
    }))
    .filter((x) => x.t);
  if (tables.length) {
    sections.push(`## API Reference

${tables.map(({ i, t }) => {
  const label = i.name.replace(/Props$/, '');
  // A name starting with the component's is assumed to be a compound part —
  // `FooBarProps` is `Foo.Bar`. Not always true: a sibling exported in its own
  // right shares the prefix without being a part of it, so `interfaceNames`
  // lets the component's usage module name those itself.
  const inferred = label === name ? name : `${name}.${label.replace(new RegExp('^' + name), '')}`;
  const heading = u.interfaceNames?.[i.name] ?? inferred;
  return `### ${heading.replace(/\.$/, '')}\n\n${t}`;
}).join('\n\n')}

Every part also accepts the underlying React Native props (\`ViewProps\` or \`TextProps\`) and a \`className\` for Tailwind utilities.`);
  }

  if (u.notes) sections.push(`## Notes\n\n${u.notes}`);

  fs.writeFileSync(
    path.join(contentDir, groupOf(entry), `${slug}.mdx`),
    sections.join('\n\n') + '\n'
  );
  count++;
}

/*
 * One meta.json per group, listing only the slugs in it. Written from the same
 * source as the pages, so a component cannot be filed in one place and listed
 * in another — and a page left behind by a regroup is deleted rather than
 * quietly kept in the sidebar.
 *
 * Sorted by the name the sidebar actually prints, not by the slug and not by
 * the order the entries happen to sit in meta.json. Read from the file's order
 * the list was alphabetical only for as long as everyone remembered to insert
 * rather than append, which is not a thing anyone remembers — and the two
 * places a component is listed disagreed as a result, since the landing page
 * has always sorted its own copy.
 */
/*
 * The components index at /docs/components — every component the library has,
 * as a card with a picture of the shape it makes.
 *
 * Generated for the same reason the pages are: a hand-written index of a
 * hundred links is a list that is wrong by the next release, and this is the
 * page a reader lands on to find out whether the thing they want exists.
 *
 * The page itself is one line, because the grid is a React component —
 * `components/component-gallery.tsx` — reading this same meta.json. The
 * sections, their headings and the wireframe for each component live there,
 * with the markup that draws them; emitting a hundred and sixteen cards of MDX
 * from here would put the layout in one file and the pictures in another.
 */
const indexPage = [
  /*
   * `full` because the grid is the page and the page has no prose headings for
   * a table of contents to list — the section headings are rendered by the
   * gallery component, which the MDX pipeline never sees. Without it the
   * layout still reserves the column, and four cards sit beside a strip of
   * nothing.
   */
  `---
title: Components
description: Every component module in PanelUI, by what it is for — ${Object.keys(meta).length} component modules, each with its anatomy, props and variants.
full: true
---`,
  `All ${Object.keys(meta).length} component modules, grouped by the job they do. Every page covers the ` +
    `anatomy, every prop and every variant, read straight from the library's TypeScript so it ` +
    `cannot drift from the code.`,
  '<ComponentGallery />',
].join('\n\n');

fs.writeFileSync(path.join(contentDir, 'components', 'index.mdx'), indexPage + '\n');

for (const [group, title] of Object.entries(GROUPS)) {
  const pages = Object.entries(meta)
    .filter(([, entry]) => groupOf(entry) === group)
    .sort(([, a], [, b]) => titleOf(a).localeCompare(titleOf(b)))
    .map(([slug]) => slug);

  /*
   * The components index is filed under Sections in the sidebar, beside the
   * other pages that orient somebody rather than document one thing — see the
   * root meta.json, which names it directly. `!index` is the exclude marker:
   * without it the folder's own index is prepended when `...components` is
   * expanded at the root, and the page appears twice.
   */
  const listed = group === 'components' ? ['!index', ...pages] : pages;

  const dir = path.join(contentDir, group);
  fs.writeFileSync(
    path.join(dir, 'meta.json'),
    JSON.stringify({ title, pages: listed }, null, 2) + '\n'
  );

  // `listed` can carry fumadocs' `!` exclude marker, which is a statement
  // about the sidebar rather than about the file — the page is still written
  // and still has a URL, so stripping the marker here is what stops the
  // cleanup below deleting the file it was just told to write.
  const keep = new Set([
    ...listed.map((slug) => `${slug.replace(/^!/, '')}.mdx`),
    'meta.json',
  ]);
  for (const file of fs.readdirSync(dir)) {
    if (!keep.has(file)) fs.rmSync(path.join(dir, file));
  }
}
console.log('wrote', count, 'component pages and the index');
