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
| Updates | `npm update` | Re-run `add --overwrite`, or keep your edits |
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
left alone — those files are yours once copied.

```bash
npx panelui-cli@latest add item message
npx panelui-cli@latest add button --overwrite
```

### `list`

Everything available, grouped.

```bash
npx panelui-cli@latest list
```

## Options

| Flag | Effect |
| --- | --- |
| `--yes`, `-y` | Accept every prompt |
| `--overwrite` | Replace files that already exist |
| `--dry-run` | Show what would happen, write nothing |
| `--cwd <dir>` | Run against another directory |
| `--registry <url>` | Use a different registry |

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

## Notes

This package has **no dependencies**. Running it with `npx` downloads a few kilobytes.

If components render but are unstyled, the `@source` lines in your CSS entry are missing or
point at the wrong directory — that is what tells Uniwind where to look for class names. Restart
Metro with `--clear` after any change to the theme list.

Full documentation: <https://panelui.dev/docs/cli>
