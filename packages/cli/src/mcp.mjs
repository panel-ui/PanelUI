/**
 * An MCP server over the PanelUI registry, so an agent can look a component up
 * before it writes code that uses one.
 *
 * The transport is written out here rather than taken from the SDK. This
 * package has no dependencies on purpose — running it with npx should download
 * a few kilobytes, not a tree — and stdio MCP is JSON-RPC 2.0, one message per
 * line, which is about forty lines of that budget. If the protocol grows
 * something this cannot express, that is the moment to reconsider, not before.
 *
 * Everything it answers comes from the same registry the `add` command
 * installs from, so the source an agent reads is the source it would get.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DEFAULT_REGISTRY, aliasToDir, projectPath, readConfig } from './config.mjs';
import { discover, kindOf } from './discovery.mjs';
import { fetchJson, fetchText } from './registry.mjs';

/**
 * The versions we speak, and the one we answer with otherwise.
 *
 * The spec says to reply with the client's version when it is one we support
 * and with our own when it is not, so a newer client is told what it is talking
 * to and can decide to downgrade rather than being refused. Echoing back
 * whatever arrived would claim support for a protocol nothing here implements.
 */
const PROTOCOL_VERSION = '2025-06-18';
const SUPPORTED_PROTOCOL_VERSIONS = [PROTOCOL_VERSION];

const { default: pkg } = await import('../package.json', { with: { type: 'json' } });

/* ------------------------------------------------------------------ *
 * The registry, through the same fetch the CLI uses.
 * ------------------------------------------------------------------ */

function registryFor(options) {
  return options.registry ?? readConfig(options.cwd)?.registry ?? DEFAULT_REGISTRY;
}

/** The docs site behind a registry, for the markdown a component's page has. */
function docsOrigin(registry) {
  return registry.replace(/\/r\/?$/, '');
}

/** A registry name, and nothing that could climb out of the path it goes into. */
const DOCS_SLUG = /^[a-z0-9-]+$/;

/**
 * Registry metadata is authoritative; the type keeps older registries useful.
 *
 * Both halves are checked because both come from outside: `docsPath` from
 * whatever registry the caller pointed at, and `name` straight from the tool
 * call. Either one carrying `../` would walk the docs URL somewhere else, and
 * the answer would come back as documentation.
 */
function docsPathFor(item, name) {
  if (typeof item?.docsPath === 'string' && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(item.docsPath)) {
    return item.docsPath;
  }
  if (typeof name !== 'string' || !DOCS_SLUG.test(name)) return undefined;
  const group =
    item?.type === 'registry:hook'
      ? 'hooks'
      : item?.type === 'registry:lib'
        ? 'utilities'
        : item?.type === 'registry:block'
          ? 'blocks'
          : 'components';
  return `${group}/${name}`;
}

/* ------------------------------------------------------------------ *
 * The tools.
 * ------------------------------------------------------------------ */

const TOOLS = [
  {
    name: 'panelui_list_components',
    description:
      'List every component, block, primitive, hook and utility in the PanelUI registry, with a one-line description of each. Start here when you do not know what exists.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['ui', 'chart', 'block', 'lib', 'hook', 'theme'],
          description: 'Only items of this kind. Omit for everything.',
        },
      },
    },
  },
  {
    name: 'panelui_search_components',
    description:
      'Search the registry by name and description — "sheet", "chart", "date". Use this before writing custom UI, to check whether the component already exists.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What you are looking for.' } },
      required: ['query'],
    },
  },
  {
    name: 'panelui_view_component',
    description:
      "A registry item in full: its description, the components it depends on, the npm packages it needs, and every file's complete source. Read this before using a component, so the props and compound parts are the real ones.",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Registry name, e.g. "button" or "bottom-sheet".' },
        includeSource: {
          type: 'boolean',
          description: 'Include the file contents. Defaults to true.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'panelui_get_component_docs',
    description:
      "A component's documentation page as markdown: anatomy, every prop with its type, the variants, and worked examples. Prefer this over guessing an API.",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component slug, e.g. "select".' },
      },
      required: ['name'],
    },
  },
  {
    name: 'panelui_get_add_command',
    description: 'The command that copies these components into the project.',
    inputSchema: {
      type: 'object',
      properties: {
        names: { type: 'array', items: { type: 'string' }, description: 'Registry names.' },
      },
      required: ['names'],
    },
  },
  {
    name: 'panelui_get_project_info',
    description:
      'How this project is set up: whether it is an Expo app, whether PanelUI is installed as a package or copied in, where components land, which CSS entry Metro compiles, and which components have already been added. Read this first — it decides how the code you write should import things.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function callTool(name, args, options) {
  const registry = registryFor(options);

  switch (name) {
    case 'panelui_list_components': {
      const index = await fetchJson(`${registry}/index.json`);
      const items = discover(index, { type: args.type });
      return items
        .map((item) => `${item.name} (${kindOf(item)}) — ${item.description}`)
        .join('\n');
    }

    case 'panelui_search_components': {
      const index = await fetchJson(`${registry}/index.json`);
      const hits = discover(index, { search: args.query });
      if (!hits.length) return `Nothing matches "${args.query}".`;
      return hits.map((item) => `${item.name} — ${item.description}`).join('\n');
    }

    case 'panelui_view_component': {
      const item = await fetchJson(`${registry}/${args.name}.json`);
      if (!item) return `No registry item called "${args.name}".`;

      const lines = [
        `# ${item.name}`,
        item.description,
        '',
        `Type: ${item.type}`,
        `Depends on: ${item.registryDependencies?.join(', ') || 'nothing else in the registry'}`,
        `npm dependencies: ${item.dependencies?.join(', ') || 'none'}`,
        `Optional npm dependencies: ${item.optionalDependencies?.join(', ') || 'none'}`,
      ];

      if (args.includeSource !== false) {
        for (const file of item.files) {
          lines.push('', `## ${file.path}`, '', '```tsx', file.content, '```');
        }
      }

      return lines.join('\n');
    }

    case 'panelui_get_component_docs': {
      const index = (await fetchJson(`${registry}/index.json`)) ?? [];
      const item = index.find((candidate) => candidate.name === args.name);
      const docsPath = docsPathFor(item, args.name);
      if (!docsPath) {
        return `"${args.name}" is not a component name. Run panelui_search_components to find one.`;
      }
      const url = `${docsOrigin(registry)}/llms.mdx/${docsPath}`;
      const documentation = await fetchText(url);
      if (documentation === null) {
        return `No documentation page at ${url}. The component may be filed under charts, ai-components or form — try panelui_view_component instead.`;
      }
      return documentation;
    }

    case 'panelui_get_add_command':
      return `npx panelui-cli@latest add ${args.names.join(' ')}`;

    case 'panelui_get_project_info':
      return JSON.stringify(projectInfo(options.cwd), null, 2);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/** Where components live, or null when the config does not say something usable. */
function safeComponentsDir(cwd, config) {
  try {
    return projectPath(
      cwd,
      aliasToDir(config.aliases?.components ?? '@/components/ui'),
      'Components path'
    );
  } catch {
    return null;
  }
}

/**
 * What an agent needs to know before it writes a line: which of the two ways
 * of consuming the library this project uses, and where things go.
 */
function projectInfo(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  const hasPackageJson = fs.existsSync(pkgPath);
  const manifest = hasPackageJson ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {};
  const deps = { ...manifest.dependencies, ...manifest.devDependencies };
  const config = hasPackageJson ? readConfig(cwd) : null;

  /*
   * Contained like every other configured path, even though nothing here
   * writes: what is read is listed back to an agent, and an alias pointing at
   * a directory outside the project turns a question about this project into
   * a listing of somewhere else. An unusable alias reports nothing rather than
   * throwing — the rest of the answer is still worth having, and this is the
   * call an agent makes before it knows anything at all.
   */
  const componentsDir = config ? safeComponentsDir(cwd, config) : null;

  return {
    cwd,
    isExpo: 'expo' in deps,
    // The two ways in. They can both be true; a project that installs the
    // package and forks one component is a normal thing to be.
    installedAsPackage: 'panelui-native' in deps,
    usesCopiedSource: Boolean(config),
    hasTypeScript: 'typescript' in deps || fs.existsSync(path.join(cwd, 'tsconfig.json')),
    packageManager: manifest.packageManager ?? null,
    registry: config?.registry ?? DEFAULT_REGISTRY,
    aliases: config?.aliases ?? null,
    cssEntry: config?.css ?? null,
    componentsDir: componentsDir && fs.existsSync(componentsDir) ? componentsDir : null,
    addedComponents:
      componentsDir && fs.existsSync(componentsDir)
        ? fs
            .readdirSync(componentsDir)
            .filter((file) => /\.tsx?$/.test(file))
            .map((file) => file.replace(/\.tsx?$/, ''))
            .sort()
        : [],
    reanimated: deps['react-native-reanimated'] ?? null,
    uniwind: deps.uniwind ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * JSON-RPC 2.0 over stdio, one message per line.
 * ------------------------------------------------------------------ */

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

/*
 * A client that goes away mid-write gives us EPIPE, which is an unhandled
 * 'error' on the socket and takes the process down with a stack trace. There
 * is nothing to report to — the thing that would read it is what closed — so
 * this exits quietly instead.
 */
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

function result(id, value) {
  send({ jsonrpc: '2.0', id, result: value });
}

function failure(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handle(message, options) {
  const { id, method, params = {} } = message;

  // A notification has no id and takes no reply — `notifications/initialized`
  // is the one every client sends, and answering it is a protocol error.
  if (id === undefined) return;

  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion;
      if (typeof requested !== 'string') {
        return failure(id, -32602, 'Invalid params: protocolVersion must be a string');
      }

      return result(id, {
        protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'panelui', version: pkg.version },
        instructions:
          'PanelUI components for Expo. Call panelui_get_project_info first — it says whether ' +
          'to import from the `panelui-native` package or from copied source, and which ' +
          'components already exist. Then panelui_search_components before writing any custom ' +
          'UI, and panelui_get_component_docs before using one.',
      });
    }

    case 'tools/list':
      return result(id, { tools: TOOLS });

    case 'tools/call':
      try {
        const text = await callTool(params.name, params.arguments ?? {}, options);
        return result(id, { content: [{ type: 'text', text }] });
      } catch (err) {
        // A failed tool is reported as a result with isError, not as a
        // protocol error: the model is supposed to see it and try something
        // else, and a JSON-RPC error never reaches it.
        return result(id, {
          content: [{ type: 'text', text: `${err.message}` }],
          isError: true,
        });
      }

    case 'ping':
      return result(id, {});

    default:
      return failure(id, -32601, `Method not found: ${method}`);
  }
}

async function receive(line, options) {
  const text = line.trim();
  if (!text) return;

  let message;
  try {
    message = JSON.parse(text);
  } catch {
    failure(null, -32700, 'Parse error');
    return;
  }

  await handle(message, options);
}

export async function mcp(options) {
  process.stdin.setEncoding('utf8');

  let buffer = '';
  for await (const chunk of process.stdin) {
    buffer += chunk;

    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      await receive(line, options);
    }
  }

  await receive(buffer, options);
}

/* ------------------------------------------------------------------ *
 * `mcp init` — the config file, per editor.
 * ------------------------------------------------------------------ */

const EDITOR_CONFIGS = {
  claude: { file: '.mcp.json', label: 'Claude Code' },
  cursor: { file: '.cursor/mcp.json', label: 'Cursor' },
  vscode: { file: '.vscode/mcp.json', label: 'VS Code' },
};

const SERVER_ENTRY = { command: 'npx', args: ['-y', 'panelui-cli@latest', 'mcp'] };

/**
 * Merge the server into whatever config is already there rather than replacing
 * it — these files usually have other servers in them, and losing those is not
 * a reasonable price for adding one.
 */
export function mcpInit(options, editor = 'claude') {
  const target = EDITOR_CONFIGS[editor];
  if (!target) {
    throw new Error(
      `Unknown editor "${editor}". Try: ${Object.keys(EDITOR_CONFIGS).join(', ')}.`
    );
  }

  const file = path.join(options.cwd, target.file);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};

  // VS Code names the map `servers`; everyone else uses `mcpServers`.
  const key = editor === 'vscode' ? 'servers' : 'mcpServers';
  existing[key] = { ...existing[key], panelui: SERVER_ENTRY };

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(existing, null, 2) + '\n');

  return { file: target.file, label: target.label };
}
