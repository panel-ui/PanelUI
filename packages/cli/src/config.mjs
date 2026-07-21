/**
 * `panelui.json` — where a project says which directories it wants the copied
 * source to land in.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fail } from './ui.mjs';

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
  return path.join(cwd, CONFIG_FILE);
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

/**
 * Turn an alias into a real directory. `@/components/ui` → `components/ui`,
 * following the `@/*` → `./*` mapping Expo's base tsconfig already sets up.
 */
export function aliasToDir(alias) {
  return alias.replace(/^@\//, '').replace(/^~\//, '').replace(/^\.\//, '');
}

/**
 * Where one registry file lands, given the project's aliases. Registry paths
 * are `ui/…`, `lib/…`, `hooks/…` or a bare `theme.css`.
 */
export function targetPath(cwd, config, registryPath) {
  const aliases = { ...CANONICAL_ALIASES, ...(config.aliases ?? {}) };
  const [group, ...rest] = registryPath.split('/');

  if (rest.length === 0) {
    // theme.css and anything else at the root goes where the config says.
    return path.join(cwd, config.theme ?? registryPath);
  }

  const alias =
    group === 'ui' ? aliases.components : group === 'lib' ? aliases.lib : aliases.hooks;

  return path.join(cwd, aliasToDir(alias), ...rest);
}

/**
 * Rewrite the canonical aliases baked into the registry to whatever this
 * project uses. A no-op for the default configuration.
 */
export function applyAliases(content, config) {
  const aliases = { ...CANONICAL_ALIASES, ...(config.aliases ?? {}) };
  let output = content;

  for (const [key, canonical] of Object.entries(CANONICAL_ALIASES)) {
    const target = aliases[key];
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
