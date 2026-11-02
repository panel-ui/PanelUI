#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLE = path.join(ROOT, 'apps/example');

/*
 * Baseline (Expo 57, 113 component catalogue): 4,207 modules, a 6,751,859
 * byte minified bundle, 33 assets / 1,019,361 bytes, eight route entries and
 * 7,773,447 output bytes. These are capacity guards rather than targets to
 * fill.
 *
 * The two that bind are `modules` and `bundleBytes`, at roughly 5% and 6%
 * clear of the numbers above — on the order of five more components. When one
 * of them trips, the external source map attribution below identifies the
 * largest workspace/dependency owners and the direct source owned by each
 * route entry. Native Metro emits one application bundle, so route source is
 * reported honestly rather than pretending those routes are separate chunks.
 */
export const EXAMPLE_EXPORT_BUDGETS = Object.freeze({
  modules: 4_400,
  bundleBytes: 7_100_000,
  assets: 40,
  assetBytes: 1_150_000,
  routes: 12,
  files: 45,
  totalBytes: 8_300_000,
});

function filesBelow(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(target) : [target];
  });
}

function containedFile(root, relative) {
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error(`Export metadata escaped its output directory: ${relative}`);
  }
  return target;
}

function sourceOwner(source) {
  const normalized = source.replaceAll('\\', '/');
  if (normalized.includes('/apps/example/')) return 'app/example';
  if (normalized.includes('/packages/panelui/')) return 'workspace/panelui-native';
  const marker = '/node_modules/';
  const dependency = normalized.slice(normalized.lastIndexOf(marker) + marker.length);
  if (normalized.includes(marker)) {
    const parts = dependency.split('/');
    return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  if (source.startsWith('\0') || source === '__prelude__') return 'metro/runtime';
  return 'workspace/other';
}

/**
 * Every source in a map with its content, from a plain map or an indexed one.
 * Expo 58's export writes an indexed map, its modules split across `sections`
 * that each carry a map of their own; Expo 57's wrote one flat list.
 */
function sourcesOf(sourceMap) {
  if (Array.isArray(sourceMap.sections)) {
    return sourceMap.sections.flatMap((section) => (section.map ? sourcesOf(section.map) : []));
  }
  return (sourceMap.sources ?? []).map((source, index) => ({
    source,
    content: sourceMap.sourcesContent?.[index] ?? '',
  }));
}

export function measureSourceAttribution(sourceMap) {
  const groups = new Map();
  const routes = [];
  for (const { source, content } of sourcesOf(sourceMap)) {
    const sourceBytes = Buffer.byteLength(content);
    const owner = sourceOwner(source);
    const group = groups.get(owner) ?? { name: owner, modules: 0, sourceBytes: 0 };
    group.modules += 1;
    group.sourceBytes += sourceBytes;
    groups.set(owner, group);

    const normalized = source.replaceAll('\\', '/');
    const routeMarker = '/apps/example/app/';
    const routeAt = normalized.lastIndexOf(routeMarker);
    if (routeAt >= 0 && /\.[jt]sx?$/.test(normalized)) {
      routes.push({
        route: normalized.slice(routeAt + routeMarker.length),
        sourceBytes,
      });
    }
  }
  const ranked = (left, right) =>
    right.sourceBytes - left.sourceBytes || left.name.localeCompare(right.name);
  return {
    groups: [...groups.values()].sort(ranked),
    routes: routes.sort(
      (left, right) =>
        right.sourceBytes - left.sourceBytes || left.route.localeCompare(right.route),
    ),
  };
}

export function measureExampleExport(outputDirectory, log, appDirectory = EXAMPLE) {
  const metadata = JSON.parse(
    fs.readFileSync(path.join(outputDirectory, 'metadata.json'), 'utf8'),
  );
  const platforms = Object.keys(metadata.fileMetadata ?? {});
  if (platforms.join(',') !== 'android') {
    throw new Error(`Expected one Android export, received: ${platforms.join(', ')}`);
  }

  const android = metadata.fileMetadata.android;
  const bundle = containedFile(outputDirectory, android.bundle);
  const sourceMapFile = containedFile(outputDirectory, `${android.bundle}.map`);
  if (!fs.existsSync(sourceMapFile)) {
    throw new Error('Expo export did not emit the requested external source map.');
  }
  const attribution = measureSourceAttribution(
    JSON.parse(fs.readFileSync(sourceMapFile, 'utf8')),
  );
  const assets = android.assets.map((asset) => containedFile(outputDirectory, asset.path));
  if (new Set(assets).size !== assets.length) {
    throw new Error('Expo export metadata contains duplicate assets.');
  }
  const moduleMatch = log.match(/Android Bundled[^\n]*\(([\d,]+) modules\)/);
  if (!moduleMatch) throw new Error('Expo output did not report its module count.');

  // Source maps are generated only so this gate can explain growth. They are
  // not part of the production artifact whose capacity is budgeted.
  const outputFiles = filesBelow(outputDirectory).filter(
    (file) => file !== sourceMapFile,
  );
  const routeFiles = filesBelow(path.join(appDirectory, 'app'))
    .filter((file) => /\.[jt]sx?$/.test(file))
    .filter((file) => !path.basename(file).startsWith('_'));

  return {
    modules: Number(moduleMatch[1].replaceAll(',', '')),
    bundle: path.relative(outputDirectory, bundle).replaceAll(path.sep, '/'),
    bundleBytes: fs.statSync(bundle).size,
    assets: assets.length,
    assetBytes: assets.reduce((sum, file) => sum + fs.statSync(file).size, 0),
    routes: routeFiles.length,
    files: outputFiles.length,
    totalBytes: outputFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0),
    attribution,
  };
}

export function assertExampleExportBudgets(
  metrics,
  budgets = EXAMPLE_EXPORT_BUDGETS,
) {
  const exceeded = [];
  for (const key of [
    'modules',
    'bundleBytes',
    'assets',
    'assetBytes',
    'routes',
    'files',
    'totalBytes',
  ]) {
    if (metrics[key] > budgets[key]) {
      exceeded.push(`${key}: ${metrics[key]} > ${budgets[key]}`);
    }
  }
  if (exceeded.length) {
    throw new Error(`Example export exceeds its budget:\n${exceeded.join('\n')}`);
  }
}

export function formatExampleExport(metrics) {
  const owners = metrics.attribution.groups
    .slice(0, 8)
    .map((group) => `${group.name}: ${group.modules} modules / ${group.sourceBytes} source bytes`)
    .join('\n');
  const routes = metrics.attribution.routes
    .map((route) => `${route.route}: ${route.sourceBytes} source bytes`)
    .join('\n');
  return (
    `Verified Android example export: ${metrics.modules} modules, ` +
    `${metrics.bundleBytes} bundle bytes (${metrics.bundle}), ` +
    `${metrics.assets} assets / ${metrics.assetBytes} asset bytes, ` +
    `${metrics.routes} routes, ${metrics.files} files / ${metrics.totalBytes} total bytes.\n` +
    `Largest source owners:\n${owners}\nRoute entry sources:\n${routes}`
  );
}

export function verifyExampleExport() {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'panelui-expo-export-'));
  const { FORCE_COLOR: _forceColor, NO_COLOR: _noColor, ...baseEnv } = process.env;
  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'node_modules/expo/bin/cli'),
        'export',
        '--platform',
        'android',
        '--output-dir',
        output,
        '--clear',
        // Hermes bytecode embeds a nondeterministic byte in otherwise identical
        // exports. Budget the stable, minified production JavaScript instead.
        '--no-bytecode',
        '--source-maps',
        'external',
        '--max-workers',
        '2',
      ],
      {
        cwd: EXAMPLE,
        encoding: 'utf8',
        env: { ...baseEnv, CI: '1', EXPO_OFFLINE: '1', NO_COLOR: '1' },
        maxBuffer: 20_000_000,
      },
    );
    const log = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Expo export failed with status ${result.status}:\n${log}`);
    }
    const metrics = measureExampleExport(output, log);
    assertExampleExportBudgets(metrics);
    console.log(formatExampleExport(metrics));
    return metrics;
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    verifyExampleExport();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
