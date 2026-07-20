# Docs generation

`content/docs/components/*.mdx` is generated, not hand-written. The props tables, variant lists
and compound parts are read from the library's actual TypeScript source, so they cannot drift
from it.

```bash
S=./scripts node scripts/extract.mjs   # library source -> api.json
S=./scripts node scripts/gen.mjs       # api.json + usage.json -> MDX
```

- `extract.mjs` parses `packages/panelui/src/components/*/index.tsx` for exported prop
  interfaces (with their JSDoc), `tv()` variant keys and defaults, and `Object.assign` parts.
- `usage.json` holds the parts a parser cannot infer: the intro paragraph, the usage example,
  the anatomy tree, per-part descriptions, and notes. **This is the file to edit** when a
  component's behaviour changes.
- `meta.json` maps each slug to its display name, one-line summary and primary search keyword.
- `gen.mjs` merges the two and writes the MDX.

Run both after any component change, per the docs rule in the repo's `CLAUDE.md`.
