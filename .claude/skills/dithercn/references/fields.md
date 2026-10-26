# Writing a field

A field is the one GLSL function you write for `DitherShader`. It returns a tone for one cell; the engine snaps it to `levels`, compares it with the matrix threshold for that cell, and paints the matching palette colour.

```glsl
float field(vec2 uv, vec2 res, float t) {
  // uv:  the cell centre, 0 to 1 on both axes, (0, 0) bottom left, y up
  // res: the canvas size in cells (columns, rows)
  // t:   seconds of motion, already multiplied by `speed`; stillTime under reduced motion or when motion starts off; held where it was when animate turns false
  return uv.y; // 0 = paper (palette[0]), 1 = ink (palette[last])
}
```

The return value is clamped to [0, 1]. With a palette of more than two colours, the tone spreads across them: with four colours, 0.5 sits between the second and third. On its own, the tone sets both the dot density and the colour. To colour the dots independently (a rainbow, a hue per shape, colour that moves), add a `colorField`: see [Colour](#colour) below.

## The rules of the language

- WebGL 1, GLSL ES 1.00. Every literal used as a float needs a decimal point: `2.0`, not `2`. `int` and `float` never mix without a cast: `float(i)`.
- Loops need constant bounds: `for (int i = 0; i < 5; i++)`. Break early with `if (float(i) >= count) break;` when the count is a uniform.
- No arrays in uniforms. Pass up to four numbers per uniform (`vec4`) and use several uniforms.
- Write helpers above `field` in the same string. Give them a prefix from your component (`topoHeight`, `meterArc`) so they never collide with another field's names.
- Reserved: uniforms starting with `u_`, helpers starting with `dither_`, and the names `field`, `colorField`, `main`, `hash21`, `snoise`, `fbm`, `spectrum`, `paletteColor`.
- GLSL ES 1.00 keeps more words than it uses, and none of them compile as names: `asm`, `cast`, `class`, `default`, `double`, `enum`, `extern`, `external`, `fixed`, `flat`, `goto`, `half`, `inline`, `input`, `interface`, `long`, `namespace`, `noinline`, `output`, `packed`, `public`, `short`, `sizeof`, `static`, `superp`, `switch`, `template`, `this`, `typedef`, `union`, `unsigned`, `using`, `volatile`, the vector types `hvec2` to `hvec4`, `dvec2` to `dvec4` and `fvec2` to `fvec4`, and the sampler types `sampler1D`, `sampler3D`, `sampler1DShadow`, `sampler2DShadow`, `sampler2DRect`, `sampler3DRect` and `sampler2DRectShadow`. Names starting with `gl_`, `webgl_` or `_webgl_`, or containing `__`, are reserved too. Built-in function names (`dot`, `step`, `mix`, `length`, `distance`, `smoothstep`, `noise`) can't be reused for variables either. Prefixed names (`topoHalf`, `waveStep`) avoid all of them.
- A broken field logs `[dither-core] shader failed to compile` with the line and the error, and the component stays on its fallback. Read that log, fix the GLSL, reload.

## Built-in helpers

Available in every field without declaring them:

| Helper                       | Returns                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `float hash21(vec2 p)`       | A stable pseudo-random value in [0, 1). `hash21(floor(p))` gives one value per grid square.                                   |
| `float snoise(vec2 p)`       | 2D simplex noise in [-1, 1], feature size about 1 unit of `p`.                                                                |
| `float fbm(vec2 p)`          | Four octaves of simplex noise, in [0, 1], mean 0.5. Soft, cloudy, natural.                                                    |
| `vec3 spectrum(float h)`     | A saturated rainbow: 0 red, then yellow, green, cyan, blue, magenta, and red again at 1. Wraps, so `h` can grow with time.    |
| `vec4 paletteColor(float x)` | The palette's ink colours (every entry after `palette[0]`) as a smooth ramp from 0 to 1. Theme colours inside a `colorField`. |

## Uniforms

Pass anything the user should control as a uniform, never by rebuilding the string:

```tsx
<DitherShader
  field={FIELD}
  uniforms={{ topoScale: scale, topoLines: lines, topoFocus: [0.7, 0.4] }}
/>
```

`topoScale` becomes `uniform float topoScale;`, `topoFocus` becomes `uniform vec2 topoFocus;`. They are declared for you; declaring them yourself is a compile error. Names are GLSL identifiers and must not start with `u_`. Prefix them like helpers.

## Coordinates

Most shapes need square units. Start every field that measures distance with:

```glsl
float aspect = res.x / res.y;
vec2 p = vec2(uv.x * aspect, uv.y);         // x 0..aspect, y 0..1, square units
vec2 c = (uv - 0.5) * vec2(aspect, 1.0);    // centred: (0, 0) in the middle, y -0.5..0.5
```

A point given from the top left, as CSS does (`[x, y]` with y down), converts with `vec2(x * aspect, 1.0 - y)`.

To scale a pattern in screen terms, multiply `p` (bigger number, smaller features). To keep a pattern the same size in pixels whatever the box size, use `uv * res / 40.0` (one unit per 40 cells).

Rotate: `vec2 r = mat2(cos(a), -sin(a), sin(a), cos(a)) * c;`

## Building blocks

Each snippet returns a tone in [0, 1] or a helper value. Combine with `max` (union), `min` (intersection), `*` (mask one by another), `mix` (blend), and `+` then `clamp`.

### Gradients

```glsl
float linear = uv.y;                                       // bottom to top
float angled = clamp(dot(uv - 0.5, vec2(cos(a), sin(a))) + 0.5, 0.0, 1.0);
float radial = 1.0 - smoothstep(0.0, 0.6, length(c));      // centre glow, 0.6 is the radius
float glow = exp(-dot(c, c) * 8.0);                        // soft gaussian light, larger number = tighter
float edgeFade = smoothstep(0.0, 0.35, uv.y);              // dissolve towards the bottom edge
```

### Noise and texture

```glsl
float clouds = fbm(p * 3.0 + vec2(t * 0.04, 0.0));         // drifting clouds
float grain = hash21(floor(uv * res));                     // per-cell noise, use with care: it flickers if t is added
float ridges = 1.0 - abs(snoise(p * 2.5));                 // sharp ridges
float warped = fbm(p * 2.0 + 0.6 * vec2(fbm(p * 1.5 + t * 0.03), fbm(p * 1.5 - t * 0.02)));
```

### Lines and contours

The trick for thin lines: measure the distance to the line in cells, then turn it into a tone that is 1 on the line and 0 a cell or two away. Distances in cells keep lines the same thickness at any box size.

Lines need a smooth source. `fbm`'s fine octaves wiggle faster than a line is wide, so contours of raw `fbm` at a high scale break into dots. Use one or two low-frequency `snoise` layers (`0.5 + 0.35 * snoise(p * 0.9) + 0.15 * snoise(p * 2.1)`), or `fbm` at a small scale (`fbm(p * 1.2)`), and add detail by warping the coordinates rather than the height.

```glsl
// Contour lines of a height function. `count` lines across the 0..1 height range,
// each about `width` cells wide. hx and hy are the height one cell to the right
// and one cell up, so the line keeps its width where the slope changes.
float contourLine(float h, float hx, float hy, float count, float width) {
  float v = h * count;
  float offset = abs(fract(v + 0.5) - 0.5); // distance to the nearest line, in contour steps
  float perCell = max(length(vec2(hx - h, hy - h)) * count, 1e-4);
  float d = offset / perCell; // the same distance, in cells
  float line = 1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, d);
  // On flat ground the slope is near zero and a line would spread into a blob:
  // only cells within a tenth of a step of the line can ink.
  return line * (1.0 - smoothstep(0.06, 0.1, offset));
}

// In the field, with p in square units (one cell is 1.0 / res.y on both axes):
//   float h  = myHeight(p);
//   float hx = myHeight(p + vec2(1.0 / res.y, 0.0));
//   float hy = myHeight(p + vec2(0.0, 1.0 / res.y));
//   float lines = contourLine(h, hx, hy, 12.0, 1.5);
// floor(h * count + 0.5) is the index of the nearest line, for emphasising every fifth.
```

Simpler lines:

```glsl
float stripes = 0.5 + 0.5 * sin(p.x * 40.0);                          // soft bands
float grid = max(1.0 - smoothstep(0.0, 1.5, abs(fract(uv.x * res.x / 24.0 + 0.5) - 0.5) * 24.0),
                 1.0 - smoothstep(0.0, 1.5, abs(fract(uv.y * res.y / 24.0 + 0.5) - 0.5) * 24.0)); // 1-cell lines every 24 cells
float ring = 1.0 - smoothstep(0.0, 2.0 / res.y, abs(length(c) - 0.3)); // a circle of radius 0.3, about 2 cells wide
```

### Shapes

```glsl
float disc = 1.0 - smoothstep(r - 0.01, r + 0.01, length(c));
float box = 1.0 - smoothstep(0.0, 0.01, max(abs(c.x) - halfW, abs(c.y) - halfH));
// An arc from angle 0 at the top, clockwise, covering `amount` of the circle (0 to 1).
float arcAngle = fract(atan(c.x, c.y) / 6.2831853);    // 0 at 12 o'clock, clockwise to 1
float arc = step(arcAngle, amount) * (1.0 - smoothstep(0.0, 2.0 / res.y, abs(length(c) - radius) - thickness * 0.5));
```

### Shading a shape

A flat 1.0 inside a shape reads as a solid block. Give it depth so the dither shows:

```glsl
float shaded = disc * mix(0.35, 1.0, smoothstep(-0.3, 0.3, c.y + c.x * 0.4)); // lit from the top right
float rim = disc * smoothstep(r * 0.6, r, length(c));                          // denser at the edge
```

## Motion

- Drift a pattern by adding `t * speed` to its coordinates: `fbm(p * 3.0 + vec2(t * 0.04, t * 0.01))`. Speeds of 0.01 to 0.08 units per second read as calm.
- Pulse with `sin(t * 0.5)`, kept small: `1.0 + 0.05 * sin(t * 0.4)`.
- Ordered dithering is stable: a cell only changes when its tone crosses its threshold, so slow fields animate calmly. Avoid `hash21` of anything with `t` in it; it flickers every frame.
- `stillTime` sets the frame shown under reduced motion. Pick one where the shapes look composed, often a few seconds in.

## Tuning the look

- Too dark or too busy behind text: multiply the tone (`* 0.6`) or fade it under the text area with `smoothstep` on `uv`.
- Banded and posterised on purpose: `levels={4}` to `levels={6}`.
- Smoother gradients: `matrix="bayer8"`, or `"blue-noise"` for large soft fields.
- Bigger dots for a bolder look: `cell={4}` to `cell={6}`. Fine grain: 2 to 3.
- A shape that is solid ink: lower its peak tone to 0.7 to 0.9 so the dither pattern shows inside it, or shade it.

## Colour

`colorField` is an optional second function, passed as its own prop. It returns the colour of the dots in a cell; `field` still decides whether a cell has a dot. Cells without a dot are paper, `palette[0]`.

```tsx
const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  vec2 c = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  float ring = abs(length(c) - 0.3);
  return exp(-ring * ring * 900.0); // a thin glowing ring
}
`;

const COLOR_FIELD = `
vec3 colorField(vec2 uv, vec2 res, float t) {
  vec2 c = (uv - 0.5) * vec2(res.x / res.y, 1.0);
  return spectrum(atan(c.y, c.x) / 6.28318 + t * 0.05); // hue runs around it
}
`;

<DitherShader
  field={FIELD}
  colorField={COLOR_FIELD}
  palette={["--background", "--foreground"]}
  className="absolute inset-0"
/>;
```

- Same arguments as `field`, and the same uniforms. Return `vec3` RGB or `vec4` RGBA in [0, 1]; alpha below 1 lets the page show through the dots.
- `field` and `colorField` compile into one shader, `field` first. When both need the same geometry (which line is nearest, which shape a cell is in), write it as a helper and call it from both. Define it in the `field` string, or prepend the same helpers string to both: the engine keeps one copy of a definition that appears word for word in both. Two different definitions with the same name fail with `function already has a body`.
- Glows still work: a soft tone gives sparse dots, and each dot takes the colour, so a coloured glow fades out in dots rather than in a darker colour.
- Without `colorField`, nothing changes: the palette maps tone to colour.
- If TypeScript says `Property 'colorField' does not exist`, the project's engine predates it. Update it as SKILL.md's first step shows; never work around it with a palette of hues.

Building blocks, each the body of a `colorField`:

| Colour                                          | GLSL                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Rainbow across the box                          | `return spectrum(uv.x);`                                                                              |
| Rainbow along a line or beam, drifting          | `return spectrum(uv.x * 0.8 - t * 0.05);`                                                             |
| Rainbow across a beam's thickness (stripes)     | `return spectrum((uv.y - beamY) * res.y / beamCells);`                                                |
| Hue around a centre (a ring, a lens, a dial)    | `vec2 c = (uv - centre) * vec2(res.x / res.y, 1.0); return spectrum(atan(c.y, c.x) / 6.28318);`       |
| One hue per shape                               | `return spectrum(shapeIndex / shapeCount);` with the index from a shared helper                       |
| Theme colours along x, following light and dark | `return paletteColor(uv.x);` with `palette={["--background", "--chart-1", "--chart-2", "--chart-3"]}` |
| A hue that fades out instead of thinning        | `return vec4(spectrum(uv.x), smoothstep(0.0, 0.3, uv.y));`                                            |

`spectrum` is fully saturated, which glows on black and goes thin on white: yellow and cyan nearly vanish. Mix in some of the theme's ink to keep it readable in both modes, `mix(spectrum(h), paletteColor(0.0).rgb, 0.2)` with `palette={["--background", "--foreground"]}`, or darken it for light-only pages.
