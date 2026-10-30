/**
 * `remove` — the inverse of `add`: delete a component's copied files and take
 * it out of the lock, so the project goes back to the npm package for it.
 *
 * It acts on the names it is given and nothing else. A file another tracked
 * component still depends on stays, and a file that was edited after it was
 * copied stays on disk unless `--overwrite` says to discard the edits.
 */
import fs from 'node:fs';
import { projectPath, requireConfig } from './config.mjs';
import { digest, LOCK_FILE, readLock, writeLock } from './lock.mjs';
import { bold, confirm, dim, fail, info, success, warn } from './ui.mjs';

export async function remove(names, options) {
  const cwd = options.cwd;
  if (!names.length) {
    fail('Nothing to remove.', 'Try `npx panelui-cli@latest remove checkbox`.');
  }
  requireConfig(cwd);
  const lock = readLock(cwd);
  if (!lock) {
    fail(`No usable ${LOCK_FILE} here, so there is no record of what was added.`);
  }
  if (lock.version !== 2) {
    fail(
      `${LOCK_FILE} v1 does not record which components were asked for, so shared files cannot be told apart.`,
      'Re-run `add <name>` once for each component you keep, then remove.'
    );
  }

  // Components added before the lock recorded roots own only their own files.
  const legacyItems = new Set(
    lock.legacyFiles.map((relative) => lock.files[relative]?.item).filter(Boolean)
  );
  const closures = { ...lock.roots };
  for (const item of legacyItems) closures[item] ??= [item];

  const unknown = names.filter((name) => !Object.hasOwn(closures, name));
  if (unknown.length) {
    fail(
      `Not added as a component: ${unknown.join(', ')}.`,
      'Only names passed to `add` can be removed; their dependencies go with them.'
    );
  }

  const removing = new Set(names);
  const kept = new Map();
  for (const [root, closure] of Object.entries(closures)) {
    if (removing.has(root)) continue;
    for (const item of closure) if (!kept.has(item)) kept.set(item, root);
  }
  const dropped = new Set(
    names.flatMap((name) => closures[name]).filter((item) => !kept.has(item))
  );
  const stillNeeded = [...new Set(names.flatMap((name) => closures[name]))].filter((item) =>
    kept.has(item)
  );

  const files = [];
  for (const [relative, tracked] of Object.entries(lock.files)) {
    if (!dropped.has(tracked.item)) continue;
    const destination = projectPath(cwd, relative, 'Tracked file path');
    const current = fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8') : null;
    let status;
    if (current === null) status = 'missing';
    else if (digest(current) === tracked.digest) status = 'remove';
    else status = options.overwrite ? 'discard' : 'modified';
    files.push({ relative, destination, status });
  }

  info('');
  info(`Removing ${names.map(bold).join(', ')}`);
  info('');
  for (const file of files) {
    const marker = { remove: '-', discard: '-', missing: '·', modified: '!' }[file.status];
    const note = {
      remove: '',
      discard: ' (modified, discarding)',
      missing: ' (already gone)',
      modified: ' (modified, kept)',
    }[file.status];
    info(`  ${marker} ${file.relative}${dim(note)}`);
  }
  for (const item of stillNeeded) {
    info(dim(`  · ${item} stays, required by ${kept.get(item)}`));
  }
  info('');

  const modified = files.filter((file) => file.status === 'modified');
  if (modified.length) {
    warn(
      `${modified.length} file${modified.length === 1 ? ' was' : 's were'} edited after it was added and will be left on disk, untracked.`
    );
    info(dim('  Pass --overwrite to delete them as well.'));
    info('');
  }

  const deletions = files.filter((file) => file.status === 'remove' || file.status === 'discard');
  if (options.check || options.dryRun) {
    info(dim('Dry run — nothing written.'));
    info('');
    return;
  }
  if (
    deletions.length &&
    !(await confirm(`Delete ${deletions.length} file${deletions.length === 1 ? '' : 's'}?`, options))
  ) {
    info(dim('Cancelled.'));
    return;
  }

  for (const file of deletions) fs.rmSync(file.destination, { force: true });

  const nextLock = structuredClone(lock);
  for (const name of names) delete nextLock.roots[name];
  for (const file of files) delete nextLock.files[file.relative];
  nextLock.legacyFiles = nextLock.legacyFiles.filter((relative) =>
    Object.hasOwn(nextLock.files, relative)
  );
  writeLock(cwd, nextLock);

  success(
    `Removed ${names.join(', ')}${deletions.length ? ` — deleted ${deletions.length} file${deletions.length === 1 ? '' : 's'}` : ''}`
  );
  info(dim('  npm packages it installed are left in place; other code may use them.'));
  info('');
}
