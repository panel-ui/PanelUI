import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Repo root, three levels up from apps/docs/scripts. */
const ROOT = path.resolve(HERE, '../../..');

const root = path.join(ROOT, 'packages/panelui/src/components');
const out = {};

for (const dir of fs.readdirSync(root).sort()) {
  const file = path.join(root, dir, 'index.tsx');
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');

  // Exported prop interfaces, with each field's JSDoc.
  const interfaces = [];
  const re = /export interface (\w+Props)([^{]*)\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(src))) {
    const [, name, ext, body] = m;
    const fields = [];
    const lines = body.split('\n');
    let doc = [];
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('/**') || t.startsWith('*') || t.startsWith('/*')) {
        const c = t.replace(/^\/\*\*?|^\*\/?|\*\/$/g, '').trim();
        if (c.startsWith('@deprecated')) doc.push('**Deprecated.** ' + c.replace('@deprecated', '').trim());
        else if (c && !c.startsWith('@')) doc.push(c);
        continue;
      }
      const f = t.match(/^(\w+)(\?)?:\s*(.+?);?$/);
      if (f) {
        fields.push({ name: f[1], optional: !!f[2], type: f[3].replace(/;$/, ''), doc: doc.join(' ') });
        doc = [];
      } else if (t === '') { /* keep doc */ } else { doc = []; }
    }
    interfaces.push({ name, extends: ext.replace(/extends/, '').trim().replace(/\s+/g, ' '), fields });
  }

  // tv() variant keys and their options.
  const variants = {};
  const vBlock = src.match(/variants:\s*\{([\s\S]*?)\n  \},\n(?:  compoundVariants|  defaultVariants)/);
  if (vBlock) {
    const vre = /^    (\w+):\s*\{/gm;
    let vm;
    while ((vm = vre.exec(vBlock[1]))) {
      const start = vre.lastIndex;
      let depth = 1, i = start;
      while (depth > 0 && i < vBlock[1].length) {
        if (vBlock[1][i] === '{') depth++;
        else if (vBlock[1][i] === '}') depth--;
        i++;
      }
      const inner = vBlock[1].slice(start, i - 1);
      const opts = [...inner.matchAll(/^      '?([\w-]+)'?:/gm)].map((x) => x[1]);
      if (opts.length) variants[vm[1]] = opts;
    }
  }

  // Defaults.
  const dBlock = src.match(/defaultVariants:\s*\{([\s\S]*?)\}/);
  const defaults = {};
  if (dBlock) {
    for (const dm of dBlock[1].matchAll(/(\w+):\s*'?([\w-]+)'?/g)) defaults[dm[1]] = dm[2];
  }

  // Compound parts.
  const parts = [];
  const oa = src.match(/Object\.assign\(\w+,\s*\{([\s\S]*?)\n\}\)/);
  if (oa) for (const pm of oa[1].matchAll(/^\s*(\w+):/gm)) parts.push(pm[1]);

  // Header doc comment.
  const header = src.match(/^\/\*\*([\s\S]*?)\*\//);
  const summary = header
    ? header[1].split('\n').map((l) => l.replace(/^\s*\*ction?/, '').replace(/^\s*\*ractice?/, '').replace(/^\s*\* ?/, '').trim())
        .filter(Boolean).join('\n')
    : '';

  out[dir] = { interfaces, variants, defaults, parts, summary };
}

fs.writeFileSync(path.join(HERE, 'api.json'), JSON.stringify(out, null, 2));
console.log('components:', Object.keys(out).length);
for (const [k, v] of Object.entries(out)) {
  console.log(k.padEnd(15), 'ifaces=' + v.interfaces.length, 'variants=' + JSON.stringify(v.variants).slice(0, 90), 'parts=' + v.parts.join(','));
}
