import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(resolve(packageRoot, "package.json"), "utf8"),
);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const packRoot = mkdtempSync(join(tmpdir(), "panelui-pack-"));
const packed = JSON.parse(
  execFileSync(npm, ["pack", "--json", "--ignore-scripts", "--pack-destination", packRoot], {
    cwd: packageRoot,
    encoding: "utf8",
  }),
);

/*
 * npm 11 and earlier answer with an array of manifests; npm 12 answers with an
 * object keyed by package name. The manifests themselves are identical, and
 * this runs under whatever npm the workflow happens to have — publish.yml
 * installs `npm@latest` — so it has to read both.
 */
const [manifest] = Array.isArray(packed) ? packed : Object.values(packed);
if (!manifest) {
  throw new Error("npm pack returned no manifest to check.");
}

const files = new Set(manifest.files.map(({ path }) => path));
const allowedFiles = new Set(["README.md", "package.json", "theme.css"]);
const allowedDirectories = ["src/", "lib/module/", "lib/typescript/"];

const unexpectedFiles = [...files].filter(
  (path) =>
    !allowedFiles.has(path) &&
    !allowedDirectories.some((directory) => path.startsWith(directory)),
);

if (unexpectedFiles.length > 0) {
  throw new Error(
    `Package contains files outside the publish contract:\n${unexpectedFiles.join("\n")}`,
  );
}

const collectTargets = (value) => {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectTargets);
};

const publicPatternNames = {
  "./components/*": readdirSync(resolve(packageRoot, "src/components"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
  // The `use-` modules are the hooks. The rest of the folder supports them and
  // is reached through them, so it is not a subpath this package promises.
  "./hooks/*": readdirSync(resolve(packageRoot, "src/hooks"))
    .filter((name) => name.startsWith("use-") && name.endsWith(".ts"))
    .map((name) => name.slice(0, -3)),
};

const expandExportTargets = (key, value) => {
  const targets = collectTargets(value);
  if (!key.includes("*")) return targets;

  const names = publicPatternNames[key];
  if (!names) throw new Error(`No package verification inventory for ${key}.`);
  return names.flatMap((name) =>
    targets.map((target) => target.replaceAll("*", name)),
  );
};

const requiredTargets = new Set(
  [
    packageJson.main,
    packageJson.module,
    packageJson.types,
    packageJson["react-native"],
    ...Object.entries(packageJson.exports).flatMap(([key, value]) =>
      expandExportTargets(key, value),
    ),
  ]
    .filter(Boolean)
    .map((path) => path.replace(/^\.\//, "")),
);
for (const asset of [
  "README.md",
  "theme.css",
  "lib/module/index.js.map",
  "lib/typescript/src/index.d.ts.map",
]) {
  requiredTargets.add(asset);
}

const missingTargets = [...requiredTargets].filter((path) => !files.has(path));
if (missingTargets.length > 0) {
  throw new Error(
    `Package is missing declared entry points:\n${missingTargets.join("\n")}`,
  );
}

const forbiddenFiles = [...files].filter(
  (path) =>
    path.includes("/__tests__/") ||
    path.includes(".test.") ||
    path.endsWith(".tsbuildinfo"),
);
if (forbiddenFiles.length > 0) {
  throw new Error(
    `Package contains development-only files:\n${forbiddenFiles.join("\n")}`,
  );
}

/* Resolve real package exports from a fresh unpack, not from this workspace. */
const consumerRoot = resolve(packRoot, "consumer");
const installed = resolve(consumerRoot, "node_modules/panelui-native");
mkdirSync(installed, { recursive: true });
try {
  execFileSync("tar", [
    "-xzf",
    resolve(packRoot, manifest.filename),
    "--strip-components=1",
    "-C",
    installed,
  ]);
  writeFileSync(
    resolve(consumerRoot, "consumer.ts"),
    [
      "import { Meter, type MeterProps } from 'panelui-native/components/meter';",
      "import { Planner, type PlannerProps } from 'panelui-native/components/planner';",
      "import { PanelUIProvider } from 'panelui-native/provider';",
      "import { Scrim } from 'panelui-native/primitives/scrim';",
      "import { useTheme, type ThemeName } from 'panelui-native/theme';",
      "const meter: MeterProps = { value: 1 };",
      "const planner: PlannerProps = { entries: [] };",
      "const theme: ThemeName = 'system';",
      "void [Meter, Planner, PanelUIProvider, Scrim, useTheme, meter, planner, theme];",
    ].join("\n"),
  );
  execFileSync(process.execPath, [
    resolve(packageRoot, "../../node_modules/typescript/bin/tsc"),
    "--noEmit", "--strict", "--skipLibCheck", "--module", "esnext",
    "--moduleResolution", "bundler", resolve(consumerRoot, "consumer.ts"),
  ], { cwd: consumerRoot, stdio: "pipe" });
  execFileSync(process.execPath, [
    "--input-type=module",
    "--eval",
    "import { formatTime } from 'panelui-native/utils/time'; if (!formatTime({ hour: 9, minute: 5 }).includes('9')) process.exit(1);",
  ], { cwd: consumerRoot, stdio: "pipe" });
  console.log("Verified packed subpath consumer types and runtime utility import.");
} finally {
  rmSync(packRoot, { recursive: true, force: true });
}

/*
 * Set to catch a mistake, not to police growth.
 *
 * What this is guarding against is a stray directory finding its way into
 * `files` — a `node_modules`, a build cache, a folder of recordings. Those
 * arrive orders of magnitude over the line, so the line does not need to be
 * anywhere near the current size to catch them.
 *
 * It needs to be well clear of it, though, because this step also runs in
 * `publish.yml`, after the tag exists. A budget that a few ordinary components
 * can cross turns a release into a failure at the one moment there is nothing
 * useful to do about it. At 0.102.2 the package is 1,205 files and 3.2 MB
 * packed (12.0 MB unpacked), and each new component costs six or seven files —
 * so the file count leaves room for roughly another sixty of them. Raise it
 * when it is genuinely reached; that is a normal thing to do and not a signal
 * that anything is wrong. The byte budgets have less room than the count does,
 * so check them at the same time.
 */
const budgets = {
  files: 1_600,
  packedBytes: 4_000_000,
  unpackedBytes: 14_000_000,
};
const exceededBudgets = [
  ["files", manifest.entryCount, budgets.files],
  ["packed bytes", manifest.size, budgets.packedBytes],
  ["unpacked bytes", manifest.unpackedSize, budgets.unpackedBytes],
].filter(([, actual, maximum]) => actual > maximum);

if (exceededBudgets.length > 0) {
  throw new Error(
    `Package exceeds its size budget:\n${exceededBudgets
      .map(([name, actual, maximum]) => `${name}: ${actual} > ${maximum}`)
      .join("\n")}`,
  );
}

console.log(
  `Verified package: ${manifest.entryCount} files, ${manifest.size} packed bytes, ${manifest.unpackedSize} unpacked bytes.`,
);
