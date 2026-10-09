# panelui-cli

Add [PanelUI](https://panelui.dev) components to an Expo project one at a time — the source
lands in your repo and is yours to edit.

```bash
npx panelui-cli@latest init
npx panelui-cli@latest add button
```

## Two ways to use PanelUI

| | `panelui-native` | `panelui-cli` |
| --- | --- | --- |
| You get | A dependency | Source files in your repo |
| Updates | `npm update` | `update` unchanged files; conflicts keep your edits |
| Editing | Wrap or restyle it | Change the file |
| Install size | Whole library | Only what you add |

Neither is more supported than the other. Take the package if you want updates handled for you;
take the source if you expect to change it.

## Commands

### `init`

Sets the project up: writes `panelui.json`, copies the design tokens, wires the CSS entry and
Metro config, adds the TypeScript path alias and ambient types, and installs the base packages.
Every write shows a diff and asks first.

```bash
npx panelui-cli@latest init
```

### `add <name...>`

Copies components in, along with everything they depend on. A component you already have is
left alone — those files are yours once copied. Re-running the command still installs any missing
packages required by those files.

```bash
npx panelui-cli@latest add item message
npx panelui-cli@latest add button --overwrite
```

Blocks — whole screens built from the components — install the same way and land in
`components/ui/blocks/`, with the components they use beside the rest. `list --type block` shows
them.

Successful writes are recorded in `panelui-lock.json`. `--overwrite` remains the explicit way to
replace an existing file and makes that new copy eligible for later safe updates.

### `update [name...]`

Fetches tracked components again and updates only files whose digest still matches the copy the CLI
installed. Locally edited or deleted files are reported as conflicts and never replaced. Omit names
to update every tracked component. Files removed upstream are deleted only when still untouched.
Before prompting or exiting in preview mode, the command prints three-line-context unified diffs for
every safe changed, added, or removed file. Conflicts are listed but their contents are never printed.

```bash
npx panelui-cli@latest update
npx panelui-cli@latest update button --check
```

`--check` and `--dry-run` never write and exit with status 1 when a safe update or conflict exists.
Projects created before the lockfile are left untouched until an explicit `add <name> --overwrite`
establishes the first trusted digest.

### `list [--type kind] [--search text] [--json]`

Everything available, grouped as UI, charts, blocks, hooks, utilities and theme. Filters use generated
registry metadata; search requires every term and ranks exact names, prefixes, name matches and
description matches in that order. `--json` returns the same deterministically ordered index rows.

```bash
npx panelui-cli@latest list
npx panelui-cli@latest list --type chart
npx panelui-cli@latest list --search "scroll progress" --json
```

Current registries also expose `kind`, documentation `group`, and `stability` (`stable`, `beta` or
`alpha`). Older custom indexes containing only `name`, `type` and `description` remain supported.

### `doctor`

Audits the current project without writing files or installing packages. It checks the PanelUI
configuration and contained paths, aliases, CSS imports and sources, exported Metro wrapper, theme,
Uniwind ambient types, required dependencies, lockfile health, tracked-file digests, registry
provenance, locally installed PanelUI package versions, and statically visible `PanelUIProvider`
wiring. Missing or locally edited tracked files request review; malformed metadata, escaping paths,
and provably incompatible installed versions are errors. No registry request is made.

```bash
npx panelui-cli@latest doctor
npx panelui-cli@latest --cwd ./apps/mobile doctor --json
```

The human report marks confirmed errors with `✗`, warnings with `!`, and checks that need manual
review with `?`. Confirmed errors exit with status 1; healthy, warning, and unknown-only reports exit
with status 0. `--json` returns a versioned object with `status`, counts, and ordered `checks` for CI.
Version checks understand exact versions, `^`, `~`, `>=`, `*`, and `latest`. Other package-manager
specifiers are reported as unknown rather than guessed. Newer readable lock schemas are review-only
while their common tracked-file metadata is still checked.

### `mcp`

Runs PanelUI's [Model Context Protocol](https://modelcontextprotocol.io/) server. An MCP client can
inspect the registry, read component source and documentation, get the matching `add` command, and
check how the current project consumes PanelUI.

```bash
npx panelui-cli@latest mcp
```

The server is a long-running stdio process intended to be launched by an MCP client. Standard input
and output carry newline-delimited JSON-RPC messages; stdout contains no banner or other human-readable
output. It reads project information from `--cwd` (the current directory by default).

Registry lookups use `--registry <url>` first, then the registry in that project's `panelui.json`,
then `https://panelui.dev/r`.
MCP registry and documentation reads require HTTPS, including after redirects; HTTP remains available
only for loopback registries used during local development.

#### `mcp init [claude|cursor|vscode]`

Adds the server to a supported editor's project-level MCP configuration. The editor defaults to
Claude Code when omitted.

| Editor | Command | Config path, relative to `--cwd` |
| --- | --- | --- |
| Claude Code | `mcp init claude` | `.mcp.json` |
| Cursor | `mcp init cursor` | `.cursor/mcp.json` |
| VS Code | `mcp init vscode` | `.vscode/mcp.json` |

```bash
npx panelui-cli@latest mcp init
npx panelui-cli@latest mcp init cursor
npx panelui-cli@latest --cwd ./apps/mobile mcp init vscode
```

The command creates the parent directory when needed and merges a `panelui` server into the existing
JSON instead of replacing other settings or servers. Claude Code and Cursor use the `mcpServers` map;
VS Code uses `servers`. An existing `panelui` entry is updated to run:

```text
npx -y panelui-cli@latest mcp
```

The generated entry does not store one-off CLI options. To pin a registry or working directory for
editor-launched sessions, add `--registry <url>` or `--cwd <dir>` to that server's generated `args`.

## Options

| Flag | Effect |
| --- | --- |
| `--yes`, `-y` | Accept every prompt |
| `--overwrite` | Replace files that already exist |
| `--check` | Check tracked files for updates without writing |
| `--dry-run` | Show what would happen, write nothing |
| `--cwd <dir>` | Run against another directory |
| `--registry <url>` | Use a different registry |
| `--type <kind>` | Filter list results: `ui`, `chart`, `block`, `hook`, `lib` or `theme` |
| `--search <text>` | Rank list results matching every search term |
| `--json` | Print `list` or `doctor` results as stable JSON |

A value-taking flag without its value prints its usage and exits with status 1. No command runs.

## `panelui.json`

```json
{
  "registry": "https://panelui.dev/r",
  "aliases": {
    "components": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "css": "global.css",
  "theme": "theme.css"
}
```

Change the aliases and imports are rewritten to match on the way in.

`panelui-lock.json` records SHA-256 digests, requested roots, and each root's registry dependency
closure. That lets a named update remove an untouched dependency only after no other requested root
needs it. Locally edited files and dependencies shared with another root are always retained. Commit
the lockfile so updates have the same safety baseline everywhere.

Version 1 lockfiles remain readable, but their missing root history makes dependency pruning unsafe.
Run `add <root>` again while its dependencies are still present to migrate that root to version 2;
use `--overwrite` only when you also intend to reset edited files.

## Notes

This package has **no dependencies**. Running it with `npx` downloads a few kilobytes.

If components render but are unstyled, the `@source` lines in your CSS entry are missing or
point at the wrong directory — that is what tells Uniwind where to look for class names. Restart
Metro with `--clear` after any change to the theme list.

Full documentation: <https://panelui.dev/docs/cli>
