# Examples

Components built on the engine. They are references, not a menu: install one when it is exactly what the user asked for, and otherwise write your own and borrow technique from the closest one. Each installs as plain source into `components/dithercn/<name>.tsx`, so you can read its field or SVG. Install one with:

```bash
npx shadcn@latest add https://dithercn.dev/r/<name>.json
```

Each docs page (the `.md` link) has usage, every prop and in-context examples. Read the installed source for the field and the technique.

## Backgrounds

- `aurora`: Curtains of light that fold, sway and shimmer, drawn as a dither, with props for colours, curtains, rays, tilt, drift and masks. Docs: https://dithercn.dev/docs/backgrounds/aurora.md
- `beams`: God rays from a point or an edge that sweep slowly and fade with distance. Docs: https://dithercn.dev/docs/backgrounds/beams.md
- `contours`: A topographic map: contour lines over slowly drifting hills, with heavier index lines and a light hillshade. Docs: https://dithercn.dev/docs/backgrounds/contours.md
- `dither-fade`: A dithered edge that fades a section's content into a solid colour. Docs: https://dithercn.dev/docs/backgrounds/dither-fade.md
- `dither-globe`: A rotating dithered globe with land, a lit terminator, and optional pulsing markers and arcs. Docs: https://dithercn.dev/docs/backgrounds/dither-globe.md
- `dither-glow`: A soft dithered spotlight from an edge, a corner or any point, for heroes and cards. Docs: https://dithercn.dev/docs/backgrounds/dither-glow.md
- `dither-gradient`: A linear, radial or conic gradient drawn as a dither, with a slow noise drift. Docs: https://dithercn.dev/docs/backgrounds/dither-gradient.md
- `dither-orb`: A lit, dithered orb that slowly morphs and leans towards the pointer. Docs: https://dithercn.dev/docs/backgrounds/dither-orb.md
- `dot-map`: A flat world map in dithered dots with pulsing markers, dithered halos and dotted arcs. Docs: https://dithercn.dev/docs/backgrounds/dot-map.md
- `eclipse`: A dark disc with a glowing rim and a soft corona that breathes slowly. Docs: https://dithercn.dev/docs/backgrounds/eclipse.md
- `halftone`: Print-style round dots on a rotated grid that grow with a noise, radial or linear source. Docs: https://dithercn.dev/docs/backgrounds/halftone.md
- `horizon`: A planet's horizon from space: a lit rim, a drifting aurora glow and fixed stars. Docs: https://dithercn.dev/docs/backgrounds/horizon.md
- `mesh-gradient`: Three to five colour blobs that drift and blend, drawn as a dither. Docs: https://dithercn.dev/docs/backgrounds/mesh-gradient.md
- `metaballs`: Soft blobs that drift, merge and split like a lava lamp, as shaded shapes or rings of contour lines. Docs: https://dithercn.dev/docs/backgrounds/metaballs.md
- `noise-field`: A slow, folding noise texture in four styles (smoke, ridges, contours, marble), with a sized mask that clears space for text. Docs: https://dithercn.dev/docs/backgrounds/noise-field.md
- `plasma`: Classic plasma: overlapping sine waves that flow into each other, dithered in two colours or a palette. Docs: https://dithercn.dev/docs/backgrounds/plasma.md
- `retro-grid`: A perspective grid floor scrolling towards a horizon under a striped, glowing sun. Docs: https://dithercn.dev/docs/backgrounds/retro-grid.md
- `ridgelines`: Stacked ridge lines like a pulsar plot, each hiding the ones behind it, with peaks that shift slowly. Docs: https://dithercn.dev/docs/backgrounds/ridgelines.md
- `ripples`: Concentric rings spreading from one to four points and crossing like drops on still water. Docs: https://dithercn.dev/docs/backgrounds/ripples.md
- `silk`: Folds of silk catching the light, with a bright highlight along each crest. Docs: https://dithercn.dev/docs/backgrounds/silk.md
- `smoke`: Soft smoke billowing upward and thinning out, lit from above, with props for scale, height, wind and density. Docs: https://dithercn.dev/docs/backgrounds/smoke.md
- `starfield`: Dithered stars in three parallax layers that twinkle and drift slowly. Docs: https://dithercn.dev/docs/backgrounds/starfield.md
- `tunnel`: A slow flight down a tunnel of round or square rings, with spokes along the walls and fog at the vanishing point. Docs: https://dithercn.dev/docs/backgrounds/tunnel.md
- `waves`: Layered swells under a glowing horizon, or thin lines like a sound wave. Docs: https://dithercn.dev/docs/backgrounds/waves.md

## Charts

- `area-chart`: One or more series drawn as a crisp line over a dithered fill that is densest under the line. Docs: https://dithercn.dev/docs/charts/area-chart.md
- `bar-chart`: Vertical bars, grouped or stacked, each filled with a dither and capped with a solid edge. Docs: https://dithercn.dev/docs/charts/bar-chart.md
- `cartesian-chart`: The shared frame behind the area, line and bar charts: scales, axes, the hover readout, the legend and an accessible data table.
- `donut-chart`: A donut or pie chart drawn in dither cells, with a colour and texture per slice, a spotlight and a centre that follows the pointer. Docs: https://dithercn.dev/docs/charts/donut-chart.md
- `gauge`: A radial gauge of dithered blocks that fill in to the value, with the reading in the middle. Docs: https://dithercn.dev/docs/charts/gauge.md
- `heatmap`: A calendar or matrix heatmap built from dither cells: each square steps from a few dots to solid, with a readout and a level scale. Docs: https://dithercn.dev/docs/charts/heatmap.md
- `line-chart`: Lines for one or more series, with optional dithered range bands and point markers. Docs: https://dithercn.dev/docs/charts/line-chart.md
- `progress-bar`: A progress bar built from dither cells: any fill texture with a solid leading edge, stacked parts, step segments and an indeterminate comet. Docs: https://dithercn.dev/docs/charts/progress-bar.md
- `radar-chart`: Series across several axes, drawn as polygons of dither cells whose density steps up ring by ring, with an axis scrub and legend spotlight. Docs: https://dithercn.dev/docs/charts/radar-chart.md
- `sparkline`: A tiny inline trend for tables and stat cards: a line, a dithered area and a dot on the latest value. Docs: https://dithercn.dev/docs/charts/sparkline.md
- `stat-card`: A KPI card with a value, a coloured delta and a dithered trend area on a dotted surface. Docs: https://dithercn.dev/docs/charts/stat-card.md
- `uptime-bar`: A status-page row of daily dithered bars with per-day tooltips and overall uptime. Docs: https://dithercn.dev/docs/charts/uptime-bar.md

## Interface

- `avatar`: A generative avatar drawn from a string as a mirrored dither face on a lit, dithered disc, with an overlapping avatar group. Docs: https://dithercn.dev/docs/interface/avatar.md
- `dither-button`: A button with a lit, dithered surface that brightens on hover and presses in on click, in four fills, two variants and any palette colour. Docs: https://dithercn.dev/docs/interface/dither-button.md
- `dither-card`: A card with a dithered glow in a corner or along an edge and a dithered rim on its border, which can grow on hover. Docs: https://dithercn.dev/docs/interface/dither-card.md
- `divider`: A horizontal or vertical dithered rule with fading ends and an optional label. Docs: https://dithercn.dev/docs/interface/divider.md
- `empty-state`: A lit, dithered illustration (box, magnifier, folder or planet) with a title, a description and an action, for views with nothing in them yet. Docs: https://dithercn.dev/docs/interface/empty-state.md
- `loader`: A small dithered loading indicator: a ring with a comet tail, three dissolving dots, a pulse or a bar. Docs: https://dithercn.dev/docs/interface/loader.md
- `not-found`: A complete 404 block with a big dithered code, a message and actions. Docs: https://dithercn.dev/docs/interface/not-found.md
- `skeleton`: Loading placeholders for blocks, text lines and avatars, drawn in dither, with a dense band that sweeps across or a pulse that steps through the Bayer levels. Docs: https://dithercn.dev/docs/interface/skeleton.md

## Text

- `dissolve-text`: Text that dissolves in through Bayer thresholds by character, word or line, in any order, settling solid or into a dithered texture. Docs: https://dithercn.dev/docs/text/dissolve-text.md
- `dither-number`: An animated number with tabular digits that roll or resolve through a dither, Intl formatting, prefix and suffix, colour and size presets. Docs: https://dithercn.dev/docs/text/dither-number.md
- `dither-text`: Display text whose letters are filled with a dithered gradient, noise, dots or hatching in any palette colour, kept as real, selectable text. Docs: https://dithercn.dev/docs/text/dither-text.md
- `scramble-text`: Text that resolves character by character through dithered blocks and glyphs, with no layout shift, on mount, in view, hover or text change. Docs: https://dithercn.dev/docs/text/scramble-text.md

## Images

- `dither-image`: Any image dithered to a preset (ink, duotone, newsprint, gameboy, riso) or your own palette, resolving from coarse to fine. Docs: https://dithercn.dev/docs/images/dither-image.md
- `dithered-logo`: An SVG or PNG logo redrawn on a pixel grid with exact edges, a dithered fill and an optional shimmer or scan line. Docs: https://dithercn.dev/docs/images/dithered-logo.md
- `image-compare`: A draggable, keyboard-accessible before and after slider between a dithered image and the original or another dither. Docs: https://dithercn.dev/docs/images/image-compare.md
- `logo-marquee`: A looping row or still wall of logos in one dithered treatment, with soft or dithered edge fades. Docs: https://dithercn.dev/docs/images/logo-marquee.md
- `scroll-reveal-image`: An image that sharpens from coarse dithered blocks to the full photo as it scrolls into view. Docs: https://dithercn.dev/docs/images/scroll-reveal-image.md
