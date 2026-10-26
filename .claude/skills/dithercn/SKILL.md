---
name: dithercn
description: Build any dithered visual with the dithercn engine (dither-core, in lib/dither) in a React or shadcn app. Use when the user wants a dither, a dithered or Bayer or halftone or pixel texture, or a dithered background, hero, chart, meter, card, loader, text or image for a landing page or dashboard, or when code imports lib/dither or components/dithercn.
---

# dithercn

dithercn is a dither engine. `dither-core` (installed into `lib/dither`) turns a tone you compute into ordered dither dots, in your theme's colours, with motion, resizing and reduced motion handled. You build the dither the user asked for on top of it. The dithercn components are examples of what the engine can do, not a menu to pick from. Install one only when it is exactly what the user asked for. Otherwise write your own, and borrow technique from the closest example's source.

## 1. Set up the engine

Find the engine: `lib/dither/index.ts`, under the `lib` alias in `components.json` (imports below use `@/lib/dither`; use the project's alias). If it is missing, install it from the dithercn registry:

```bash
npx shadcn@latest add https://dithercn.dev/r/dither-core.json
```

If it exists, check that it is current: `grep -q colorField lib/dither/shader.tsx` (with the project's path). An engine installed before `colorField` existed lacks it and the `spectrum` and `paletteColor` helpers, and TypeScript reports `Property 'colorField' does not exist`. Replace the engine's files; this keeps the project's `lib/utils.ts` (`yes n` answers no to every question about overwriting a file) and restores `lib/dither/export.ts`:

```bash
rm -rf lib/dither && yes n | npx shadcn@latest add https://dithercn.dev/r/dither-core.json https://dithercn.dev/r/dither-export.json
```

Don't use `--overwrite`: it also replaces `lib/utils.ts`. If the project edited files inside `lib/dither`, tell the user before replacing them.

That also installs `dither-tokens`: the CSS variables `--dither-ink`, `--dither-paper`, `--dither-cell`, `--dither-bloom` and `--dither-color-<name>`, written into the project's global CSS and mapped to the shadcn `--primary` and `--background`. The engine needs React 19 and Tailwind CSS v4.

Done when `lib/dither/index.ts` exists, `lib/dither/shader.tsx` mentions `colorField`, and the global CSS defines `--dither-ink`.

## 2. Pick the technique

| The user wants                                                                                                                        | Use                                                                           | Read                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| A surface whose tone varies per pixel or moves: gradients, glows, noise, contours, waves, rings, any shape you can describe with math | `DitherShader` with a GLSL `field`                                            | [fields.md](references/fields.md)                      |
| A static fill inside SVG shapes: bars, arcs, gauges, meters, rings, icons, maps                                                       | `FillPattern` or `DitherPattern` in `<defs>`, `fill="url(#id)"`               | [engine-api.md](references/engine-api.md#static-fills) |
| A static fill on a DOM element: a block, band, border, progress bar, skeleton                                                         | `fillStyle(variant)` or `ditherMaskStyle(level)` on an empty layer            | [engine-api.md](references/engine-api.md#static-fills) |
| Many hues at once: a rainbow, a spectrum, RGB, a different colour per line or shape                                                   | `DitherShader` with a `field` for the shape and a `colorField` for the colour | [fields.md](references/fields.md#colour)               |
| A photo or logo, dithered                                                                                                             | `ditherImage` on canvas pixels                                                | [engine-api.md](references/engine-api.md#images)       |
| A PNG, SVG or CSS file, or a background with no JavaScript                                                                            | `dither-export`                                                               | [engine-api.md](references/engine-api.md#export)       |

Combine them freely: a dashboard card can hold an SVG meter with `FillPattern` over a `DitherShader` glow.

The examples in [examples.md](references/examples.md) (written when the skill is installed; if it's missing, read https://dithercn.dev/.well-known/agent-skills/dithercn/references/examples.md) are references. If the user asked for exactly one of them, install it. If not, write your own: read the closest example's source for its field or SVG, then build the design the user described. Never swap the request for an example that is merely nearby, and never guess at an example's props; read its docs page or source.

Done when every visual in the request has a technique.

## 3. Build it

If the dither is for a landing page, or a section of one, read [landing-pages.md](references/landing-pages.md) before anything else. A good dither on a generic page still looks generated: the page has to be about the product, and the dither has to come from it.

1. Read the reference named for your technique, and [recipes.md](references/recipes.md) for complete, working components to adapt.
2. Write the component in its own file. `"use client"` when it uses `DitherShader`, hooks or a canvas; `FillPattern`, `DitherPattern`, `fillStyle` and `ditherMaskStyle` render on the server.
3. Give it typed props for what the user would tweak (colour, intensity, speed, scale, value), with defaults that already look good.
4. Place it with [placement.md](references/placement.md): a shader fills a positioned parent (`absolute inset-0`), and content sits in a sibling above it.
5. Colour it with [theme.md](references/theme.md): palette names such as `"ink"` and `"blue"`, or CSS variables, so it follows light and dark.

Done when the component renders the requested look with no `[dither-core]` errors in the console.

## 4. Check it in a browser

Open the page and look at it. Screenshot it if you can, at desktop and phone widths, in light and dark mode, and once with reduced motion (`prefers-reduced-motion: reduce`). Hold it to [quality.md](references/quality.md).

Done when every check in quality.md passes. A screenshot that shows flat colour, a solid block or an empty box means the field returns the wrong range or the parent has no size: fix it and look again.

## Rules for every dither

- A field returns a continuous tone in [0, 1]: 0 paper, 1 ink. The engine quantises and dithers it, so write smooth math (`smoothstep`, `exp`, `mix`) and leave thresholds and Bayer matrices to the engine.
- `uv` runs 0 to 1 on both axes with y up. Multiply x by `res.x / res.y` before measuring distances, or circles stretch into ovals.
- Paint with theme colours (`"ink"`, palette names, `--css-variables`). Literal colours, and `spectrum()` in a `colorField`, are for when the user asks for specific colours or a rainbow.
- Text sits on clear ground. Fade the tone down where text goes: to 0 for lines and sparse patterns, to 0.2 or less for soft fills. Text contrast stays at 4.5:1 or better.
- Motion is slow, a drift of a few percent of the box per second. Choose `stillTime` so the reduced-motion frame looks finished.
