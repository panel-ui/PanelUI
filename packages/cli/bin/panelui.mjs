#!/usr/bin/env node
/**
 * panelui-cli — add PanelUI components to a project one at a time.
 *
 * Zero dependencies on purpose: running this with npx should download a few
 * kilobytes, not a tree.
 */
import process from 'node:process';
import { add, list } from '../src/add.mjs';
import { init } from '../src/init.mjs';
import { CliError, bold, dim, error, info } from '../src/ui.mjs';

const HELP = `
${bold('panelui-cli')} — components for Expo, copied into your project.

${bold('Usage')}
  npx panelui-cli@latest <command> [options]

${bold('Commands')}
  init                 Set up this project: config, theme, CSS entry, Metro
  add <name...>        Copy components in, with everything they depend on
  list                 Show everything available

${bold('Options')}
  --yes, -y            Accept every prompt
  --overwrite          Replace files that already exist
  --dry-run            Show what would happen, write nothing
  --cwd <dir>          Run against another directory
  --registry <url>     Use a different registry
  --help, -h           This
  --version, -v        Print the version

${bold('Examples')}
  npx panelui-cli@latest init
  npx panelui-cli@latest add button
  npx panelui-cli@latest add item message --yes
`;

function parseArgs(argv) {
  const options = {
    cwd: process.cwd(),
    yes: false,
    overwrite: false,
    dryRun: false,
    registry: undefined,
    help: false,
    version: false,
  };
  const positionals = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--yes':
      case '-y':
        options.yes = true;
        break;
      case '--overwrite':
        options.overwrite = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      case '--cwd':
        options.cwd = argv[++i];
        break;
      case '--registry':
        // A trailing slash would produce `…/r//item.json`.
        options.registry = argv[++i]?.replace(/\/+$/, '');
        break;
      default:
        if (arg.startsWith('-')) {
          throw new CliError(`Unknown option: ${arg}`);
        }
        positionals.push(arg);
    }
  }

  return { options, positionals };
}

async function main() {
  const { options, positionals } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positionals;

  if (options.version) {
    const { default: pkg } = await import('../package.json', { with: { type: 'json' } });
    info(pkg.version);
    return;
  }

  if (options.help || !command) {
    info(HELP);
    return;
  }

  switch (command) {
    case 'init':
      await init(options);
      break;
    case 'add':
      await add(rest, options);
      break;
    case 'list':
    case 'ls':
      await list(options);
      break;
    default:
      throw new CliError(`Unknown command: ${command}`);
  }
}

main().catch((err) => {
  info('');

  if (err instanceof CliError) {
    error(err.message);
    if (err.hint) info(dim(`  ${err.hint}`));
    info('');
    process.exit(1);
  }

  // Anything else is a bug in this tool, so show the whole thing.
  error('Unexpected error:');
  console.error(err);
  process.exit(1);
});
