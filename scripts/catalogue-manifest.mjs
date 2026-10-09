import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const readJson = (file) => JSON.parse(read(file));

export function assertUniqueParity(label, canonical, actual) {
  const duplicates = actual.filter(
    (name, index) => actual.indexOf(name) !== index,
  );
  const expected = new Set(canonical);
  const received = new Set(actual);
  const missing = canonical.filter((name) => !received.has(name));
  const unexpected = [...received].filter((name) => !expected.has(name));
  if (duplicates.length || missing.length || unexpected.length) {
    throw new Error(
      `${label} drifted from component modules:` +
        [
          duplicates.length &&
            `\n  duplicates: ${[...new Set(duplicates)].join(", ")}`,
          missing.length && `\n  missing: ${missing.join(", ")}`,
          unexpected.length && `\n  unexpected: ${unexpected.join(", ")}`,
        ]
          .filter(Boolean)
          .join(""),
    );
  }
}


export function assertVisualizationContract(name, mode, source) {
  if (mode === "shared-data") {
    if (
      !source.includes("<ChartAccessibilityData") ||
      !source.includes('importantForAccessibility="no-hide-descendants"')
    ) {
      throw new Error(
        `${name}: shared-data visualization must expose ChartAccessibilityData and hide decorative geometry`,
      );
    }
    return;
  }
  if (mode === "summary") {
    if (
      !source.includes('accessibilityRole="image"') ||
      !source.includes("accessibilityLabel={semantic.label}") ||
      !source.includes('importantForAccessibility="no-hide-descendants"')
    ) {
      throw new Error(
        `${name}: summary visualization must expose a labelled summary and hide decorative geometry`,
      );
    }
    return;
  }
  if (mode === "interactive-items") {
    if (
      !source.includes('accessibilityRole="button"') ||
      !source.includes("accessibilityLabel=")
    ) {
      throw new Error(
        `${name}: interactive-items visualization must expose labelled actionable data items`,
      );
    }
    return;
  }
  throw new Error(`${name}: unknown visualization accessibility mode ${String(mode)}`);
}

function visualizationEntries() {
  const meta = readJson("apps/docs/scripts/meta.json");
  const chartGroup = Object.entries(meta)
    .filter(([, entry]) => entry[3]?.group === "charts")
    .map(([name]) => name)
    .sort();
  const visualizations = Object.entries(meta)
    .filter(([, entry]) => entry[3]?.visualization === true)
    .map(([name, entry]) => ({
      name,
      accessibilityMode: entry[3]?.accessibilityMode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  assertUniqueParity(
    "Visualization metadata",
    chartGroup,
    visualizations.map(({ name }) => name),
  );
  for (const item of visualizations) {
    assertVisualizationContract(
      item.name,
      item.accessibilityMode,
      read(`packages/panelui/src/components/${item.name}/index.tsx`),
    );
  }
  return visualizations;
}

function componentDirectories() {
  return fs
    .readdirSync(path.join(ROOT, "packages/panelui/src/components"), {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function componentExports() {
  return [
    ...read("packages/panelui/src/index.ts").matchAll(
      /['"]\.\/components\/([^/'"]+)/g,
    ),
  ]
    .map((match) => match[1])
    .filter((name, index, names) => names.indexOf(name) === index)
    .sort();
}

function documentedComponents() {
  const groups = ["components", "charts", "form", "ai-components"];
  return groups.flatMap((group) => {
    const pages = readJson(`apps/docs/content/docs/${group}/meta.json`).pages;
    // `index` is the group's own overview page, and `!index` is the same page
    // excluded from the group because the sidebar files it elsewhere. Neither
    // is a component, so neither belongs in the parity check.
    return pages.filter((page) => page !== "index" && page !== "!index");
  });
}

function exampleEntries() {
  return [
    ...read("apps/example/src/data/components.generated.ts").matchAll(
      /\{"slug":"([^"]+)"/g,
    ),
  ].map((match) => match[1]);
}

function sourceFiles(directory, pattern) {
  return fs
    .readdirSync(path.join(ROOT, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name)).length;
}

function validateClaims(count) {
  const claims = [
    ["README.md", /\*\*(\d+) accessible, typed component modules\*\*/g, 1],
    ["README.md", /\*\*(\d+) component modules\*\*/g, 1],
    [
      "apps/docs/content/docs/index.mdx",
      /\b(\d+) typed component modules\b/g,
      1,
    ],
    [
      "apps/docs/content/docs/components/index.mdx",
      /\b(\d+) component modules\b/g,
      2,
    ],
    ["skills/panelui/components.md", /^\s*(\d+) component modules\./gm, 1],
  ];
  for (const [file, pattern, expectedMatches] of claims) {
    const matches = [...read(file).matchAll(pattern)];
    if (
      matches.length !== expectedMatches ||
      matches.some((match) => Number(match[1]) !== count)
    ) {
      throw new Error(
        `${file}: expected ${expectedMatches} validated claim(s) of ${count}`,
      );
    }
  }
}

function buildManifest() {
  const components = componentDirectories();
  const exports = componentExports();
  const docs = documentedComponents();
  const examples = exampleEntries();
  const registry = readJson("apps/docs/public/r/index.json");
  const registryNames = registry.map((item) => item.name);
  const registryComponents = registryNames.filter((name) =>
    components.includes(name),
  );

  assertUniqueParity("Package exports", components, exports);
  assertUniqueParity("Documentation navigation", components, docs);
  assertUniqueParity("Example catalogue", components, examples);
  assertUniqueParity(
    "Registry component items",
    components,
    registryComponents,
  );
  if (new Set(registryNames).size !== registryNames.length) {
    throw new Error("Registry item names must be unique");
  }
  validateClaims(components.length);

  const visualizations = visualizationEntries();

  const registryTypes = Object.fromEntries(
    ["registry:ui", "registry:hook", "registry:lib", "registry:theme", "registry:block"].map(
      (type) => [type, registry.filter((item) => item.type === type).length],
    ),
  );

  return {
    generated: "Run npm run catalogue:generate; do not edit by hand.",
    componentModules: components,
    visualizations,
    counts: {
      componentModules: components.length,
      packageComponentExports: exports.length,
      documentedComponents: docs.length,
      exampleEntries: examples.length,
      registry: {
        componentItems: registryComponents.length,
        blockItems: registryTypes["registry:block"],
        supportItems:
          registry.length - registryComponents.length - registryTypes["registry:block"],
        totalItems: registry.length,
        byType: registryTypes,
      },
      visualizations: {
        total: visualizations.length,
        sharedData: visualizations.filter(
          ({ accessibilityMode }) => accessibilityMode === "shared-data",
        ).length,
        summaries: visualizations.filter(
          ({ accessibilityMode }) => accessibilityMode === "summary",
        ).length,
        interactiveItems: visualizations.filter(
          ({ accessibilityMode }) => accessibilityMode === "interactive-items",
        ).length,
      },
      registrySupport: {
        primitives: sourceFiles("packages/panelui/src/primitives", /\.tsx?$/),
        icons: sourceFiles("packages/panelui/src/icons", /\.tsx?$/),
        providers: sourceFiles("packages/panelui/src/providers", /\.tsx?$/),
        hooks: sourceFiles("packages/panelui/src/hooks", /^use-.*\.ts$/) + 1,
        libraries: registryTypes["registry:lib"],
        themes: registryTypes["registry:theme"],
      },
    },
  };
}

function main() {
  const outputPath = path.join(ROOT, "catalogue.json");
  const output = JSON.stringify(buildManifest(), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (
      !fs.existsSync(outputPath) ||
      fs.readFileSync(outputPath, "utf8") !== output
    ) {
      throw new Error(
        "catalogue.json is stale; run npm run catalogue:generate",
      );
    }
    console.log(
      "catalogue: component, docs, example, export and registry parity verified",
    );
    return;
  }
  fs.writeFileSync(outputPath, output);
  console.log("catalogue: wrote catalogue.json");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
