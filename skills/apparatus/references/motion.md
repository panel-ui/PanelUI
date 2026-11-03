# Motion

## One loop, one model

All state that changes per frame lives in shared values, and one
`useFigureClock` steps it. Layers read it in `useAnimatedStyle`; paths read it
in `useAnimatedProps`. React renders the figure once; afterwards only the
readout re-renders, through `useReadout`, when its rounded value changes.

Every function the loop, a style, a prop or a gesture calls must start with
`'worklet'`: model helpers, geometry helpers like `slotZ`, everything. A plain
function called on the UI thread aborts the app with no JavaScript stack.

`useFigureClock` caps a frame at 1/20 s, so a figure that was paused does not
leap. Pass `active` from the screen's focus, so a figure in a background screen
costs nothing.

## Moving a part

- **Sliding** — build it at rest, move its layer with `slideStyle` by
  `view.delta` of the world move.
- **Turning** about an axis in a face — draw its face in the plane with
  `OnPlane`, turn the layer with `rotateInPlane(planeMatrix, angle)`. A round
  part's outline is the same at every angle, so only its face marks turn.
- **Stretching** — a coil or a bellows: `stretchInPlane` holding the fixed end.
- **Changing shape or travelling a path** — an animated `Path` whose `d` is
  built in the worklet with `projectWith`: rods, linkages, a trace, molecules.

## Many moving things

When the reader can start a second one before the first is done — balls,
requests, molecules — keep a **pool**: a flat array in one shared value, a few
fields per item (kind, time, position, speed), and one layer per pool slot.
Find a free slot to start one; return it to free when it is done. Find the
slot by reading the array *before* calling `modify`, then write it inside: a
variable assigned in the `modify` updater stays in the updater, which works on
a copy of what it captured. Never reuse a
moving item for the next request, and never hide one because another needs its
place.

Give them **contact**. After moving everything, pass over the pool: no item may
be closer than its own size to the one ahead of it on the same path, and an
item that catches up takes that one's speed. Where a queue backs up to an
opening, the next item waits inside the machine, hidden, until the opening is
clear; it never appears anywhere else.

## Physical speeds

Use accelerations, not durations. A ball on a chute gains speed at a constant
rate; on a level tray it brakes so that it stops at its place
(`v = √(2·a·gap)`); off an edge it falls under gravity. A flywheel loses the
same share of its speed every millisecond. The time each takes is whatever the
distance makes it, which is what makes it read as real.

## Gestures

A figure sits in a scrolling screen. Claim only what the figure needs.

- **A tap** — `Gesture.Tap().maxDuration(400)`. It never blocks scrolling.
- **A drag on a part** — `Gesture.Pan().manualActivation(true)`. In
  `onTouchesDown`, hit-test the parts (store which, and where the touch began)
  or `manager.fail()` if nothing was hit. In `onTouchesMove`, call
  `manager.activate()` — *not* in `onTouchesDown`, where it does nothing.
- **A sideways drag anywhere** (a crank, a flywheel) — in `onTouchesMove`,
  activate once the drag is more sideways than upright and past 6 points, and
  `manager.fail()` once it is more than 10 points upright, so the page scrolls.
- Only the part of a drag that runs along a part's travel moves it: project
  the change onto `view.delta` of the travel direction.
- Keep each gesture chain inline in its `useMemo`. Do not build a helper that
  returns a configured gesture.

## Haptics

`tick()` for a detent or a step, `knock()` for a stop or a refusal, both
through `runOnJS` from a worklet. Both do nothing when `expo-haptics` is not
installed.

## Left alone

A figure demonstrates itself after about four seconds without a touch: the
bench pulls and releases, the hopper sends a burst, the cell is fed. A touch
cancels the demonstration at once.

## Reduced motion

With reduce motion on (`useStillness()`), there is no demonstration and no
motor running on its own: the engine starts stopped. Motion the reader starts
themselves still plays, because it is the answer to what they did.
