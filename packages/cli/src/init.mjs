/**
 * `init` — make a project ready to receive components.
 *
 * Components are useless without the theme tokens, the Uniwind pipeline and
 * the provider, so this sets all three up rather than letting the first `add`
 * fail in a confusing way.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CONFIG_FILE,
  DEFAULT_REGISTRY,
  aliasToDir,
  defaultConfig,
  detectProject,
  readConfig,
  writeConfig,
} from './config.mjs';
import { fetchItem } from './registry.mjs';
import { installDependencies, patchCss, patchMetro, patchTypeScript } from './patch.mjs';
import { ask, bold, confirm, dim, info, step, success, warn } from './ui.mjs';

/** Needed by anything the registry can install. */
const BASE_DEPENDENCIES = [
  'uniwind',
  'tailwindcss',
  'tailwind-variants',
  'clsx',
  'tailwind-merge',
  'react-native-reanimated',
  'react-native-safe-area-context',
  'react-native-gesture-handler',
];

export async function init(options) {
  const cwd = options.cwd;
  const project = detectProject(cwd);

  if (!project.isExpo) {
    warn('This does not look like an Expo project — no `expo` dependency found.');
    if (!(await confirm('Continue anyway?', { defaultValue: false, assumeYes: options.yes }))) {
      return;
    }
  }

  const existing = readConfig(cwd);
  if (existing && !options.yes) {
    const overwrite = await confirm(`${CONFIG_FILE} already exists. Reconfigure?`, {
      defaultValue: false,
    });
    if (!overwrite) {
      info(dim('Nothing to do.'));
      return;
    }
  }

  const config = defaultConfig(options.registry ?? DEFAULT_REGISTRY);

  if (!options.yes && process.stdin.isTTY) {
    config.aliases.components = await ask('Where should components go?', config.aliases.components);
    config.aliases.lib = await ask('Where should utilities go?', config.aliases.lib);
    config.aliases.hooks = await ask('Where should hooks go?', config.aliases.hooks);
    config.css = await ask('Which file is your CSS entry?', config.css);
  }

  step(`Write ${CONFIG_FILE}`);
  if (!options.dryRun) {
    writeConfig(cwd, config);
    success(`Wrote ${CONFIG_FILE}`);
  }

  // The tokens are global rather than per component — every class name in the
  // library resolves through them — so they come in whole, once.
  const theme = await fetchItem(config.registry, 'theme');
  const themePath = path.join(cwd, config.theme);
  const themeExists = fs.existsSync(themePath);

  if (themeExists && !options.overwrite) {
    success(`${config.theme} already exists — left alone`);
  } else {
    step(`Write ${config.theme} ${dim('(design tokens, all themes)')}`);
    if (!options.dryRun) {
      fs.writeFileSync(themePath, theme.files[0].content);
      success(`Wrote ${config.theme}`);
    }
  }

  await patchCss(cwd, config, options);
  await patchMetro(cwd, config, options);
  await patchTypeScript(cwd, config, options);

  const missing = BASE_DEPENDENCIES.filter((dep) => !(dep in project.deps));
  await installDependencies(cwd, missing, { ...options, isExpo: project.isExpo });

  printNextSteps(config);
}

function printNextSteps(config) {
  const componentsDir = aliasToDir(config.aliases.components);

  info('');
  info(bold('Almost there. Two things left:'));
  info('');
  info(`  1. Add a component:  ${bold('npx panelui-cli@latest add button')}`);
  info(`     It lands in ${componentsDir}/ and is yours to edit.`);
  info('');
  info(`  2. Wrap your app in the provider, which owns the portal host that`);
  info(`     overlays render into:`);
  info('');
  info(dim(`       npx panelui-cli@latest add panel-ui-provider`));
  info('');
  info(dim(`       import { PanelUIProvider } from '${config.aliases.components}/panel-ui-provider';`));
  info(dim('       export default function Layout() {'));
  info(dim('         return <PanelUIProvider><Slot /></PanelUIProvider>;'));
  info(dim('       }'));
  info('');
  warn('Restart Metro with a cleared cache — a running server keeps the old theme list.');
  info(dim('  npx expo start --clear'));
  info('');
}
