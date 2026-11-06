#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = path.resolve(HERE, '../apps/docs/public/r');

/*
 * These are capacity guards, not targets. At 179 items — five of them blocks —
 * the generated registry is 180 files and 4.53 MB, and its largest response is
 * 104 KB (sankey-chart). An ordinary item is about 25 KB, so the ceilings leave
 * room for about 20 more files and 700 KB, while still catching copied assets,
 * bundled output, or accidentally duplicated source before it reaches the docs
 * CDN and CLI. When a ceiling trips, measure first and restate these numbers.
 */
export const REGISTRY_BUDGETS = Object.freeze({
  files: 200,
  totalBytes: 5_250_000,
  itemBytes: 150_000,
});

/*
 * The web collection's registry, in `r/web`, measured on its own. It is a
 * different catalogue with a different reader (the shadcn CLI, not ours), and
 * folding it into the figures above would let one grow into the other's room.
 *
 * A web component is larger than an app one, since it carries its drawing
 * with it rather than leaning on a renderer: Planet's land mask alone is tens
 * of kilobytes, and Sankey Chart is the largest item at about 100 KB.
 *
 * With the charts collection in (web 0.14.0) it is 74 files and 2.23 MB. The
 * ceilings leave room for about twenty-five more items of that average size.
 */
const WEB_REGISTRY = path.join(REGISTRY, 'web');
export const WEB_REGISTRY_BUDGETS = Object.freeze({
  files: 100,
  totalBytes: 3_500_000,
  itemBytes: 200_000,
});

export function measureRegistry(directory) {
  const items = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({ file, bytes: fs.statSync(path.join(directory, file)).size }));
  if (items.length === 0) throw new Error('Registry contains no JSON items.');

  return {
    files: items.length,
    totalBytes: items.reduce((total, item) => total + item.bytes, 0),
    largest: items.reduce((largest, item) => (item.bytes > largest.bytes ? item : largest)),
  };
}

export function assertRegistryBudgets(metrics, budgets = REGISTRY_BUDGETS) {
  const exceeded = [];
  if (metrics.files > budgets.files) {
    exceeded.push(`files: ${metrics.files} > ${budgets.files}`);
  }
  if (metrics.totalBytes > budgets.totalBytes) {
    exceeded.push(`total bytes: ${metrics.totalBytes} > ${budgets.totalBytes}`);
  }
  if (metrics.largest.bytes > budgets.itemBytes) {
    exceeded.push(
      `largest item: ${metrics.largest.file} is ${metrics.largest.bytes} bytes > ${budgets.itemBytes}`
    );
  }
  if (exceeded.length > 0) {
    throw new Error(`Registry exceeds its size budget:\n${exceeded.join('\n')}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const metrics = measureRegistry(REGISTRY);
  assertRegistryBudgets(metrics);
  console.log(
    `Verified registry: ${metrics.files} files, ${metrics.totalBytes} total bytes, ` +
      `${metrics.largest.file} largest at ${metrics.largest.bytes} bytes.`
  );
  const web = measureRegistry(WEB_REGISTRY);
  assertRegistryBudgets(web, WEB_REGISTRY_BUDGETS);
  console.log(
    `Verified web registry: ${web.files} files, ${web.totalBytes} total bytes, ` +
      `${web.largest.file} largest at ${web.largest.bytes} bytes.`
  );
}
