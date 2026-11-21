import fs from "node:fs";
import path from "node:path";
import {
  CANONICAL_ALIASES,
  DEFAULT_REGISTRY,
  aliasSourceRoot,
  aliasToDir,
  projectPath,
  validateConfigPaths,
} from "./config.mjs";
import { BASE_DEPENDENCIES } from "./init.mjs";
import { digest, LOCK_FILE } from "./lock.mjs";
import { hasWrappedMetroExport } from "./patch.mjs";

const check = (id, status, message) => ({ id, status, message });
const read = (file) => fs.readFileSync(file, "utf8");

function sourceFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) return [];
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

function lockDiagnostics(cwd, config, aliases) {
  const lockFile = path.join(cwd, LOCK_FILE);
  if (!fs.existsSync(lockFile)) {
    const copiedRoots = Object.values(aliases)
      .map((alias) => aliasToDir(alias, cwd))
      .filter((directory) => fs.existsSync(path.join(cwd, directory)))
      .sort();
    return [
      check(
        "lock",
        copiedRoots.length ? "warning" : "ok",
        copiedRoots.length
          ? `lockfile is missing while copied-source directories exist: ${copiedRoots.join(", ")}`
          : "no lockfile or copied-source directories",
      ),
      check("tracked-files", "ok", "no tracked files"),
      check("registry", "ok", "no lockfile provenance to compare"),
    ];
  }

  let lock;
  try {
    lock = JSON.parse(read(lockFile));
  } catch {
    return invalidLock("lockfile is not valid JSON");
  }
  if (
    !lock ||
    Array.isArray(lock) ||
    !Number.isInteger(lock.version) ||
    lock.version < 1 ||
    !lock.files ||
    Array.isArray(lock.files)
  ) {
    return invalidLock("lockfile schema is malformed");
  }
  const entries = Object.entries(lock.files).sort(([left], [right]) => left.localeCompare(right));
  if (
    !entries.every(
      ([, entry]) => typeof entry?.item === "string" && /^sha256:[a-f0-9]{64}$/.test(entry.digest),
    )
  ) {
    return invalidLock("tracked file metadata is malformed");
  }
  if (lock.version === 2) {
    const rootsValid =
      lock.roots &&
      !Array.isArray(lock.roots) &&
      Object.values(lock.roots).every((closure) =>
        Array.isArray(closure) && closure.every((item) => typeof item === "string"));
    const legacyValid = Array.isArray(lock.legacyFiles) && lock.legacyFiles.every((relative) => typeof relative === "string");
    if (!rootsValid || !legacyValid) return invalidLock("version 2 ownership metadata is malformed");
  }

  const missing = [];
  const changed = [];
  const unsafe = [];
  const realRoot = fs.realpathSync(cwd);
  for (const [relative, entry] of entries) {
    let file;
    try {
      file = projectPath(cwd, relative, "Tracked file path");
      if (!fs.existsSync(file)) {
        missing.push(relative);
        continue;
      }
      const realFile = fs.realpathSync(file);
      const fromRoot = path.relative(realRoot, realFile);
      if (!fromRoot || fromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(fromRoot)) {
        unsafe.push(relative);
        continue;
      }
      if (digest(fs.readFileSync(file)) !== entry.digest)
        changed.push(relative);
    } catch {
      unsafe.push(relative);
    }
  }

  const trackedStatus = unsafe.length ? "error" : missing.length || changed.length ? "warning" : "ok";
  const details = [
    unsafe.length &&
      `${unsafe.length} unsafe path${unsafe.length === 1 ? "" : "s"}`,
    missing.length && `${missing.length} missing`,
    changed.length && `${changed.length} locally changed`,
  ].filter(Boolean);
  const configuredRegistry = config.registry ?? DEFAULT_REGISTRY;
  const provenance = typeof lock.registry !== "string"
    ? check("registry", entries.length ? "unknown" : "ok", "lockfile registry provenance is missing")
    : normalizeRegistry(lock.registry) === normalizeRegistry(configuredRegistry)
        ? check("registry", "ok", `matches ${configuredRegistry}`)
        : check(
            "registry",
            "warning",
            `lockfile uses ${lock.registry}; configuration uses ${configuredRegistry}`,
          );

  return [
    check(
      "lock",
      lock.version <= 2 ? "ok" : "warning",
      lock.version <= 2
        ? `version ${lock.version} metadata is valid (${entries.length} tracked files)`
        : `version ${lock.version} uses a newer schema; common file metadata is readable`,
    ),
    check(
      "tracked-files",
      trackedStatus,
      details.length
        ? `${details.join(", ")}: ${examples([...unsafe, ...missing, ...changed])}`
        : `${entries.length} tracked files match`,
    ),
    provenance,
  ];
}

function invalidLock(message) {
  return [
    check("lock", "error", message),
    check("tracked-files", "unknown", "not checked because the lockfile is unusable"),
    check("registry", "unknown", "not checked because the lockfile is unusable"),
  ];
}

function normalizeRegistry(value) {
  return value.replace(/\/+$/, "");
}

function examples(files) {
  const unique = [...new Set(files)].sort();
  return `${unique.slice(0, 5).join(", ")}${unique.length > 5 ? ` (+${unique.length - 5} more)` : ""}`;
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match ? match.slice(1).map(Number) : null;
}

function compatible(specifier, installed) {
  const actual = parseVersion(installed);
  if (!actual) return null;
  if (specifier === "*" || specifier === "latest") return true;
  const match = /^(\^|~|>=)?(\d+\.\d+\.\d+)$/.exec(specifier);
  if (!match) return null;
  const wanted = parseVersion(match[2]);
  const comparison = actual.findIndex((part, index) => part !== wanted[index]);
  const atLeast = comparison === -1 || actual[comparison] > wanted[comparison];
  if (!match[1]) return comparison === -1;
  if (match[1] === ">=") return atLeast;
  if (!atLeast || actual[0] !== wanted[0]) return false;
  if (match[1] === "~") return actual[1] === wanted[1];
  return (
    wanted[0] > 0 ||
    (actual[1] === wanted[1] && (wanted[1] > 0 || actual[2] === wanted[2]))
  );
}

function versionDiagnostics(cwd, manifest, config) {
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };
  const results = [];
  if (
    config.$schema !== undefined &&
    config.$schema !== "https://panelui.dev/schema.json"
  ) {
    results.push(`configuration schema ${config.$schema} is not recognized`);
  }
  for (const name of ["panelui-cli", "panelui-native"]) {
    if (!(name in dependencies)) continue;
    const manifestFile = path.join(cwd, "node_modules", name, "package.json");
    if (!fs.existsSync(manifestFile)) {
      results.push(
        `${name} ${dependencies[name]} is declared but not installed`,
      );
      continue;
    }
    try {
      const installedManifest = JSON.parse(read(manifestFile));
      if (installedManifest.name !== name) {
        results.push(`${name} has an unreadable installed manifest`);
        continue;
      }
      const installed = installedManifest.version;
      const validVersion =
        typeof installed === "string" &&
        /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
          installed,
        );
      const matches = validVersion
        ? compatible(dependencies[name], installed)
        : false;
      if (matches === true) continue;
      results.push(
        matches === false
          ? `${name} ${installed ?? "unknown"} does not satisfy ${dependencies[name]}`
          : `cannot prove ${name} ${installed} satisfies ${dependencies[name]}`,
      );
    } catch {
      results.push(`${name} has an unreadable installed manifest`);
    }
  }
  const incompatible = results.some((message) =>
    /does not satisfy|unreadable/.test(message),
  );
  return check(
    "versions",
    incompatible ? "error" : results.length ? "unknown" : "ok",
    results.length
      ? results.join(", ")
      : "locally installed PanelUI package versions are compatible",
  );
}

export function diagnose(cwd) {
  const checks = [];
  const configFile = path.join(cwd, "panelui.json");
  let config;
  try {
    config = JSON.parse(read(configFile));
    if (!config || Array.isArray(config) || typeof config !== "object")
      throw new Error("not an object");
    if (config.registry !== undefined && typeof config.registry !== "string")
      throw new Error("registry must be a string");
    if (config.$schema !== undefined && typeof config.$schema !== "string")
      throw new Error("$schema must be a string");
    if (
      config.aliases !== undefined &&
      (!config.aliases ||
        Array.isArray(config.aliases) ||
        typeof config.aliases !== "object")
    )
      throw new Error("aliases must be an object");
    validateConfigPaths(config, cwd);
    checks.push(check("config", "ok", "panelui.json is valid and contained"));
  } catch (error) {
    const message = fs.existsSync(configFile)
      ? error.message
      : "panelui.json is missing";
    checks.push(check("config", "error", message));
    return report(cwd, checks);
  }

  const aliases = { ...CANONICAL_ALIASES, ...(config.aliases ?? {}) };
  checks.push(check("aliases", "ok", Object.values(aliases).join(", ")));

  const cssFile = projectPath(cwd, config.css ?? "global.css", "CSS path");
  if (!fs.existsSync(cssFile)) {
    checks.push(
      check("css", "error", `${path.relative(cwd, cssFile)} is missing`),
    );
  } else {
    const css = read(cssFile);
    const cssDir = path.dirname(cssFile);
    const required = ["@import 'tailwindcss'", "@import 'uniwind'"];
    let themeImport = path
      .relative(cssDir, path.join(cwd, config.theme ?? "theme.css"))
      .split(path.sep)
      .join("/");
    if (!themeImport.startsWith(".")) themeImport = `./${themeImport}`;
    required.push(`@import '${themeImport}'`);
    const sourceDirs = new Set(
      Object.values(aliases).map((alias) => aliasSourceRoot(alias, cwd)),
    );
    for (const dir of sourceDirs) {
      let relative = path
        .relative(cssDir, path.join(cwd, dir))
        .split(path.sep)
        .join("/");
      if (!relative.startsWith(".")) relative = `./${relative}`;
      required.push(`@source '${relative}'`);
    }
    const missing = required.filter((line) => !css.includes(line));
    checks.push(
      check(
        "css",
        missing.length ? "error" : "ok",
        missing.length
          ? `missing ${missing.join(", ")}`
          : "imports and sources are present",
      ),
    );
  }

  const metroFile = ["metro.config.js", "metro.config.mjs", "metro.config.cjs"]
    .map((file) => path.join(cwd, file))
    .find(fs.existsSync);
  checks.push(
    !metroFile
      ? check("metro", "error", "Metro config is missing")
      : hasWrappedMetroExport(read(metroFile))
        ? check("metro", "ok", "export wraps withUniwindConfig")
        : check(
            "metro",
            "warning",
            "could not prove the exported config uses withUniwindConfig",
          ),
  );

  const themeFile = projectPath(cwd, config.theme ?? "theme.css", "Theme path");
  checks.push(
    check(
      "theme",
      fs.existsSync(themeFile) ? "ok" : "error",
      fs.existsSync(themeFile)
        ? "theme file is present"
        : `${path.relative(cwd, themeFile)} is missing`,
    ),
  );

  const typesFile = [
    path.join(cwd, "uniwind-env.d.ts"),
    ...sourceFiles(path.join(cwd, "src")),
  ].find(
    (file) =>
      fs.existsSync(file) &&
      /\.d\.ts$/.test(file) &&
      /uniwind\/types/.test(read(file)),
  );
  checks.push(
    check(
      "types",
      typesFile ? "ok" : "warning",
      typesFile
        ? "Uniwind ambient types are present"
        : "could not find an ambient uniwind/types import",
    ),
  );

  let manifest = {};
  try {
    manifest = JSON.parse(read(path.join(cwd, "package.json")));
  } catch {}
  const deps = { ...manifest.dependencies, ...manifest.devDependencies };
  const missingDeps = BASE_DEPENDENCIES.filter((name) => !(name in deps));
  checks.push(
    check(
      "dependencies",
      missingDeps.length ? "error" : "ok",
      missingDeps.length
        ? `missing ${missingDeps.join(", ")}`
        : "required packages are present",
    ),
  );
  checks.push(...lockDiagnostics(cwd, config, aliases));
  checks.push(versionDiagnostics(cwd, manifest, config));

  const appFiles = ["app", "src/app"].flatMap((dir) =>
    sourceFiles(path.join(cwd, dir)),
  );
  const provider = appFiles.some((file) => {
    const source = read(file);
    return (
      /import\s*\{[^}]*\bPanelUIProvider\b[^}]*\}\s*from\s*['"][^'"]+['"]/.test(
        source,
      ) && /<PanelUIProvider\b/.test(source)
    );
  });
  checks.push(
    check(
      "provider",
      provider ? "ok" : "unknown",
      provider
        ? "PanelUIProvider is wired in app source"
        : "provider wiring needs manual review",
    ),
  );
  return report(cwd, checks);
}

function report(cwd, checks) {
  const errors = checks.filter((item) => item.status === "error").length;
  const warnings = checks.filter(
    (item) => item.status === "warning" || item.status === "unknown",
  ).length;
  return {
    version: 1,
    cwd: path.resolve(cwd),
    status: errors ? "broken" : warnings ? "review" : "healthy",
    errors,
    warnings,
    checks,
  };
}

export function formatDoctor(report) {
  const mark = { ok: "✓", error: "✗", warning: "!", unknown: "?" };
  return [
    `PanelUI doctor: ${report.status}`,
    ...report.checks.map(
      (item) => `${mark[item.status]} ${item.id}: ${item.message}`,
    ),
    `${report.errors} errors, ${report.warnings} warnings/unknowns`,
  ].join("\n");
}
