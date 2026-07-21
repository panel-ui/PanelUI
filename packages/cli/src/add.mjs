/**
 * `add` — copy components into the project.
 */
import fs from 'node:fs';
import path from 'node:path';
import { applyAliases, detectProject, requireConfig, targetPath } from './config.mjs';
import { collectDependencies, fetchIndex, resolve } from './registry.mjs';
import { installDependencies } from './patch.mjs';
import { bold, confirm, dim, fail, info, step, success, warn } from './ui.mjs';

export async function add(names, options) {
  const cwd = options.cwd;

  if (!names.length) {
    fail('Nothing to add.', 'Try `npx panelui-cli@latest add button`, or `list` to see them all.');
  }

  const config = requireConfig(cwd);
  const project = detectProject(cwd);
  const registry = options.registry ?? config.registry;

  const items = await resolve(registry, names);

  // Dependencies the user did not ask for are shown separately: taking three
  // extra files because you asked for one is fine, but it should not be a
  // surprise afterwards.
  const requested = items.filter((item) => names.includes(item.name));
  const pulled = items.filter((item) => !names.includes(item.name));

  const writes = [];
  for (const item of items) {
    for (const file of item.files) {
      const destination = targetPath(cwd, config, file.path);
      writes.push({
        item: item.name,
        destination,
        relative: path.relative(cwd, destination),
        content: applyAliases(file.content, config),
        exists: fs.existsSync(destination),
      });
    }
  }

  info('');
  step(`Adding ${requested.map((i) => bold(i.name)).join(', ')}`);

  if (pulled.length) {
    info(dim(`  plus ${pulled.map((i) => i.name).join(', ')} — required by the above`));
  }

  info('');
  for (const write of writes) {
    const marker = write.exists ? (options.overwrite ? '~' : '·') : '+';
    const note = write.exists ? dim(options.overwrite ? ' (overwrite)' : ' (exists, skipped)') : '';
    info(`  ${marker} ${write.relative}${note}`);
  }
  info('');

  const conflicts = writes.filter((w) => w.exists);
  if (conflicts.length && !options.overwrite) {
    warn(
      `${conflicts.length} file${conflicts.length === 1 ? '' : 's'} already exist and will be left alone.`
    );
    info(dim('  These files are yours once copied — pass --overwrite to replace them.'));
    info('');
  }

  const pending = writes.filter((w) => options.overwrite || !w.exists);
  if (!pending.length) {
    success('Everything is already installed.');
    return;
  }

  if (options.dryRun) {
    info(dim('Dry run — nothing written.'));
    return;
  }

  if (!(await confirm(`Write ${pending.length} file${pending.length === 1 ? '' : 's'}?`, { assumeYes: options.yes }))) {
    info(dim('Cancelled.'));
    return;
  }

  for (const write of pending) {
    fs.mkdirSync(path.dirname(write.destination), { recursive: true });
    fs.writeFileSync(write.destination, write.content);
  }
  success(`Wrote ${pending.length} file${pending.length === 1 ? '' : 's'}`);

  const { dependencies, optionalDependencies } = collectDependencies(items);
  const missing = dependencies.filter((dep) => !(dep in project.deps));

  await installDependencies(cwd, missing, { ...options, isExpo: project.isExpo });

  // Never installed automatically: each is reached through a lazy require
  // inside a try/catch, so the component works without it. Installing them
  // uninvited would add native modules — and a rebuild — nobody asked for.
  const missingOptional = optionalDependencies.filter((dep) => !(dep in project.deps));
  if (missingOptional.length) {
    info('');
    info(dim('Optional, for extra features on these components:'));
    for (const dep of missingOptional) {
      info(dim(`  npx expo install ${dep}`));
    }
  }

  info('');
}

export async function list(options) {
  const config = readConfigSafely(options.cwd);
  const registry = options.registry ?? config?.registry ?? 'https://panelui.dev/r';
  const index = await fetchIndex(registry);

  const groups = {
    'registry:ui': 'Components',
    'registry:hook': 'Hooks',
    'registry:lib': 'Utilities',
    'registry:theme': 'Theme',
  };

  for (const [type, label] of Object.entries(groups)) {
    const entries = index.filter((entry) => entry.type === type);
    if (!entries.length) continue;

    info('');
    info(bold(label));
    for (const entry of entries) {
      info(`  ${entry.name.padEnd(22)} ${dim(entry.description ?? '')}`);
    }
  }

  info('');
  info(dim(`${index.length} items · npx panelui-cli@latest add <name>`));
  info('');
}

/** `list` works without a config, so a missing one is not an error here. */
function readConfigSafely(cwd) {
  try {
    const file = path.join(cwd, 'panelui.json');
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  } catch {
    return null;
  }
}
