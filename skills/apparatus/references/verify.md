# Verify

A still screenshot proves the drawing; it proves nothing about the motion, and
most of what goes wrong with a figure is motion. Verify on an iOS Simulator or
an Android emulator, recording.

## Run it

```bash
npx tsc --noEmit                      # the types
npx expo start --go                   # then open the screen with the figure
```

On the iOS Simulator:

```bash
xcrun simctl io booted screenshot still.png
xcrun simctl io booted recordVideo --codec h264 run.mp4   # Ctrl-C to stop
```

Drive touches with `idb ui tap` / `idb ui swipe`, or by hand.

## Read the frames

Lay the recording out as a contact sheet and read every frame:

```bash
ffmpeg -i run.mp4 -vf "fps=6,scale=480:-2,tile=5x4" -frames:v 1 sheet.png
```

At 6 frames a second, a part that jumps, passes through a solid or vanishes is
visible in one tile. Crop to the machine first if the screen has a lot else on it.

## Checklist

Run each of these, recorded:

- [ ] **The idle demonstration**, untouched for ten seconds.
- [ ] **One interaction, slowly.** Every moving part leaves and enters through a
      real opening; nothing is drawn over a part it is inside.
- [ ] **A burst** — the main interaction as fast as a finger can repeat it.
      Several moving things at once: none overlaps another, none is cancelled
      or teleported, a backed-up queue waits inside the machine.
- [ ] **The edges of the model** — full, empty, stopped, at each end of every
      knob's range.
- [ ] **The frame's height** stays the same as the readout changes length.
- [ ] **A vertical swipe** across the figure scrolls the screen.
- [ ] **Both themes** — the tones are mixed from the theme, so check both.
- [ ] **Reduce motion on** — nothing moves until touched.
- [ ] **The readout** matches what the drawing shows at that moment.
- [ ] **4× crop** of a screenshot: every region has a real part in it.

If the app closes on the UI thread with no JavaScript stack, look for a helper
called from a worklet that is not one: the message names it ("Tried to
synchronously call a Remote Function. Called \"slotZ\"").
