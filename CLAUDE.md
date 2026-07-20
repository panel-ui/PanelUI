# PanelUI

High-performance React Native UI library for Expo, published on npm as
[`panelui-native`](https://www.npmjs.com/package/panelui-native).
GitHub: https://github.com/panel-ui/PanelUI

## Research before you build

**Never design a component, variant, animation, or token from scratch.** Before writing any
component code, read how the problem is already solved upstream, then adapt it to PanelUI's
tokens and conventions. This is not optional.

Reference implementations, in order of relevance:

1. `heroui-inc/heroui-native` — React Native structure, Reanimated usage, gesture handling,
   accessibility props, compound anatomy. Closest to our target; check here first.
2. `shadcn-ui/ui` — compound-component API shape, prop naming, variant taxonomy.
3. `cosscom/coss` — token usage and visual language (our design tokens come from here).

If none of the three has the component, search the web for other React Native / Tailwind
implementations before inventing an approach.

How to read them:

- Use `gh api "repos/<owner>/<repo>/git/trees/main?recursive=1" --jq '.tree[].path'` to locate
  files, then `gh api "repos/<owner>/<repo>/contents/<path>" --jq '.content' | base64 -d` to read
  them. **Prefer `gh` over WebFetch** — `raw.githubusercontent.com` returns 404 for these repos.
- HeroUI Native ships a `<name>.md` next to each component with the full documented API. Read it.

Record what you learned: put a short `Adapted from: <repo> <path>` note in the header comment of
every component file you create or substantially rework.

## Use the skills

Two skills carry rules and CLI flows you are expected to follow rather than reconstruct:

- **`coss`** — invoke it before touching anything built on Coss primitives or Coss tokens: the
  landing page, the docs theming, or any change to `packages/panelui/theme.css`. It covers the
  composition invariants per primitive, the `--font-sans` / `--font-mono` / `--font-heading`
  contract, and rules such as *never rewrite `--alpha()` to `rgba()`* — that is a valid Tailwind v4
  build-time function, not broken CSS.
- **`shadcn`** — invoke it for shadcn registry work (`npx shadcn@latest add …`, presets,
  `components.json`) and for shadcn's composition rules when shaping a component API.

Never hand-write Coss markup without first checking a particle
(`https://coss.com/ui/r/p-<name>-N.json`) for the real composition. The skills exist so the code
matches upstream conventions instead of approximating them.

## Documentation is part of the change

`apps/docs` is the published documentation site. **A component change is not complete until its
docs page is updated in the same commit.**

- Adding a component → add `apps/docs/content/docs/components/<name>.mdx` and register it in the
  sibling `meta.json`.
- Changing a component → update that page's props table, anatomy, variant list and examples. New
  props, renamed variants and changed defaults all count.
- Removing or renaming anything → fix every page that references it.

Props tables are read from the component's actual TypeScript interfaces and their JSDoc in
`packages/panelui/src/components/<name>/index.tsx` — never written from memory. Docs that drift
from the source are worse than no docs, because they are trusted.

## Architecture

- npm-workspaces monorepo:
  - `packages/panelui` — the library (npm: `panelui-native`). Pure TypeScript, no native code.
  - `apps/example` — Expo SDK 57 showcase app (expo-router gallery of every component).
  - `apps/docs` — Fumadocs documentation site + landing page (Next.js, private, deploys to
    panelui.dev). Themed with Coss tokens; landing page built from Coss primitives.
- Styling: **Uniwind** (Tailwind v4 for RN) + `tailwind-variants` for variant APIs.
- Design tokens: **exact Coss UI values** from `cosscom/coss` `packages/ui/src/styles/globals.css`,
  precomputed to static rgba/hex in `packages/panelui/theme.css` (native can't evaluate
  `color-mix()`/`--alpha()` at runtime). Keep this file in sync with Coss if tokens change.
- Animations: Reanimated 4, UI thread only. Never use RN core `Animated`.

## Commands (run from repo root)

- `npm install` — install all workspace deps
- `npm run example` — start the example app (Metro/Expo dev server)
- `npm run typecheck` — typecheck all workspaces
- `npm run build` — build the library with react-native-builder-bob (output: `lib/`)
- `npm run docs` — start the docs site; `npm run build --workspace=docs` for a production build
- Publish: bump version in `packages/panelui`, `npm run build`, `npm publish` (from that dir), tag `vX.Y.Z`

## Git & release

- **Every modification gets its own git commit.** Commit as soon as a logical unit of work is
  done — never batch unrelated changes into one commit, and never leave finished work uncommitted.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`. Scope with the component
  or area where it helps (`feat(toast): …`).
- **When everything the user asked for is finished**, in this order:
  1. `npm run typecheck` and `npm run build` — both must pass.
  2. Bump the version in `packages/panelui/package.json` (minor for new components/tokens, patch
     for fixes) and commit it.
  3. `git push` to `panel-ui/PanelUI`.
  4. **Remind the user to run `npm publish`.** Never publish to npm autonomously — that is the
     user's call, always.

## Conventions

- One folder per component: `packages/panelui/src/components/<name>/index.tsx`; export it from `src/index.ts`.
- `tv()` variant objects at module scope, never inside render.
- Every component: `className` passthrough, accessibility role/state wiring, dark-mode via theme tokens (no hardcoded colors — resolve dynamic colors with `useCSSVariable`).
- Overlays (Dialog, BottomSheet, Select) mount lazily via `Portal` and unmount after exit animations.
- Compound components via `Object.assign` (e.g. `Card.Header`, `Dialog.Content`).
