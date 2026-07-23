# Docs generation

`content/docs/components/*.mdx` is generated, not hand-written. The props tables, variant lists
and compound parts are read from the library's actual TypeScript source, so they cannot drift
from it.

```bash
S=./scripts node scripts/extract.mjs   # library source -> api.json
S=./scripts node scripts/gen.mjs       # api.json + usage.json -> MDX
```

- `extract.mjs` parses `packages/panelui/src/components/*/index.tsx` for exported prop
  interfaces (with their JSDoc), `tv()` variant keys and defaults, the component's own
  parameter destructuring (for the Default column of non-variant props), and
  `Object.assign` parts.
- `usage.json` holds the parts a parser cannot infer. **This is the file to edit** when a
  component's behaviour changes:

  | Key | What it becomes |
  | --- | --- |
  | `intro` | The paragraph under the frontmatter |
  | `preview` | A framed screenshot under the intro: `{ src, alt, width, height, caption? }`. Put the file in `public/previews/`, and give the real pixel dimensions — Next needs them for the aspect ratio |
  | `usage` | The `## Usage` snippet |
  | `extraImports` | Extra names on the import line — must cover everything the snippets use |
  | `anatomy` / `parts` / `partNotes` | The `## Composition` section |
  | `examples` | `## Examples` — an array of `{ title, description?, code }` |
  | `versions` | `## Versions` — an array of `{ title, description?, code }`, one per `fullPage` demo in `apps/example/src/data/components.tsx`. Only for components that have them |
  | `variantCode` | Per-variant snippet, keyed by variant name. Overrides the generic `<Name variant="x">…</Name>` fallback, which is wrong for components that take no children |
  | `notes` | The `## Notes` section |

- `meta.json` maps each slug to its display name, one-line summary and primary search keyword,
  plus an optional options object: `group` (which sidebar section the page is filed under),
  `addedIn` (the version the component first shipped in — blue dot) and `updatedIn` (the version
  its API last changed in — grey dot). Both dots expire three minor releases later, so neither
  has to be cleared by hand, and neither `status` field is ever written into an MDX file
  directly.
- `gen.mjs` merges the two and writes the MDX.

Every component page must carry worked `examples` — a props table says a prop exists, an
example says what to write. Aim for three to five, covering each variant and every prop whose
behaviour is not obvious from its name, and take them from the demos in
`apps/example/src/data/components.tsx` so they are known to compile.

Run both after any component change, per the docs rule in the repo's `CLAUDE.md`.

## What is *not* generated

Only `content/docs/components/*.mdx`. The pages under `content/docs/hooks/` and
`content/docs/utilities/` are hand-written, and `docs:generate` will not touch
them — `extract.mjs` parses component prop *interfaces*, and a hook's contract
is a function signature with no equivalent to parse. Edit those MDX files
directly.

`index.mdx`, `installation.mdx` and `theming.mdx` are hand-written too.
