# dither-core API

Everything imports from `@/lib/dither` (the project's `lib` alias), except export functions, which live in `@/lib/dither/export`. The installed source in `lib/dither/` is the final word; each export has a doc comment.

## Shared types

```ts
type DitherColor = DitherColorName | string;
// A palette name ("ink" | "blue" | "purple" | "green" | "pink" | "orange" | "red" | "grey"),
// a CSS variable name ("--chart-1"), or any CSS colour ("var(--chart-1)", "oklch(0.7 0.15 272)", "#fff", "transparent").
// Names win over CSS keywords: "red" is the dithercn red.

type DitherPalette = readonly [DitherColor, DitherColor, ...DitherColor[]];
// From tone 0 (paper) to tone 1 (ink). At least two.

type DitherMatrix = "bayer2" | "bayer4" | "bayer8" | "blue-noise";
```

Matrices: `bayer4` is the default, a regular printed crosshatch with 17 tones. `bayer8` has 65 tones and finer gradients. `bayer2` is chunky, 5 tones. `blue-noise` is a 64×64 tile with no visible grid, like film grain; best for large soft surfaces.

`level` (static fills) and tone (shaders) both mean coverage from 0 (no cells inked) to 1 (all). With `bayer4`, `k / 16` inks exactly k of every 16 cells.

## DitherShader

A client component that draws a GLSL field as a dither on a WebGL canvas at one canvas pixel per cell, scaled up with crisp edges.

```tsx
<DitherShader
  field={FIELD} // GLSL defining float field(vec2 uv, vec2 res, float t). See fields.md.
  colorField={COLOR_FIELD} // optional GLSL defining vec3 (or vec4) colorField(vec2 uv, vec2 res, float t): the ink colour per cell. See fields.md#colour.
  uniforms={{ glowCentre: [0.5, 0.2], glowSize: 0.4 }} // declared for you: number → float, [a,b] → vec2, up to vec4
  matrix="bayer4" // default "bayer4"
  levels={17} // tones the field snaps to before dithering, 2 to 256. Default: every tone the matrix draws
  cell={3} // cell size in CSS px. Default: --dither-cell, or 3
  palette={["--dither-paper", "--dither-ink"]} // default
  speed={1} // time multiplier, default 1. Changing it never jumps the motion
  animate // default true. false stops motion: holds the current frame, or draws stillTime if it never moved
  fps={30} // frame cap, default 30
  stillTime={0} // seconds of field time shown under reduced motion, or when animate starts false
  fallback={
    <div className="absolute inset-0 bg-linear-to-t from-dither-ink/30 to-transparent" />
  }
  className="absolute inset-0" // plus any div prop: style, ref, id, data-*
/>
```

- The root is `relative overflow-hidden pointer-events-none`, `aria-hidden` by default. It renders no children: put content in a sibling.
- It sizes to its box. A box with no height draws nothing.
- `fallback` shows before the first frame, without WebGL, and while the shader is far offscreen. Default: flat `palette[0]`. Make it resemble the dither (a CSS gradient in the ink colour).
- Free behaviour: resize observer, whole-device-pixel cells, theme changes re-read the palette, pauses offscreen and in hidden tabs, a still frame under reduced motion, context loss recovery. At most 8 shaders hold a WebGL context at once (`MAX_LIVE_CONTEXTS`); past that, a shader coming on screen takes one from a shader just off screen, never from one still on screen, and waits otherwise, showing `fallback`.
- `data-state` on the root: `running`, `paused` (offscreen or hidden tab), `static` (reduced motion or `animate={false}`), `fallback` (no frame drawn).
- With `colorField`, each cell is either paper (`palette[0]`) or the colour `colorField` returns there; the field's tone still decides which, so density and colour are independent. The rest of the palette is what the `paletteColor(x)` helper reads. Without it, the palette maps tone to colour as before.
- Changing `uniforms`, `palette`, `matrix`, `levels` or `speed` is cheap. Changing the `field` or `colorField` string recompiles, so keep it a module constant and drive variation through uniforms.
- `DitherShaderProps` is exported. A wrapper component usually takes `Omit<DitherShaderProps, "field" | "colorField" | "uniforms" | "fallback">` plus its own props, and spreads the rest.

## Static fills

All server-safe and free after first paint.

### FillPattern (SVG)

```tsx
<svg viewBox="0 0 200 120">
  <defs>
    <FillPattern
      id={id}
      fill="gradient"
      color="blue"
      cell={3}
      ramp={{ edge: "bottom", at: 120, length: 90 }}
    />
  </defs>
  <rect x={0} y={30} width={200} height={90} fill={`url(#${id})`} />
</svg>
```

| Prop     | Type                                                                                            | Default    | Notes                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `id`     | `string`                                                                                        | required   | Use `useId()` so two instances never collide.                                             |
| `fill`   | `"gradient" \| "dotted" \| "hatched" \| "solid"`                                                | required   | `dotted`: a sparse lattice. `hatched`: diagonal lines.                                    |
| `color`  | `DitherColor`                                                                                   | `"ink"`    |                                                                                           |
| `cell`   | `number`                                                                                        | `3`        | In SVG user units. With a scaling `viewBox` the cells scale too.                          |
| `level`  | `number`                                                                                        | `1`        | Gradient only: coverage at the dense edge, or the even coverage without `ramp`.           |
| `floor`  | `number`                                                                                        | `0.0625`   | Gradient: coverage past the fade.                                                         |
| `matrix` | `DitherMatrix`                                                                                  | `"bayer4"` | Gradient only.                                                                            |
| `ramp`   | `{ edge: "top" \| "bottom" \| "left" \| "right"; at: number; length: number; extent?: number }` | none       | Gradient: densest at `edge`, located at coordinate `at`, fading over `length` user units. |

`dotted` and `hatched` have a fixed coverage (a quarter of the cells); vary their strength with `opacity` or the colour. `fill="gradient"` without `ramp` fills one even `level`, like `DitherPattern`.

`DitherPattern` is the older, simpler pattern: `<DitherPattern id level matrix? cell? color? background? />` fills one even `level`, with an optional `background` colour behind the ink. Prefer `FillPattern` unless you need `background`.

For exact pixel cells inside an SVG, give it a `viewBox` in CSS pixels that matches its rendered size (measure with a `ResizeObserver`), or keep the SVG at a fixed pixel size.

### fillStyle and ditherMaskStyle (DOM)

```tsx
<div className="relative h-2 overflow-hidden rounded-full">
  <div className="absolute inset-y-0 left-0" style={{ width: "62%", ...fillStyle("gradient", { color: "green", edge: "right", length: 40 }) }} />
</div>

<div className="bg-dither-ink absolute inset-0" style={ditherMaskStyle(0.25)} />
```

- `fillStyle(variant, { color?, cell?, edge?, length?, from?, to?, matrix? })` returns a background colour plus a tiled CSS mask. Gradient: dense at `edge` (default `"bottom"`), fading over `length` cells (default 24) from coverage `from` (1) to `to` (0.0625). `cell` is CSS px or any CSS length; default `var(--dither-cell)`.
- `ditherMaskStyle(level, { matrix?, cell? })` masks an element to one even coverage. Pair it with a background colour (`bg-dither-ink`, `bg-dither-blue`).
- Both mask the element's children too, so apply them to an empty layer and put content in a sibling.
- To animate density, cross-fade two layers with `opacity`. The mask itself does not transition.
- Lower level: `ditherMask(level, { matrix?, cell? })` returns a CSS `url()` for `mask-image`; `ditherPath(level, matrix?)` the SVG path of one tile; `ditherRamp({ edge, length, extent?, from, to, matrix? })` a ramp tile.

### Bloom

A soft glow in the fill's colour, `"off" | "low" | "high"`. `--dither-bloom` scales it per theme.

- `<BloomBox color="blue" bloom="low">…</BloomBox>` wraps DOM content in a drop-shadow glow that follows the dithered cells.
- `<BloomGroup bloom="low">{solid copies of shapes}</BloomGroup>` is an SVG group drawn as a blurred glow; render it before the patterned shapes.
- `bloomStyle(color, bloom)` returns `{ filter }` for any element.

## Colours

- `cssColor(color: DitherColor): string`: `"green"` → `var(--dither-color-green, <fallback>)`, `"--x"` → `var(--x)`, others unchanged. Use it for every inline colour.
- `DITHER_COLOR_NAMES`, `SERIES_COLORS` (distinct hues in order, for multi-series data), `seriesColor(color, index)`.
- `useDitherColors(ref, names?)`: resolves colours to `[r, g, b, a]` in [0, 1] and re-resolves on theme change; `null` before mount. Default names `["--dither-ink", "--dither-paper"]`.
- `resolveColor(color, el?)`: one-off resolution in the browser.
- Tailwind utilities from the tokens: `bg-dither-ink`, `text-dither-paper`, `bg-dither-blue`, `text-dither-green` and so on.

## Motion

- `useFrameLoop((time, delta) => { … }, { target?: ref, enabled?: true, fps?: 30, stillTime?: 0 })`: a rAF loop that runs only while `target` is on screen and the tab is visible. Under reduced motion or `enabled: false` it calls once with `(stillTime, 0)`. Returns `"running" | "paused" | "static"`. Use it for canvas or DOM animation you write yourself.
- `usePrefersReducedMotion()`, `useInView(ref, { rootMargin? })`, `useDocumentVisible()`.
- `MOTION`: `{ ease: "cubic-bezier(0.23, 1, 0.32, 1)", fast: 150, base: 240, slow: 600 }` (ms) for CSS transitions.

## Images

```ts
const out = ditherImage(context.getImageData(0, 0, w, h), {
  method: "atkinson", // "bayer4" | "bayer8" | "blue-noise" | "floyd-steinberg" | "atkinson" | "sierra-lite"
  palette: [
    [0.04, 0.04, 0.06],
    [0.55, 0.62, 1],
  ], // RGB in [0, 1], nearest colour wins
  threshold: 0.5,
});
context.putImageData(out, 0, 0);
```

Returns a new `ImageData`; the input is untouched. Draw the image at one pixel per cell (scale it down first), dither, then show the canvas scaled up with `image-rendering: pixelated`. Get theme colours for the palette from `useDitherColors`. Error-diffusion methods move dots everywhere when the input changes, so use them for still images and ordered methods for anything animated. Over about 512×512, run it in a Web Worker.

## Export

`import { toPNG, toSVG, toCSS, download, svgDataUrl } from "@/lib/dither/export"`. The skill installs it; if `lib/dither/export.ts` is missing, run `npx shadcn@latest add https://dithercn.dev/r/dither-export.json`.

- `toPNG(source: HTMLCanvasElement | PixelBuffer, { scale? }): Promise<Blob>`: crisp upscale by a whole number. Browser only.
- `toSVG(source: PixelBuffer | { width, height, indices }, { cell?, palette?, background? }): string`: merged runs, pure string.
- `toCSS({ level, matrix?, cell?, ink?, paper?, mode?: "background" | "mask", selector? })`: one CSS rule that tiles a dither, no JavaScript at runtime. `mode: "mask"` paints with `ink` and accepts CSS variables; `"background"` bakes a literal ink colour into the tile.
- `toCSS({ kind: "image", image, format?: "png" | "svg", selector? })`: a whole dither as a covering background.
- `download({ data, filename, type? })` saves a Blob or string.

To export what a `DitherShader` shows, compute the same tones on the CPU into a `PixelBuffer` and run `ditherImage` with an ordered method: the shader's WebGL canvas does not keep its pixels after drawing.
