# The kit

Copy `kit/` into the project and import from it. `iso.ts` and `tones.ts` are
pure TypeScript; `draw.tsx`, `live.ts` and `figure.tsx` need React Native,
react-native-svg, Reanimated and PanelUI.

## iso.ts — geometry

```ts
const CAMERA = camera({ azimuth: 40, elevation: 28 });
const ASPECT = aspectOf(CAMERA, EXTENT); // width / height for FigureCanvas

const view = fitView(CAMERA, EXTENT, width, height, 14); // in useMemo
view.point([x, y, z]);  // world → screen
view.delta([1, 0, 0]);  // screen movement of one unit along x
```

Solids return a `Solid` ready for `<Solid shape={...} />`:

| Function | Makes |
| --- | --- |
| `box(view, { x, y, z, w, d, h, r? }, tone)` | A box standing on the floor, optionally rounded in plan. |
| `cylinder(view, { at, axis, r, length, segments? }, tone)` | A round part along `'x'`, `'y'` or `'z'`, from the centre of one end. |
| `prism(view, frame, plan, length, tone)` | Any convex plan pushed along any axis — a tilted chute, a rotated torso. |
| `sphere(view, centre, r, tone)` | A ball. |

Details return path strings for `<Stroke>`:

| Function | Makes |
| --- | --- |
| `coil(view, { at, axis, r, length, turns })` | `{ back, front }` halves of a spring. |
| `ticks(view, { from, dir, out, count, step, minor, major, every? })` | `{ minor, major }` ruler ticks. |
| `ringFront(view, frame, r, segments?, side?)` | The near (or far) half of a ring round a part. |
| `silhouette(view, { at, axis, r, length })` | The two outside edges of a round part — a glass tube. |
| `halo(view, { x, y, w, d, spread? })` | The shadow a machine stands in. |
| `line`, `polygon`, `polyline`, `hull`, `dots` | The basics. |

For flat content on a face and for anything moving on the UI thread:

- `planeMatrix(view, origin, u, v)` — the `[a, b, c, d, e, f]` map from a
  plane's own coordinates to the screen. Draw a dial face, a scale or a
  section in it with `<OnPlane matrix={...}>`.
- `projector(view)` — the projection as eight numbers, for `projectWith` in a
  worklet, which cannot call `view.point`.

## tones.ts — colour

`shade(palette, tone, light)` and `strokes(palette)` (`edge`, `faint`,
`strong`, `dot`). `usePalette()` in `draw.tsx` reads the palette from the theme.

## draw.tsx — layers and marks

```tsx
<FigureCanvas aspect={ASPECT}>
  {({ width, height }) => (
    <GestureDetector gesture={gesture}>
      <View>
        <IsoStage width={width} height={height}>
          <Layer>{/* static, behind */}</Layer>
          <Layer style={movingStyle}>{/* a moving part, built at rest */}</Layer>
          <Layer>{/* static, in front */}</Layer>
        </IsoStage>
      </View>
    </GestureDetector>
  )}
</FigureCanvas>
```

`Solid`, `Stroke` (`kind`: `edge`, `faint`, `strong`, `accent`), `Fill`, `Dots`,
`Halo`, `OnPlane`. Layers never take touches; put the detector round the stage.

## live.ts — motion

| Export | Use |
| --- | --- |
| `useFigureClock(step, active)` | The frame loop. `step(dt, now)` is a worklet. Stops when inactive or backgrounded. |
| `follow(current, target, rate, dt)` | Frame-rate-independent easing towards a target. |
| `springStep(state, target, { stiffness, damping, mass }, dt)` | A damped spring, sub-stepped. |
| `slideStyle(dx, dy)` | Move a layer. |
| `matrixStyle(m)`, `rotateInPlane(plane, angle, s?, t?)`, `stretchInPlane(plane, k, s?)`, `compose`, `invert` | Turn or stretch a layer about an axis lying in a face. |
| `projectWith(projector, x, y, z)` | World to screen on the UI thread. |
| `useReadout(shared, quantum)` | A model value in React, re-rendering only when its rounded value changes. |
| `useDetents(shared, step)`, `tick()`, `knock()` | Haptics, through `expo-haptics` when installed. |
| `useStillness()` | The reduce-motion setting. |

## figure.tsx — the frame

```tsx
<ApparatusFrame figure={1} title="Spring bench" hint="Drag the carriage, let go." readout={readout} caption="…">
  {canvas}
</ApparatusFrame>
```
