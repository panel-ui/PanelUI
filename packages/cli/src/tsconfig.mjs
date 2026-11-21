/**
 * Read the project's `compilerOptions.paths`, so an alias resolves to the
 * folder TypeScript and Metro resolve it to.
 *
 * An alias does two jobs. It is the text written into every copied import, and
 * it names the folder the copied file lands in. Those only agree when the
 * folder is the one the project's tsconfig maps the alias to — `@/*` →
 * `./src/*` in an app with a `src/` folder, `@/*` → `./*` in one without.
 * Guessing the second from the first put files where no import could find
 * them.
 *
 * Nothing here throws. A tsconfig that cannot be read is treated as one that
 * says nothing, and the caller falls back to reading the alias as a path from
 * the project root.
 */
import fs from 'node:fs';
import path from 'node:path';

const MAX_EXTENDS_DEPTH = 5;

/**
 * Remove comments and trailing commas from JSONC, keeping string contents
 * exactly. tsconfig files routinely carry both, and `JSON.parse` takes neither.
 */
export function stripJsonc(source) {
  let output = '';
  let inString = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];

    if (inString) {
      output += char;
      if (char === '\\' && next !== undefined) {
        output += next;
        index += 1;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
      output += char;
    } else if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      output += '\n';
    } else if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1;
      }
      index += 1;
    } else {
      output += char;
    }
  }

  // Trailing commas second, once no comment can sit between a comma and the
  // bracket after it.
  return removeTrailingCommas(output);
}

function removeTrailingCommas(source) {
  let output = '';
  let inString = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];

    if (inString) {
      output += char;
      if (char === '\\') {
        output += source[index + 1] ?? '';
        index += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === ',') {
      let lookahead = index + 1;
      while (/\s/.test(source[lookahead] ?? '')) lookahead += 1;
      if (source[lookahead] === '}' || source[lookahead] === ']') continue;
    }

    output += char;
  }

  return output;
}

function readJsonc(file) {
  try {
    const value = JSON.parse(stripJsonc(fs.readFileSync(file, 'utf8')));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Find the file an `extends` entry names, or null. */
function resolveExtends(specifier, fromDir, cwd) {
  if (typeof specifier !== 'string' || !specifier) return null;

  const candidates = [];
  if (specifier.startsWith('.') || path.isAbsolute(specifier)) {
    const base = path.resolve(fromDir, specifier);
    candidates.push(base, `${base}.json`, path.join(base, 'tsconfig.json'));
  } else {
    // A package. Look in the project's node_modules and its ancestors', as
    // Node does — a workspace's dependencies are often hoisted to the root.
    let dir = path.resolve(cwd);
    while (true) {
      const base = path.join(dir, 'node_modules', specifier);
      candidates.push(base, `${base}.json`, path.join(base, 'tsconfig.json'));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return candidates.find((file) => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  }) ?? null;
}

/**
 * Collect `paths` and `baseUrl` through the `extends` chain. A config's own
 * values override the ones it extends, as they do in TypeScript.
 */
function collect(file, cwd, depth, seen) {
  if (depth > MAX_EXTENDS_DEPTH || seen.has(file)) return {};
  seen.add(file);

  const config = readJsonc(file);
  if (!config) return {};

  const dir = path.dirname(file);
  let result = {};

  const parents = Array.isArray(config.extends) ? config.extends : [config.extends];
  for (const specifier of parents) {
    const parent = resolveExtends(specifier, dir, cwd);
    if (parent) result = { ...result, ...collect(parent, cwd, depth + 1, seen) };
  }

  const options = config.compilerOptions;
  if (options && typeof options === 'object') {
    if (typeof options.baseUrl === 'string') {
      result.baseUrl = path.resolve(dir, options.baseUrl);
    }
    if (options.paths && typeof options.paths === 'object' && !Array.isArray(options.paths)) {
      result.paths = options.paths;
      result.pathsDir = dir;
    }
  }

  return result;
}

/**
 * The project's path mappings, or null when it has none.
 *
 * `baseDir` is what the targets are relative to: `baseUrl` when it is set,
 * otherwise the folder of the tsconfig that declared `paths`.
 */
export function readTsconfigPaths(cwd) {
  const file = ['tsconfig.json', 'jsconfig.json']
    .map((name) => path.join(cwd, name))
    .find((candidate) => fs.existsSync(candidate));
  if (!file) return null;

  try {
    const { paths, pathsDir, baseUrl } = collect(file, cwd, 0, new Set());
    if (!paths) return null;
    return { file: path.basename(file), paths, baseDir: baseUrl ?? pathsDir };
  } catch {
    return null;
  }
}

/**
 * The first target `paths` maps a specifier to, with `*` filled in, or null.
 *
 * An exact key wins; otherwise the wildcard key with the longest prefix, the
 * order TypeScript itself uses.
 */
function matchSpecifier(specifier, paths) {
  const firstTarget = (key) => {
    const targets = paths[key];
    return Array.isArray(targets) && typeof targets[0] === 'string' ? targets[0] : null;
  };

  if (Object.hasOwn(paths, specifier) && !specifier.includes('*')) {
    const target = firstTarget(specifier);
    if (target !== null) return { key: specifier, target };
  }

  let best = null;
  for (const key of Object.keys(paths)) {
    const star = key.indexOf('*');
    if (star === -1 || key.indexOf('*', star + 1) !== -1) continue;
    const prefix = key.slice(0, star);
    const suffix = key.slice(star + 1);
    if (
      specifier.length >= prefix.length + suffix.length &&
      specifier.startsWith(prefix) &&
      specifier.endsWith(suffix) &&
      (!best || prefix.length > best.prefix.length)
    ) {
      best = { key, prefix, suffix };
    }
  }

  if (!best) return null;
  const target = firstTarget(best.key);
  if (target === null) return null;

  const matched = specifier.slice(best.prefix.length, specifier.length - best.suffix.length);
  return { key: best.key, target: target.replace('*', matched) };
}

/**
 * Where an alias directory points according to `paths`, as an absolute path,
 * plus the key that matched — or null when no key covers it.
 *
 * `@/components/ui` is a directory, not a module, so it is matched as if a
 * file inside it were being imported (`@/components/ui/x`) and the file's name
 * is taken back off. That is what lets `@/*` cover it.
 */
export function resolveAliasThroughPaths(alias, mapping) {
  if (!mapping?.paths) return null;

  const direct = matchSpecifier(alias, mapping.paths);
  if (direct && !direct.key.includes('*')) {
    return { key: direct.key, dir: path.resolve(mapping.baseDir, direct.target) };
  }

  const probe = '__panelui_probe__';
  const inside = matchSpecifier(`${alias}/${probe}`, mapping.paths);
  if (!inside || !inside.target.endsWith(probe)) {
    return direct ? { key: direct.key, dir: path.resolve(mapping.baseDir, direct.target) } : null;
  }

  const target = inside.target.slice(0, -probe.length) || '.';
  return { key: inside.key, dir: path.resolve(mapping.baseDir, target) };
}
