# PanelUI

High-performance React Native UI library for Expo, published on npm as
[`panelui-native`](https://www.npmjs.com/package/panelui-native).
GitHub: https://github.com/panel-ui/PanelUI

## Research before you build

**Never design a component, variant, animation, or token from scratch.** Before writing any
component code, read how the problem is already solved by mature libraries, then adapt it to
PanelUI's tokens and conventions. This is not optional.

Where to look, in order:

1. The React Native / Expo component libraries — for native structure, Reanimated usage, gesture
   handling, accessibility props and compound anatomy. Closest to our target; check here first.
2. The web component libraries — for compound-component API shape, prop naming and variant
   taxonomy. Their structure ports; their CSS does not.
3. The design-system references — for token usage and visual language.

The `.claude/skills/` directory holds the pinned references for 2 and 3; invoke them by name
before touching design tokens, `packages/panelui/theme.css`, the docs theming or the landing
page. They carry rules worth not reconstructing — for instance, *never rewrite `--alpha()` to
`rgba()` in the web CSS*: it is a valid Tailwind v4 build-time function, not broken CSS.

If none of them has the component, search the web for other React Native / Tailwind
implementations before inventing an approach.

How to read a repository:

- Use `gh api "repos/<owner>/<repo>/git/trees/main?recursive=1" --jq '.tree[].path'` to locate
  files, then `gh api "repos/<owner>/<repo>/contents/<path>" --jq '.content' | base64 -d` to read
  them. **Prefer `gh` over WebFetch** — `raw.githubusercontent.com` returns 404 for many repos.
- Some libraries ship a `<name>.md` next to each component with the full documented API. Read it
  before the implementation; it is faster and more accurate.

### Never name a reference library in anything we ship or author

This is a hard rule, and it applies to **source comments, JSDoc, README files, docs pages, npm
metadata and commit messages** alike:

- No `Adapted from: <repo>` headers. Write a header comment that explains what the component
  does and *why it is shaped that way* — that is the part worth keeping, and it stays true when
  the upstream changes.
- No "the React Native equivalent of X's Y utility", no "matches Z's animation constants", no
  third-party product names in prose anywhere.
- Docs describe PanelUI's behaviour on its own terms. A reader should never have to know another
  library to understand a page.

Research from them; do not credit them in the artifact. If a reference genuinely needs recording
for future maintainers, it belongs in this file or a commit body — never in shipped code.

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
    panelui.dev). Themed with the same tokens in their web form.
- Styling: **Uniwind** (Tailwind v4 for RN) + `tailwind-variants` for variant APIs.
- Design tokens: semantic values precomputed to static rgba/hex in `packages/panelui/theme.css`
  (native can't evaluate `color-mix()`/`--alpha()` at runtime). The web copy in
  `apps/docs/app/global.css` keeps those expressions intact; keep the two in sync.
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
