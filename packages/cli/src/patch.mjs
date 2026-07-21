/**
 * Edits to files the project owns — the CSS entry and the Metro config.
 *
 * Every one of these shows what it would add and asks first. Silently
 * rewriting a config someone wrote is not a convenience.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { aliasToDir } from './config.mjs';
import { confirm, dim, printAddition, step, success, warn } from './ui.mjs';

/**
 * The CSS entry Uniwind compiles.
 *
 * `@source` is the load-bearing line: it tells Uniwind which directories to
 * scan for class names. Without it every component installs cleanly, imports
 * correctly, type-checks — and renders completely unstyled, which is a
 * miserable thing to debug.
 */
export async function patchCss(cwd, config, { assumeYes, dryRun }) {
  const cssPath = path.join(cwd, config.css ?? 'global.css');
  const exists = fs.existsSync(cssPath);
  const current = exists ? fs.readFileSync(cssPath, 'utf8') : '';

  const sourceDirs = [
    ...new Set(
      Object.values(config.aliases ?? {})
        .map(aliasToDir)
        // Scan the top-level directory rather than the leaf, so a later
        // `add` that creates a sibling folder is covered without re-running.
        .map((dir) => `./${dir.split('/')[0]}`)
    ),
  ];

  const wanted = [
    `@import 'tailwindcss';`,
    `@import 'uniwind';`,
    `@import './${config.theme ?? 'theme.css'}';`,
    ...sourceDirs.map((dir) => `@source '${dir}';`),
  ];

  const missing = wanted.filter((line) => !current.includes(line.replace(/;$/, '')));
  if (!missing.length) {
    success(`${path.basename(cssPath)} already set up`);
    return;
  }

  step(`${exists ? 'Update' : 'Create'} ${path.relative(cwd, cssPath)}`);
  printAddition(path.relative(cwd, cssPath), missing);

  if (dryRun) return;
  if (!(await confirm('Apply?', { assumeYes }))) {
    warn('Skipped. Add those lines yourself, or components will render unstyled.');
    return;
  }

  const next = exists ? `${missing.join('\n')}\n\n${current}` : `${missing.join('\n')}\n`;
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  fs.writeFileSync(cssPath, next);
  success(`Wrote ${path.relative(cwd, cssPath)}`);
}

const METRO_TEMPLATE = `const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './%CSS%',
  // Named themes must be registered here or setTheme() throws.
  extraThemes: ['moon', 'moon-dark', 'grass', 'grass-dark'],
});
`;

/**
 * Metro has to know about the CSS entry and the extra themes.
 *
 * An existing config is never rewritten — the shapes people have are too
 * varied to edit safely, and getting it wrong breaks their bundler. It prints
 * what to change instead.
 */
export async function patchMetro(cwd, config, { assumeYes, dryRun }) {
  const metroPath = path.join(cwd, 'metro.config.js');
  const css = config.css ?? 'global.css';

  if (!fs.existsSync(metroPath)) {
    const contents = METRO_TEMPLATE.replace('%CSS%', css);
    step('Create metro.config.js');
    printAddition('metro.config.js', contents.trimEnd().split('\n'));

    if (dryRun) return;
    if (!(await confirm('Apply?', { assumeYes }))) return;

    fs.writeFileSync(metroPath, contents);
    success('Wrote metro.config.js');
    return;
  }

  const current = fs.readFileSync(metroPath, 'utf8');
  if (current.includes('withUniwindConfig')) {
    success('metro.config.js already wraps withUniwindConfig');
    return;
  }

  warn('metro.config.js exists but does not use Uniwind — leaving it alone.');
  console.log(
    dim(
      [
        '  Wrap your exported config yourself:',
        '',
        "    const { withUniwindConfig } = require('uniwind/metro');",
        '',
        '    module.exports = withUniwindConfig(config, {',
        `      cssEntryFile: './${css}',`,
        "      extraThemes: ['moon', 'moon-dark', 'grass', 'grass-dark'],",
        '    });',
      ].join('\n')
    )
  );
}

/**
 * TypeScript setup: the `@/` alias and the ambient declarations.
 *
 * Two things a fresh Expo app does not have, and both fail confusingly:
 *
 * - `expo/tsconfig.base` only maps `@/*` in some templates, so an alias import
 *   is "Cannot find module '@/lib/cn'" in a blank one.
 * - `className` is not a React Native prop. Uniwind adds it through
 *   `uniwind/types`, and without that ambient import every component is a wall
 *   of "Property 'className' does not exist".
 */
export async function patchTypeScript(cwd, config, { assumeYes, dryRun }) {
  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    warn('No tsconfig.json — skipping TypeScript setup.');
    return;
  }

  const declarations = [
    ['uniwind-env.d.ts', "import 'uniwind/types';\n"],
    ['css.d.ts', "declare module '*.css';\n"],
  ].filter(([file]) => !fs.existsSync(path.join(cwd, file)));

  const raw = fs.readFileSync(tsconfigPath, 'utf8');
  // Deliberately not a full JSONC parser — tsconfig commonly has comments, and
  // if this cannot read it cleanly it says so rather than mangling the file.
  let tsconfig = null;
  try {
    tsconfig = JSON.parse(raw);
  } catch {
    warn('tsconfig.json has comments or trailing commas — not editing it.');
  }

  const aliasPrefix = (config.aliases?.components ?? '@/components/ui').split('/')[0];
  const wildcard = `${aliasPrefix}/*`;
  const needsPaths =
    tsconfig !== null && !tsconfig.compilerOptions?.paths?.[wildcard];

  if (!declarations.length && !needsPaths) {
    success('TypeScript already set up');
    return;
  }

  step('TypeScript setup');
  if (needsPaths) {
    printAddition('tsconfig.json', [`"paths": { "${wildcard}": ["./*"] }`]);
  }
  for (const [file, content] of declarations) {
    printAddition(file, content.trimEnd().split('\n'));
  }

  if (dryRun) return;
  if (!(await confirm('Apply?', { assumeYes }))) {
    warn('Skipped. Alias imports and className will not type-check.');
    return;
  }

  if (needsPaths) {
    tsconfig.compilerOptions = tsconfig.compilerOptions ?? {};
    tsconfig.compilerOptions.paths = {
      ...tsconfig.compilerOptions.paths,
      [wildcard]: ['./*'],
    };
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
    success('Updated tsconfig.json');
  }

  for (const [file, content] of declarations) {
    fs.writeFileSync(path.join(cwd, file), content);
    success(`Wrote ${file}`);
  }
}

/** Which package manager the project uses, from its lockfile. */
export function detectPackageManager(cwd) {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';
  return 'npm';
}

/**
 * Installs through `expo install` where possible — it picks versions that
 * match the project's SDK, which plain `npm install` does not.
 */
export async function installDependencies(cwd, packages, { assumeYes, dryRun, isExpo }) {
  if (!packages.length) return;

  const manager = detectPackageManager(cwd);
  const command = isExpo
    ? `npx expo install ${packages.join(' ')}`
    : `${manager} ${manager === 'npm' ? 'install' : 'add'} ${packages.join(' ')}`;

  step(`Install ${packages.length} package${packages.length === 1 ? '' : 's'}`);
  console.log(dim(`  ${command}\n`));

  if (dryRun) return;
  if (!(await confirm('Run it?', { assumeYes }))) {
    warn('Skipped. Install them before building.');
    return;
  }

  const [bin, ...args] = command.split(' ');
  const result = spawnSync(bin, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.status !== 0) {
    warn('Install failed. Run the command above yourself.');
    return;
  }

  success('Dependencies installed');
}
