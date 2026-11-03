# Accessibility

A figure is one element to a screen reader, wrapping the canvas:

- `accessible` and a **role**: `adjustable` when it has a value to change (a
  knob, a throttle), `button` when it has one thing to do (send, feed).
- `accessibilityLabel` — the figure's name: "Spring bench".
- `accessibilityValue={{ text }}` — the readout, from the model, the same string
  the frame shows.
- `accessibilityHint` — what the actions do, in a sentence.
- `accessibilityActions` with `onAccessibilityAction` for everything a finger can
  do: `increment` and `decrement` for the main value, `activate` for the main
  event ("Pull and release the carriage"), named custom actions for the rest
  ("More damping").

The SVG inside is decorative. Do not label individual parts; the caption under
the card says what each stands for, as text a screen reader reaches in order.

Touch targets on the machine (knobs, levers) are at least 44 points across,
measured as a hit radius around the part's screen centre, not the part's
drawn size.
