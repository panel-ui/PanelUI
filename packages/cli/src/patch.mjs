/**
 * Edits to files the project owns — the CSS entry and the Metro config.
 *
 * Every one of these shows what it would add and asks first. Silently
 * rewriting a config someone wrote is not a convenience.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  aliasSourceRoot,
  aliasToDir,
  projectPath,
  validateConfigPaths,
  validateRelativePath,
} from './config.mjs';
import { readTsconfigPaths } from './tsconfig.mjs';
import { confirm, dim, fail, printAddition, step, success, warn } from './ui.mjs';

/**
 * The CSS entry Uniwind compiles.
 *
 * `@source` is the load-bearing line: it tells Uniwind which directories to
 * scan for class names. Without it every component installs cleanly, imports
 * correctly, type-checks — and renders completely unstyled, which is a
 * miserable thing to debug.
 */
export async function patchCss(cwd, config, { assumeYes, dryRun }) {
  validateConfigPaths(config, cwd);
  const cssPath = projectPath(cwd, config.css ?? 'global.css', 'CSS path');
  const exists = fs.existsSync(cssPath);
  const current = exists ? fs.readFileSync(cssPath, 'utf8') : '';
  const cssDir = path.dirname(cssPath);

  const sourceDirs = [
    ...new Set(
      Object.values(config.aliases ?? {})
        // Scan the alias's top-level directory rather than the leaf, so a
        // later `add` that creates a sibling folder is covered without
        // re-running.
        .map((alias) => aliasSourceRoot(alias, cwd))
    ),
  ];

  const legacyWanted = [
    `@import './${config.theme ?? 'theme.css'}';`,
    ...sourceDirs.map((dir) => `@source './${dir}';`),
  ];
  const wanted = [
    `@import 'tailwindcss';`,
    `@import 'uniwind';`,
    `@import '${relativeCssSpecifier(cssDir, path.join(cwd, config.theme ?? 'theme.css'))}';`,
    ...sourceDirs.map((dir) => `@source '${relativeCssSpecifier(cssDir, path.join(cwd, dir))}';`),
  ];

  const corrected = legacyWanted.reduce(
    (css, legacy, index) => css.replaceAll(legacy, wanted[index + 2]),
    current
  );
  const missing = wanted.filter((line) => !corrected.includes(line.replace(/;$/, '')));
  if (!missing.length && corrected === current) {
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

  const next = exists
    ? missing.length
      ? `${missing.join('\n')}\n\n${corrected}`
      : corrected
    : `${missing.join('\n')}\n`;
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  fs.writeFileSync(cssPath, next);
  success(`Wrote ${path.relative(cwd, cssPath)}`);
}

/** Convert a filesystem-relative target into a portable CSS module specifier. */
function relativeCssSpecifier(fromDir, targetPath) {
  const relative = path.relative(fromDir, targetPath).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

const METRO_FILES = ['metro.config.js', 'metro.config.cjs', 'metro.config.mjs', 'metro.config.ts'];
const CSS_CANDIDATES = ['global.css', 'src/global.css', 'app/global.css', 'src/app/global.css'];

/** A detected path, tidied, or null when it is not one this CLI may write to. */
function safeRelative(value) {
  const tidied = value.trim().replace(/^\.\//, '');
  try {
    return validateRelativePath(tidied, 'CSS path');
  } catch {
    return null;
  }
}

/**
 * Which file the project's CSS entry is, so `init` updates it instead of
 * creating a second one beside it.
 *
 * In order: the `cssEntryFile` the Metro config already passes to Uniwind; an
 * existing CSS file in a usual place that imports Uniwind; any existing CSS
 * file in a usual place; and finally `global.css` in the folder `@/` resolves
 * to, which is `src/` in an app laid out that way.
 */
export function detectCssEntry(cwd) {
  for (const name of METRO_FILES) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;
    const match = codeOnlyKeepingStrings(fs.readFileSync(file, 'utf8')).match(
      /\bcssEntryFile\s*:\s*(['"`])([^'"`\n]+)\1/
    );
    const found = match && safeRelative(match[2]);
    if (found) return found;
  }

  const existing = CSS_CANDIDATES.filter((file) => fs.existsSync(path.join(cwd, file)));
  const withUniwind = existing.find((file) =>
    /@import\s+['"]uniwind['"]/.test(fs.readFileSync(path.join(cwd, file), 'utf8'))
  );
  if (withUniwind ?? existing[0]) return withUniwind ?? existing[0];

  try {
    const root = aliasToDir('@/__panelui_probe__', cwd).replace(/\/?__panelui_probe__$/, '');
    return root ? `${root}/global.css` : 'global.css';
  } catch {
    return 'global.css';
  }
}

/** Blank out comments but keep string literals, so a commented-out option is not read. */
function codeOnlyKeepingStrings(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|(^|[^:'"`\\])\/\/[^\n]*/g, (match, lead) =>
    lead === undefined ? ' ' : `${lead} `
  );
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

/** Remove text that cannot participate in an exported JavaScript expression. */
function codeOnly(source) {
  let output = '';
  let state = 'code';

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];

    if (state === 'code') {
      if (char === '/' && next === '/') {
        output += '  ';
        index += 1;
        state = 'line-comment';
      } else if (char === '/' && next === '*') {
        output += '  ';
        index += 1;
        state = 'block-comment';
      } else if (char === "'" || char === '"' || char === '`') {
        output += ' ';
        state = char;
      } else {
        output += char;
      }
    } else if (state === 'line-comment') {
      output += char === '\n' ? '\n' : ' ';
      if (char === '\n') state = 'code';
    } else if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += char === '\n' ? '\n' : ' ';
      }
    } else if (char === '\\') {
      output += ' ';
      if (next !== undefined) {
        output += next === '\n' ? '\n' : ' ';
        index += 1;
      }
    } else {
      output += char === '\n' ? '\n' : ' ';
      if (char === state) state = 'code';
    }
  }

  return output;
}

/**
 * True only when the exported value itself is visibly wrapped.
 *
 * This deliberately recognises fewer shapes than a JavaScript parser could.
 * Existing Metro configs are never edited, so an unfamiliar but valid shape
 * gets safe manual instructions instead of a false claim that setup is done.
 */
export function hasWrappedMetroExport(source) {
  const code = codeOnly(source);
  const wrapperCall = String.raw`(?:\(\s*)*withUniwindConfig\s*\(`;
  const directExports = [
    new RegExp(String.raw`\bmodule\s*\.\s*exports\s*=\s*${wrapperCall}`),
    new RegExp(String.raw`\bexport\s+default\s+${wrapperCall}`),
  ];
  if (directExports.some((pattern) => pattern.test(code))) return true;

  // A named const is still conservative: it cannot be reassigned between the
  // wrapper call and the CommonJS/ESM export that refers to it.
  const namedExports = [
    /\bmodule\s*\.\s*exports\s*=\s*([A-Za-z_$][\w$]*)[ \t]*(?:;|$)/gm,
    /\bexport\s+default\s+([A-Za-z_$][\w$]*)[ \t]*(?:;|$)/gm,
  ];
  for (const pattern of namedExports) {
    for (const match of code.matchAll(pattern)) {
      const declaration = new RegExp(
        String.raw`\bconst\s+${match[1]}\s*=\s*${wrapperCall}`
      );
      if (declaration.test(code.slice(0, match.index))) return true;
    }
  }

  return false;
}

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
  if (hasWrappedMetroExport(current)) {
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

  const aliasPrefix = (config.aliases?.components ?? '@/components/ui').split('/')[0];
  const wildcard = `${aliasPrefix}/*`;
  // Read leniently (comments, trailing commas, `extends`) to learn whether the
  // alias is already mapped — to `./src/*` as readily as to `./*`.
  const mapped = Boolean(readTsconfigPaths(cwd)?.paths?.[wildcard]);

  // Writing is strict: a file with comments would lose them on the way back
  // out, so one this cannot parse plainly is reported rather than mangled.
  let tsconfig = null;
  if (!mapped) {
    try {
      tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    } catch {
      warn('tsconfig.json has comments or trailing commas — not editing it.');
    }
  }

  const needsPaths = !mapped && tsconfig !== null;

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
 * A package name, optionally scoped, optionally pinned to a version.
 *
 * Names arrive from registry JSON, and on Windows the installer has to be
 * reached through a shell because `npm` and friends are `.cmd` shims there.
 * Anything a shell would read as syntax — a space, `&`, `|`, a quote — is
 * therefore not a package name this will pass on, whatever the registry says.
 */
const PACKAGE_SPEC = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:@[a-zA-Z0-9][a-zA-Z0-9.^~*+-]*)?$/;

/** Refuse to hand the installer anything that is not plainly a package. */
function assertInstallable(packages) {
  const rejected = packages.filter((name) => typeof name !== 'string' || !PACKAGE_SPEC.test(name));
  if (rejected.length) {
    fail(
      `Refusing to install ${rejected.map((name) => JSON.stringify(name)).join(', ')}.`,
      'A registry item asked for something that is not a package name. Check the --registry you passed.'
    );
  }
}

/**
 * Installs through `expo install` where possible — it picks versions that
 * match the project's SDK, which plain `npm install` does not.
 */
export async function installDependencies(
  cwd,
  packages,
  { assumeYes, dryRun, isExpo, installAll = false }
) {
  if (!packages.length && !installAll) return;

  const manager = detectPackageManager(cwd);

  /*
   * A freshly scaffolded project already lists everything it needs, so this is
   * an install of what is written down rather than an addition to it — and it
   * goes through the package manager rather than `expo install`, which resolves
   * names against an SDK and has nothing to resolve when given none.
   */
  const argv = installAll
    ? [manager, 'install']
    : isExpo
      ? ['npx', 'expo', 'install', ...packages]
      : [manager, manager === 'npm' ? 'install' : 'add', ...packages];

  if (!installAll) assertInstallable(packages);

  step(
    installAll
      ? 'Install dependencies'
      : `Install ${packages.length} package${packages.length === 1 ? '' : 's'}`
  );
  console.log(dim(`  ${argv.join(' ')}\n`));

  if (dryRun) return;
  if (!(await confirm('Run it?', { assumeYes }))) {
    warn('Skipped. Install them before building.');
    return;
  }

  // Argument vector, never a command string: the package names came from the
  // registry, and a string would let one of them carry its own arguments.
  const [bin, ...args] = argv;
  const result = spawnSync(bin, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    fail('Dependency installation failed.', 'Run the command above yourself.');
  }

  success('Dependencies installed');
}
