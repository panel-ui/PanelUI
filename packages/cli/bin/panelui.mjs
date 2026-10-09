#!/usr/bin/env node
/**
 * panelui-cli — add PanelUI components to a project one at a time.
 *
 * Zero dependencies on purpose: running this with npx should download a few
 * kilobytes, not a tree.
 */
import process from 'node:process';
import { add, list } from '../src/add.mjs';
import { diagnose, formatDoctor } from '../src/doctor.mjs';
import { init } from '../src/init.mjs';
import { mcp, mcpInit } from '../src/mcp.mjs';
import { update } from '../src/update.mjs';
import { CliError, bold, dim, error, info, optionValue } from '../src/ui.mjs';

const HELP = `
${bold('panelui-cli')} — components for Expo, copied into your project.

${bold('Usage')}
  npx panelui-cli@latest <command> [options]

${bold('Commands')}
  init                 In an empty folder, start a new app from a template.
                       In an existing one, set it up to receive components.
  add <name...>        Copy components in, with everything they depend on
  update [name...]     Diff and safely update unchanged component files
  list                 Discover registry items; filter with --type or --search
  doctor               Check project setup without changing it
  mcp                  Run the MCP server, so an agent can read the registry
  mcp init [editor]    Write the server into an editor's config
                       claude | cursor | vscode

${bold('Options')}
  --yes, -y            Accept every prompt
  --overwrite          Replace files that already exist
  --check              Check for safe updates without writing
  --dry-run            Show what would happen, write nothing
  --cwd <dir>          Run against another directory
  --registry <url>     Use a different registry
  --type <kind>        ui | chart | block | hook | lib | theme
  --search <text>      Rank registry items matching every search term
  --json               Print list or doctor results as stable JSON
  --help, -h           This
  --version, -v        Print the version

${bold('New project')}
  --template <name>    starter | minimal
  --name <name>        Folder and app name
  --theme <name>       panel | moon | grass

${bold('Examples')}
  npx panelui-cli@latest init
  npx panelui-cli@latest init --template starter --name my-app --theme moon
  npx panelui-cli@latest add button
  npx panelui-cli@latest add item message --yes
  npx panelui-cli@latest update --check
  npx panelui-cli@latest list --type chart --search bar
  npx panelui-cli@latest mcp init cursor
`;

function parseArgs(argv) {
  const options = {
    cwd: process.cwd(),
    assumeYes: false,
    overwrite: false,
    check: false,
    dryRun: false,
    registry: undefined,
    type: undefined,
    search: undefined,
    json: false,
    template: undefined,
    name: undefined,
    theme: undefined,
    help: false,
    version: false,
    json: false,
  };
  const positionals = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--yes':
      case '-y':
        options.assumeYes = true;
        break;
      case '--overwrite':
        options.overwrite = true;
        break;
      case '--check':
        options.check = true;
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
      case '--json':
        options.json = true;
        break;
      case '--cwd':
        options.cwd = optionValue(argv, i, arg, '<dir>');
        i += 1;
        break;
      case '--registry':
        // A trailing slash would produce `…/r//item.json`.
        options.registry = optionValue(argv, i, arg, '<url>').replace(/\/+$/, '');
        i += 1;
        break;
      case '--type':
        options.type = optionValue(argv, i, arg, '<kind>');
        i += 1;
        break;
      case '--search':
        options.search = optionValue(argv, i, arg, '<text>');
        i += 1;
        break;
      case '--json':
        options.json = true;
        break;
      case '--template':
        options.template = optionValue(argv, i, arg, '<name>');
        i += 1;
        break;
      case '--name':
        options.name = optionValue(argv, i, arg, '<name>');
        i += 1;
        break;
      case '--theme':
        options.theme = optionValue(argv, i, arg, '<name>');
        i += 1;
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
    case 'update':
      await update(rest, options);
      break;
    case 'list':
    case 'ls':
      await list(options);
      break;
    case 'doctor': {
      const report = diagnose(options.cwd);
      info(options.json ? JSON.stringify(report, null, 2) : formatDoctor(report));
      if (report.errors) process.exitCode = 1;
      break;
    }
    case 'mcp':
      if (rest[0] === 'init') {
        const { file, label } = mcpInit(options, rest[1]);
        info(`Wrote the PanelUI server into ${bold(file)} for ${label}.`);
        break;
      }
      // No banner, no colours: stdout is the protocol here, and anything
      // written to it that is not a JSON-RPC message breaks the session.
      await mcp(options);
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
