# Spinner

Indeterminate loading indicator.

```tsx
import { Spinner } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Spinner } from '@/components/ui/spinner';
```

### Usage

```tsx
<Spinner />
<Spinner size="lg" />
```

### Variants

- **size** — `sm`, `md` *(default)*, `lg`

### Props

#### `SpinnerProps`

Extends `VariantProps<typeof spinnerVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `label` | `string` | — | What is loading, for a screen reader. Setting it makes the spinner announce as a busy status; leaving it unset keeps it out of the accessibility tree. Leave it unset wherever something around the spinner already says the wait is on — a loading button, a row with its own caption. Set it where the spinner is the only sign, or the wait passes in silence. |
| `color` | `string` | — | The colour of the turning arc. Any colour React Native accepts — a hex string, `rgb()`, a named colour. Leave it unset to follow the theme's primary colour. Set it where the spinner sits on a surface the theme did not choose for it: a spinner on a filled button, or over a photo, wants the colour of the text around it rather than the accent. |
| `trackColor` | `string` | — | The colour of the faint ring the arc turns around. Leave it unset for the theme's muted colour. Worth setting alongside `color` on a dark or coloured surface, where the default ring can read as a second, fainter spinner rather than as a track. |

### Example — Inline

```tsx
<Spinner size="sm" />
<Spinner />
<Spinner size="lg" />
```

### Notes

A bare ring carries no words, so it is hidden from screen readers unless `label` is given. An unnamed progress indicator announces its role and nothing else, which is noise standing in for information.

Leave `label` off wherever something around the spinner already says the wait is on — `Button`'s `loading` state, a row with its own caption. Set it where the spinner is the only sign.

Under the platform's reduce-motion setting the ring stops turning and fades in place instead. It keeps moving because a spinner that holds still reads as one that has hung, which is the single thing a spinner exists to rule out.

---

Full page, with every example: https://panelui.dev/docs/components/spinner
