/**
 * Publishes the agent skill: copies `skills/` into `public/skills/` and writes
 * the discovery index's data to `lib/skills.generated.json`.
 *
 * The skill has existed in this repository since it was written, and until now
 * the only way to get it was to clone the repository — which an agent that has
 * just discovered the domain cannot do. Copying it under `public/` puts it on
 * the site at a URL, and the index at `/.well-known/agent-skills/index.json`
 * is what points at that URL.
 *
 * The digest is the reason this is generated rather than hand-written. The
 * discovery format asks for a SHA-256 of each artifact so a client can tell
 * whether the copy it cached is still the copy being served, and a hash written
 * by hand is wrong the first time anybody edits the file it describes.
 * `components.md` in particular is itself generated, from `meta.json`, on every
 * `docs:generate` — so its hash changes whenever a component is added.
 *
 * Runs in the `docs:generate` chain and in `prebuild`, so the deployed site
 * cannot serve an index whose digests disagree with its files.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(HERE, '..');
const ROOT = path.resolve(DOCS, '../..');

const SOURCE = path.join(ROOT, 'skills');
const PUBLIC = path.join(DOCS, 'public', 'skills');
const INDEX = path.join(DOCS, 'lib', 'skills.generated.json');

/**
 * Everything that is part of a skill. Anything else in the folder is not copied.
 * TypeScript is included because a skill can ship code an agent copies into a
 * project — the Apparatus kit and its examples — and an agent that found the
 * skill by URL has no other way to fetch it.
 */
const EXTENSIONS = new Set(['.md', '.json', '.txt', '.ts', '.tsx']);

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(source, target);
    else if (EXTENSIONS.has(path.extname(entry.name))) fs.copyFileSync(source, target);
  }
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/**
 * The skill's own frontmatter is the description, rather than a second one
 * written here that would drift from it.
 */
function describe(file) {
  const text = fs.readFileSync(file, 'utf8');
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return '';
  const description = frontmatter[1].match(/^description:\s*(.+)$/m);
  return description ? description[1].trim() : '';
}

if (!fs.existsSync(SOURCE)) {
  console.error(`skills: nothing at ${SOURCE}`);
  process.exit(1);
}

fs.rmSync(PUBLIC, { recursive: true, force: true });
copyTree(SOURCE, PUBLIC);

const skills = [];
for (const entry of fs.readdirSync(SOURCE, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const manifest = path.join(SOURCE, entry.name, 'SKILL.md');
  if (!fs.existsSync(manifest)) continue;

  skills.push({
    name: entry.name,
    type: 'skill-md',
    description: describe(manifest),
    // Relative; the route makes it absolute against the site's own origin, so
    // a preview deploy points at itself rather than at production.
    path: `/skills/${entry.name}/SKILL.md`,
    digest: `sha256:${sha256(manifest)}`,
  });
}

fs.writeFileSync(INDEX, JSON.stringify(skills, null, 2) + '\n');
console.log(
  `skills: ${skills.length} -> public/skills, lib/skills.generated.json`
);
