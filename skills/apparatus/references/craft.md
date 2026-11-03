# Craft

How an apparatus figure looks, and why. Read this before designing one.

## Tones

A figure is drawn in four greys and one accent, all mixed from the theme's own
tokens by `kit/tones.ts`, so it follows every theme in light and dark with no
colour written down.

| Tone | Use it for |
| --- | --- |
| `ground` | Shadows and the floor. |
| `lo` | Base plates, feet, trays, recesses. |
| `mid` | Structure: frames, blocks, housings, castings. |
| `hi` | Moving mechanism and fittings: rods, knobs, rollers, levers. |
| `lit` | **One part only**: the subject, the thing the reader should watch. |

Light comes from above and to the left of the viewer. Tops catch the most,
left-facing sides less, right-facing sides least; `lightOf` in `iso.ts`
decides it and every solid uses it, so a set of figures is lit the same way.
A `hi` part in shadow still reads lighter than a `lo` part in full light.

Colour is for the subject only. If the idea is about colour — channels,
temperatures, a burn — the accent can carry it; otherwise everything else is
grey.

## Parts

Detail comes from parts that belong to the mechanism, never from texture
painted on. A useful vocabulary:

- **Base** — a plate with rounded corners, four feet, a screw at each corner,
  a halo under it.
- **Structure** — posts, A-frames, blocks, rails with a groove along them, end
  stops with a bumper.
- **Mechanism** — carriages with shoes, rods through bosses, coils, dashpots,
  pulleys, cranks, star wheels, gates, chutes with rails.
- **Controls** — knurled knobs with an index line and an engraved scale behind
  them; levers with a ball grip; flags.
- **Readouts in the object** — a ruler with ticks every few units and a major
  tick every fifth, a pointer that rides it, a pen on paper.

Every part sits on another part: a knob on a boss on a face, a post on a plate.
A part floating in air is a part that has not been finished.

At 1× the figure reads as one machine. Zoom a screenshot to 4× and every region
should still have something true in it — a screw, a seam, a rail's groove. A
bare face is unfinished, not calm.

## No words in the drawing

Text belongs to the frame: the title, the readout, the hint, the caption. SVG
text ignores the platform's text scaling and cannot be read by a screen reader
in a useful way. Mark things with shape instead — a heavier tick, a flag, the
accent.

## Painter's order

Native SVG has no depth buffer: whatever is drawn later is on top. A figure is
a stack of layers, back to front, and a moving part needs its own layer exactly
where it sits in depth.

- Paint the floor, the halo, then the farthest structure, then nearer.
- **Split at every moving part.** If a carriage passes in front of a rail and
  behind a dashpot, the rail goes in a layer under the carriage and the dashpot
  in a layer over it.
- **Split a moving part where it changes depth.** A ball inside a gate block is
  in a layer under the block; once it is out of the slot it is in a layer over
  the chute. Two layers for one ball, each shown only for its half of the trip.
- Within a layer, order solids by depth. Near rails, near walls and near halves
  of rings go last.
- A transparent part (a glass tube) is two strokes: its far rim before what is
  inside it, its silhouette and near rim after.

## Sections and cutaways

To show inside a casing, cut it on a plane through the mechanism and remove
the near part. The cut face is hatched where there was metal and dark where it
was hollow. Moving parts are drawn whole, the way a cutaway model shows them:
only the casting is cut. Draw the cut face with `OnPlane` and `planeMatrix`, in
the plane's own coordinates, and anything moving on it — a burn, a molecule —
can be drawn there too without projecting a thing.

## Composition

The machine fills about 60–70% of the card. Fit the camera to `EXTENT`, the
machine at its widest pose, or a part will leave the card the first time it
moves. A figure that is mostly base plate is too far away: trim the plate to
the parts on it.
