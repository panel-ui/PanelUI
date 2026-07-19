# PanelUI

High-performance React Native UI library for Expo, published on npm as
[`panelui-native`](https://www.npmjs.com/package/panelui-native).
GitHub: https://github.com/Khalidabdi1/PanelUI

## Architecture

- npm-workspaces monorepo:
  - `packages/panelui` — the library (npm: `panelui-native`). Pure TypeScript, no native code.
  - `apps/example` — Expo SDK 57 showcase app (gallery + 1,000-row perf screen).
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
- Publish: bump version in `packages/panelui`, `npm run build`, `npm publish` (from that dir), tag `vX.Y.Z`

## Conventions

- One folder per component: `packages/panelui/src/components/<name>/index.tsx`; export it from `src/index.ts`.
- `tv()` variant objects at module scope, never inside render.
- Every component: `className` passthrough, accessibility role/state wiring, dark-mode via theme tokens (no hardcoded colors — resolve dynamic colors with `useCSSVariable`).
- Overlays (Dialog, BottomSheet, Select) mount lazily via `Portal` and unmount after exit animations.
- Compound components via `Object.assign` (e.g. `Card.Header`, `Dialog.Content`).
