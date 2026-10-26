# Putting a dither on a page

## Layering

A `DitherShader` fills its nearest positioned ancestor. Content goes in a sibling, above it:

```tsx
<section className="relative isolate overflow-hidden">
  <TopoBackground className="absolute inset-0 -z-10" />
  <div className="relative mx-auto max-w-3xl px-6 py-32">…</div>
</section>
```

- `isolate` on the section keeps `-z-10` inside it, so the dither never slips behind the page background.
- The section needs height from its content or a `min-h-*`. The shader takes the size it is given; zero height draws nothing.
- Round corners and borders go on the section with `overflow-hidden`, so the canvas is clipped to them.
- The shader ignores the pointer (`pointer-events-none`), so links and buttons above it stay clickable.

## Landing pages

Read [landing-pages.md](landing-pages.md) first: it covers what the page is about and how it is composed. These are the placements.

- **Hero:** a full-bleed background behind the headline. Clear the area under the text (tone 0 for lines and sparse patterns, 0.2 or less for soft fills) and let the dither peak towards the edges or a corner. Fade it out at the bottom with `smoothstep` on `uv.y` so the next section starts clean.
- **Clearing space for text:** measure the text block and clear a rounded box around it, with the box passed to the field as a uniform. [recipes.md](recipes.md#a-hero-that-clears-its-headline) has the complete component. Measured this way the clearing fits the copy on a wide desktop and on a phone alike; an ellipse in `uv` is too big on one and too small on the other, and clips the corners of a text block.
- **Section break:** a band 80 to 160px tall between sections, a dithered gradient from ink at one edge to paper at the other.
- **Feature card:** a small shader or a `fillStyle("gradient")` layer behind a card's top half, under the icon and title.
- **Dark plate:** a hero that is always dark wraps the section in `className="dark"` so `--dither-ink` and `--dither-paper` take the dark values there, whatever the site theme.
- **Behind a big number or headline:** a glow centred on the text. Real text stays HTML on top; never draw text into the field.

## Dashboards

- **Cards and tiles:** charts, meters and gauges are usually static SVG with `FillPattern`. They render on the server, cost nothing after paint and stay sharp. Use a shader in a card only for an ambient glow or a live status surface.
- **Data first:** a meter or chart needs a readable label and value as HTML text, and an accessible name on the SVG (`role="img"` plus `aria-label` with the value, or `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
- **Track and fill:** draw the empty part of a meter or bar with a sparse fill (`level` 0.0625 to 0.125, or `fill="dotted"`) and the value with a dense one, so the empty track is still visible.
- **Many on one page:** prefer SVG and CSS fills. At most 8 shaders hold a WebGL context at once. A shader scrolling onto the screen takes the context of one that has scrolled away; if more than 8 are on screen together, the extras show their fallback until one frees up.
- **Colour meaning:** status colours from the palette (`"green"`, `"orange"`, `"red"`) map to good, warning and critical. Pair colour with a label or icon so it never carries meaning alone.

## Sizing cells

`--dither-cell` sets the grain for the whole page (3px by default). Override it on a wrapper for one section (`style={{ "--dither-cell": "4px" }}`, typed as `React.CSSProperties & Record<"--dither-cell", string>`), or pass `cell` to one component. 2 to 3px reads as texture, 4 to 6px as a deliberate pixel look, 8px and up as pixel art.

## Next.js and server components

- Files that use `DitherShader`, `useDitherColors`, `useFrameLoop` or a canvas start with `"use client"`. A server page imports and renders them like any component.
- `FillPattern`, `DitherPattern`, `fillStyle`, `ditherMaskStyle`, `toCSS` and `toSVG` run on the server.
- Inside a client component, generate SVG pattern ids with `useId()`. In a server component, derive them from a prop or a fixed name that is unique on the page.
