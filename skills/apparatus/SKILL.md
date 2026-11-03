---
name: apparatus
description: Build an interactive explainer for a React Native or Expo app — a small isometric machine whose working is the idea being explained, drawn with react-native-svg, moved on the UI thread with Reanimated and Gesture Handler, and framed in a PanelUI card with a live readout. Use when someone asks to explain how something works inside an app (a spring animation, rate limiting, a cache, an engine, a cell, an algorithm), wants a how-it-works or onboarding illustration that responds to touch, an interactive diagram or technical drawing on a phone screen, or a "show me how X works" figure, even if they never say "isometric" or "machine". Not for charts of data (use the chart components) or for the web.
license: MIT
compatibility: Expo SDK 57+ or React Native 0.86+ with react-native-svg 15, react-native-reanimated 3 or 4 and react-native-gesture-handler 2+, plus panelui-native (or its CLI copies) for the frame and the theme tokens. expo-haptics is optional.
metadata:
  author: Khalid Abdi
  version: 1.0.0
---

# Apparatus

An apparatus figure explains an idea by building a machine that works the way
the idea works, and letting the reader run it with a finger. The carriage *is*
the animated value; the balls in the magazine *are* the tokens; the piston that
stops at the top *is* top dead centre. The reader understands the idea because
they recognise the machine, and every number the figure shows comes from the
same model that moves its parts.

Five complete figures ship in `examples/`. Open the closest one before you
start — each is a `model.ts`, a `geometry.ts` and a `figure.tsx`, and the three
files are the shape every figure should have.

| Example | Idea | Machine | The reader |
| --- | --- | --- | --- |
| `spring-bench` | Spring animation | A carriage on a rail, a coil, an oil dashpot, a pen on a paper strip | Drags the carriage and lets go; turns two knobs |
| `flywheel` | Momentum scrolling | A flywheel driving a strip of rows, a brake with a rate knob | Flicks the wheel; touches it to stop |
| `token-hopper` | Rate limiting | A glass magazine of balls, a feeder, a gate, a chute, a tray, a bin | Taps to send requests, fast enough to be refused |
| `car-engine` | A four-stroke engine | An inline four cut open: pistons, rods, crank, valves, spark | Turns the crank by hand; sets the throttle |
| `human-cell` | Cellular energy | A cell on a slide, cut in half; a transporter, mitochondria | Feeds it glucose and watches where ATP is made |

## The one rule

**The machine is the explanation.** No boxes with labels, no arrows, no words
inside the drawing. Invent a real, well-made object whose mechanism maps one to
one onto the idea, and say in one sentence what moves and what that motion
means. If the mapping needs a caption to make sense, the object is wrong.

| Idea | Object |
| --- | --- |
| A value easing towards a target | A carriage pulled by a spring through oil |
| Requests limited to a rate | Balls fed into a magazine at a fixed rate, taken one per pull |
| A fling that decays | A flywheel with a brake |
| A list that reuses its rows | A belt of trays passing a window, relabelled behind the casing |
| Debouncing | A weight lifted by each tap, sinking through oil, ringing a bell only at the bottom |
| A cache hit | A pigeonhole rack with a clerk who checks it before walking to the archive |

Two ways this fails: **too abstract** (slabs and plates that are not anything)
and **too flat** (one big shape with a few lines on it). The cure for both is a
recognisable machine built from many small, purposeful parts.

## Sizes

Name the size before anything else. On a phone the budget is frame time, not
just effort.

- **Sketch** — one moving part, 20–40 parts, about 250 paths. For an inline
  illustration or an onboarding step.
- **Figure** — one mechanism, 40–80 parts, up to about 600 paths and 8–14
  layers. The default; build it without asking.
- **Showpiece** — several mechanisms or a whole machine, 80–150 parts. Say how
  long it will take and ask before starting.

## Workflow

1. **Size it.** As above.
2. **Write the truth first.** Collect the real numbers and behaviour — counts,
   rates, ratios, curves. Put them in a pure `model.ts` with no React Native
   import: the motion, the readout and the caption all come from it. If the
   figure slows time down to be followable, the caption says so; the counts
   never change.
3. **Invent the machine.** One sentence: what moves, and what that motion means.
4. **List the parts.** At least 40 for a Figure, grouped: base (plate, feet,
   screws, a halo), structure (frames, posts, blocks, rails), mechanism, the
   controls, and the subject — the one part in the accent tone. Every part sits
   on another part. `references/craft.md` has a vocabulary of parts.
5. **Plan the world.** World units are about one point of the real object; `x`
   and `y` on the floor, `z` up. Pick the camera (azimuth 25–50°, elevation
   26–32°) so the side that shows the mechanism faces the reader. List the
   `EXTENT` points — the machine at its widest pose, every moving part included.
6. **Build the geometry once.** A `geometry.ts` that turns a `View` into paths
   and solids, called in `useMemo` keyed on the canvas size. Moving parts are
   built at rest and moved as layers.
7. **Paint back to front.** Split the stack into layers wherever a moving part
   passes between two static ones. See "Painter's order" in `references/craft.md`.
8. **Frame it.** `ApparatusFrame` from `kit/figure.tsx`: title and figure number
   on top, the readout and a one-line hint below, a caption under the card.
9. **Make it live.** One frame loop on the UI thread stepping the model; layers
   styled from it. `references/motion.md`.
10. **Make it accessible.** A role, a label, a value read from the model, and
    actions for everything a finger can do. `references/accessibility.md`.
11. **Verify on a device or simulator, in motion.** Not a still: record it and
    read the frames. `references/verify.md` is the checklist, and every item on
    it is there because a figure shipped without it once.

## Rules that are easy to break

These are the faults that have actually been made with this skill. Each one
looked fine in a still and was wrong in motion.

- **Things leave through openings.** A ball that leaves a gate comes out of the
  slot in its face, not over the top of the block. A part inside a housing is
  hidden by it — put it in a layer *under* the housing while it is inside, and in
  a layer over the chute once it is out. Nothing passes through a solid.
- **Moving things touch; they never overlap.** When several parts travel the
  same path, give them contact: none comes closer than its own size to the one
  ahead, and one that catches up takes the slower one's speed. A queue that
  backs up holds the next part *inside* the machine until there is room at the
  opening — it never backs out through the door.
- **Nothing in flight is cancelled.** A second request while the first ball is
  still rolling starts a second ball. Keep a small pool of moving things, each
  with its own state; never restart a shared one, and never make one vanish
  because the next one needs its slot.
- **Speed is physical.** Gravity accelerates, a tray brakes, a flywheel decays.
  A 0.6 s ease from A to B is a UI transition, not a ball. Use speeds and
  accelerations, and let the time fall out of the distance.
- **Every helper a worklet calls is a worklet.** A model function or a geometry
  helper used inside a frame loop, an animated style or a gesture needs
  `'worklet'` as its first line. Without it the app aborts on the UI thread
  with "Tried to synchronously call a Remote Function", and there is no
  JavaScript stack to point at it.
- **A gesture claims the touch on the first move, not on touch-down.** With
  `manualActivation(true)`, decide what was touched in `onTouchesDown` and call
  `manager.activate()` from `onTouchesMove`. Activating on touch-down does
  nothing; the gesture finalizes without ever becoming active.
- **Let the page scroll.** A figure lives in a scrolling screen. Claim only the
  drag the figure needs — sideways for a crank, nothing at all for a tap — and
  `manager.fail()` an upright drag so the scroll view gets it. Taps use
  `Gesture.Tap()`, which never blocks scrolling.
- **The frame never changes height.** The readout grows ("2 refused"), so the
  footer holds the readout and the hint on one line each. A hint that wraps when
  the readout gets longer moves the whole card under the reader's finger.
- **The readout never claims what has not happened.** Count a glucose when its
  ATP is made, not when it enters; count a request when it is decided.
- **Only what was asked for.** A figure is the machine. Do not add people,
  hands or scenery unless the request asks for them.

## The kit

Copy `kit/` into the project (for example `components/apparatus/kit/`) and
import from it. `references/kit.md` has every export.

| File | What it is for |
| --- | --- |
| `kit/iso.ts` | Pure geometry: `camera`, `fitView`, `aspectOf`, `box`, `cylinder`, `prism`, `sphere`, `coil`, `ticks`, `ringFront`, `silhouette`, `halo`, `planeMatrix`, `projector`. No React Native. |
| `kit/tones.ts` | Pure colour: the four greys and the accent mixed from the theme's card, foreground and primary. |
| `kit/draw.tsx` | `FigureCanvas`, `IsoStage`, `Layer`, `Solid`, `Stroke`, `Fill`, `Dots`, `Halo`, `OnPlane`, `usePalette`. |
| `kit/live.ts` | UI-thread motion: `useFigureClock`, `follow`, `springStep`, `rotateInPlane`, `stretchInPlane`, `slideStyle`, `matrixStyle`, `projectWith`, `useReadout`, `useDetents`, `tick`, `knock`, `useStillness`. |
| `kit/figure.tsx` | `ApparatusFrame`: the PanelUI card a figure sits in. |

## References

- `references/craft.md` — the look: tones, parts vocabulary, detail, painter's
  order, sections and cutaways. Read before designing.
- `references/kit.md` — the kit's API.
- `references/motion.md` — frame loops, layers, pools, contact, gestures,
  haptics, idle tours, reduced motion.
- `references/accessibility.md` — roles, values and actions for a figure.
- `references/verify.md` — recording a simulator, reading frames, the checklist.
