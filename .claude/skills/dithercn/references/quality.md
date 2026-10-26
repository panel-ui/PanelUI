# Quality checks

Run every check before calling a dither done. Each is something you can see or measure.

## Looks

- The dither pattern is visible: individual cells read at 100% zoom. A screenshot of flat colour means the tone sits at 0 or 1 everywhere; check the field's range.
- Shapes are round where they should be (aspect corrected) and lines keep one width across the box.
- Text over the dither has 4.5:1 contrast against the densest dots behind it.
- The box has the intended size at 1440px and 390px wide, with no horizontal scroll at 390px.
- Light and dark mode both look intentional, not one tuned and one washed out. Dark mode comes from the `.dark` class, not the media query, so toggle the class to check it (see theme.md).

## Motion and accessibility

- With `prefers-reduced-motion: reduce`, the shader root has `data-state="static"` and shows a finished frame (`stillTime`). CSS transitions you add use `motion-safe:` or `motion-reduce:transition-none`. To check it, emulate the setting: `agent-browser set media dark reduced-motion`, Playwright `page.emulateMedia({ reducedMotion: "reduce" })`, or DevTools Rendering → prefers-reduced-motion.
- Decorative dithers are hidden from assistive tech. `DitherShader` sets `aria-hidden` by default; decorative SVGs get `aria-hidden="true"`.
- Data visuals have an accessible name with the value (`role="img"` and `aria-label="Storage: 72% used"`, or `role="meter"` with `aria-valuenow`), and the value is visible as text.
- Nothing flashes more than three times a second. Avoid per-frame random noise.

## Performance

- At most 8 `DitherShader`s are live at a time. For grids of thumbnails or many small pieces, use SVG or CSS fills.
- The `field` string is a module-level constant; options go through `uniforms`.
- Keep fields cheap: `fbm` is four noise calls. A field calling it a dozen times per cell, or with long loops, can drop frames on a phone. Sample a height function three times for contours, not thirty.
- Images are dithered at display size, one pixel per cell, never at full camera resolution.

## Console

- No `[dither-core] shader failed to compile` or `uniform … skipped` errors.
- No hydration warnings: client-only values (theme colours, sizes) are read in effects or hooks, not during render.

## Checking `data-state` in a browser

```js
[...document.querySelectorAll(".group\\/dither")].map((el) => el.dataset.state);
// "running" on screen, "static" under reduced motion, "paused" offscreen, "fallback" when nothing drew
```
