/**
 * `panelui.json` — where a project says which directories it wants the copied
 * source to land in.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fail } from './ui.mjs';
import { readTsconfigPaths, resolveAliasThroughPaths } from './tsconfig.mjs';

export const CONFIG_FILE = 'panelui.json';
export const DEFAULT_REGISTRY = 'https://panelui.dev/r';

/** Aliases the registry emits. Anything else is rewritten on the way in. */
export const CANONICAL_ALIASES = {
  components: '@/components/ui',
  lib: '@/lib',
  hooks: '@/hooks',
};

export function defaultConfig(registry = DEFAULT_REGISTRY) {
  return {
    $schema: 'https://panelui.dev/schema.json',
    registry,
    aliases: { ...CANONICAL_ALIASES },
    css: 'global.css',
    theme: 'theme.css',
  };
}

export function configPath(cwd) {
  return projectPath(cwd, CONFIG_FILE, 'Configuration path');
}

export function readConfig(cwd) {
  const file = configPath(cwd);
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (cause) {
    fail(`${CONFIG_FILE} is not valid JSON.`, `Fix or delete ${file}, then run init again.`);
  }
}

export function requireConfig(cwd) {
  const config = readConfig(cwd);
  if (!config) {
    fail(
      `No ${CONFIG_FILE} here.`,
      'Run `npx panelui-cli@latest init` first — it sets up the theme and the paths components are written to.'
    );
  }
  return config;
}

export function writeConfig(cwd, config) {
  fs.writeFileSync(configPath(cwd), JSON.stringify(config, null, 2) + '\n');
}

/** What one segment of an alias may be made of. */
const ALIAS_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * Check an alias and hand back its tidied form.
 *
 * An alias is not only a directory. `applyAliases` splices it into the source
 * it writes, between the quotes of an import — so an alias carrying a quote or
 * a newline closes that string early and the rest of it is code in a file the
 * project will build and run. Containment does not catch that: the injected
 * text never reaches the filesystem, it becomes an instruction.
 *
 * So the characters are held to what a directory name is actually made of,
 * rather than to what cannot escape. Trailing slashes are dropped instead of
 * refused — `@/components/ui/` is a typo with an obvious reading, and `init`
 * asks for these at a prompt.
 */
export function validateAlias(alias) {
  if (typeof alias !== 'string') {
    fail('Alias paths must be relative directories.');
  }

  const tidied = alias.trim().replace(/\/+$/, '');
  const body = tidied.replace(/^@\//, '').replace(/^~\//, '').replace(/^\.\//, '');

  // `..` reads as a segment here, so the containment check below is what
  // refuses it — the character set alone would let it through.
  if (body && !body.split('/').every((segment) => ALIAS_SEGMENT.test(segment))) {
    fail(
      `Alias "${alias}" is not a directory path.`,
      'Use letters, numbers, dots, dashes and underscores, separated by /.'
    );
  }

  validateRelativePath(body, 'Alias path', { allowEmpty: true });
  return tidied;
}

/**
 * Turn an alias into a real directory, relative to the project root.
 *
 * Given the project's root (`cwd`), the alias is resolved through
 * `compilerOptions.paths` in its tsconfig, so `@/components/ui` is
 * `src/components/ui` where `@/*` maps to `./src/*`. The copied files keep the
 * alias in their imports; this is only where they are written.
 *
 * Without a root, or when no `paths` entry covers the alias, the prefix is read
 * as the project root: `@/components/ui` → `components/ui`.
 */
export function aliasToDir(alias, cwd) {
  const tidied = validateAlias(alias);
  const fallback = tidied.replace(/^@\//, '').replace(/^~\//, '').replace(/^\.\//, '');
  if (cwd === undefined) return fallback;

  const mapping = readTsconfigPaths(cwd);
  const resolved = resolveAliasThroughPaths(tidied, mapping);
  if (!resolved) return fallback;

  const root = path.resolve(cwd);
  const relative = path.relative(root, resolved.dir).split(path.sep).join('/');
  const where = `"${resolved.key}" in ${mapping.file}`;

  /*
   * The folder came from a project file, and it is about to be written into
   * CSS (`@source '…'`) and used as a write destination, so it is held to the
   * same characters an alias is. A mapping outside the app — a shared package
   * in a monorepo — is refused rather than written into.
   */
  if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) {
    fail(
      `Alias "${tidied}" resolves outside the project through ${where}.`,
      'Set an alias in panelui.json that resolves to a folder inside this app.'
    );
  }
  if (relative && !relative.split('/').every((segment) => ALIAS_SEGMENT.test(segment))) {
    fail(
      `Alias "${tidied}" resolves to "${relative}" through ${where}, which is not a plain directory path.`,
      'Use letters, numbers, dots, dashes and underscores, separated by /.'
    );
  }

  return validateRelativePath(relative, 'Alias path', { allowEmpty: true });
}

/**
 * The directory an alias's `@source` line scans: the alias's first segment,
 * resolved. `@/components/ui` scans `components` (or `src/components`), so a
 * later `add` that creates a sibling folder is covered without re-running init.
 */
export function aliasSourceRoot(alias, cwd) {
  const tidied = validateAlias(alias);
  const prefix = tidied.match(/^(?:@\/|~\/|\.\/)?/)[0];
  const [first] = tidied.slice(prefix.length).split('/');
  return aliasToDir(first ? `${prefix}${first}` : tidied, cwd);
}

/** Rejects paths that could escape a project on the current platform or Windows. */
export function validateRelativePath(value, label = 'Path', { allowEmpty = false } = {}) {
  if (typeof value !== 'string' || value.includes('\0')) {
    fail(`${label} must be a relative path.`);
  }

  if (!value && !allowEmpty) {
    fail(`${label} must not be empty.`);
  }

  if (
    path.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[a-zA-Z]:/.test(value) ||
    value.split(/[\\/]+/).includes('..')
  ) {
    fail(`${label} must stay inside the project.`);
  }

  return value;
}

/** Resolve a user or registry path, refusing anything outside the project root. */
export function projectPath(cwd, relativePath, label = 'Path') {
  const root = path.resolve(cwd);
  const destination = path.resolve(root, validateRelativePath(relativePath, label));
  const relative = path.relative(root, destination);

  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail(`${label} must stay inside the project.`);
  }

  /*
   * A lexical path can still leave the project through an existing symlink.
   * Resolve the nearest path that already exists, then put the missing suffix
   * back on that real location. This covers both a symlinked alias directory
   * (`components -> ../shared`) and a destination that is itself a symlink,
   * including a broken one that cannot safely be followed.
   */
  let ancestor = destination;
  const suffix = [];
  while (ancestor !== path.dirname(ancestor)) {
    try {
      fs.lstatSync(ancestor);
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') fail(`${label} could not be inspected safely.`);
      suffix.unshift(path.basename(ancestor));
      ancestor = path.dirname(ancestor);
    }
  }

  let realRoot;
  let realAncestor;
  try {
    realRoot = fs.realpathSync(root);
    realAncestor = fs.realpathSync(ancestor);
  } catch {
    fail(`${label} contains a broken or unreadable symbolic link.`);
  }

  const realDestination = path.resolve(realAncestor, ...suffix);
  const realRelative = path.relative(realRoot, realDestination);
  if (
    !realRelative ||
    realRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelative)
  ) {
    fail(`${label} must stay inside the project, including through symbolic links.`);
  }

  return destination;
}

/** A scaffold name must produce exactly one child directory, on every platform. */
export function validateProjectName(name) {
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name === '.' ||
    name === '..' ||
    name.includes('\0') ||
    /[\\/]/.test(name) ||
    path.isAbsolute(name) ||
    path.win32.isAbsolute(name) ||
    /^[a-zA-Z]:/.test(name)
  ) {
    fail('Project name must be a single directory name inside the current folder.');
  }

  return name;
}

/** Validate every configured path before it reaches a filesystem write boundary. */
export function validateConfigPaths(config, cwd) {
  const aliases = { ...CANONICAL_ALIASES, ...(config.aliases ?? {}) };
  aliasToDir(aliases.components, cwd);
  aliasToDir(aliases.lib, cwd);
  aliasToDir(aliases.hooks, cwd);
  validateRelativePath(config.css ?? 'global.css', 'CSS path');
  validateRelativePath(config.theme ?? 'theme.css', 'Theme path');
}

/**
 * Where one registry file lands, given the project's aliases. Registry paths
 * are `ui/…`, `lib/…`, `hooks/…` or a bare `theme.css`.
 */
export function targetPath(cwd, config, registryPath) {
  const safeRegistryPath = validateRelativePath(registryPath, 'Registry file path');
  if (safeRegistryPath.includes('\\')) {
    fail('Registry file paths must use forward slashes.');
  }

  const aliases = { ...CANONICAL_ALIASES, ...(config.aliases ?? {}) };
  const [group, ...rest] = safeRegistryPath.split('/');

  if (rest.length === 0) {
    // theme.css and anything else at the root goes where the config says.
    return projectPath(cwd, config.theme ?? safeRegistryPath, 'Theme path');
  }

  const alias =
    group === 'ui' ? aliases.components : group === 'lib' ? aliases.lib : aliases.hooks;

  return projectPath(cwd, path.join(aliasToDir(alias, cwd), ...rest), 'Registry file path');
}

/**
 * Rewrite the canonical aliases baked into the registry to whatever this
 * project uses. A no-op for the default configuration.
 */
export function applyAliases(content, config) {
  const aliases = { ...CANONICAL_ALIASES, ...(config.aliases ?? {}) };
  let output = content;

  for (const [key, canonical] of Object.entries(CANONICAL_ALIASES)) {
    const target = aliases[key] && validateAlias(aliases[key]);
    if (target && target !== canonical) {
      output = output.replaceAll(`'${canonical}/`, `'${target}/`);
    }
  }

  return output;
}

/** An Expo project, or at least something close enough to work in. */
export function detectProject(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fail(
      'No package.json here.',
      'Run this from the root of your app, or create one with `npx create-expo-app@latest`.'
    );
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  return {
    pkg,
    deps,
    isExpo: 'expo' in deps,
    hasTypeScript: 'typescript' in deps || fs.existsSync(path.join(cwd, 'tsconfig.json')),
  };
}
