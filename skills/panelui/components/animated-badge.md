# AnimatedBadge

Status pill whose icon and label roll over when the status changes.

```tsx
import { AnimatedBadge } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { AnimatedBadge } from '@/components/ui/animated-badge';
```

### Usage

```tsx
<AnimatedBadge status={job.status}>{job.label}</AnimatedBadge>
```

### Variants

- **status** — `neutral` *(default)*, `info`, `success`, `warning`, `danger`, `loading`
- **size** — `sm`, `md` *(default)*

### Props

#### `AnimatedBadgeProps`

Extends `ViewProps, VariantProps<typeof animatedBadgeVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `status` | `AnimatedBadgeStatus` | `neutral` | Which state the badge shows. Anything other than the six statuses is drawn as `neutral`, with a warning in development — map a boolean or a state of your own onto one first, as in `status={synced ? 'success' : 'neutral'}`. |
| `size` | `AnimatedBadgeSize` | `md` | — |
| `children` | `ReactNode` | — | The word. Changing it rolls the old one out and the new one in. |
| `icon` | `ReactNode` | — | A glyph of your own, in place of the status's. |
| `showIcon` | `boolean` | `true` | Whether a glyph is drawn at all. |
| `pulse` | `boolean` | — | A slow swell behind the content, for a status that is still happening. On by default while `status` is `loading`, and off otherwise — pass it explicitly for a state of your own that is also still running. |
| `contentKey` | `string \| number` | — | What counts as a change, when the label cannot say. The label is keyed on its own text, so this is only needed where it is an element rather than a string, or where two states share a word. |
| `animateLayout` | `boolean` | `true` | Whether the pill springs to its new size, and to its new place when what is around it moves. On by default, which is what a badge standing on its own wants: growing to a longer word in one frame shoves whatever is beside it. Turn it off for a badge set in a line of text. The animation covers position as well as size, and the words around it are placed by the text engine and simply appear where they now belong — so an animating badge slides across a sentence that has already finished moving, which reads as the badge coming loose from the line rather than as the figure changing. |
| `className` | `string` | — | — |
| `labelClassName` | `string` | — | — |

### Example — A status that changes

The badge's whole job. Change `status` and the word with it, and the pill rolls over rather than redrawing.

```tsx
const [state, setState] = useState({ status: 'neutral', label: 'Idle' });

return (
  <View className="items-center gap-4">
    <AnimatedBadge status={state.status}>{state.label}</AnimatedBadge>
    <Button
      variant="outline"
      onPress={() => setState({ status: 'loading', label: 'Deploying' })}
    >
      Deploy
    </Button>
  </View>
);
```

### Notes

### Which change counts as a change

The label is keyed on what it says, so `"Queued"` to `"Building"` rolls and a re-render with the same word does not.

Pass `contentKey` where the label is an element rather than a string, or where two different states share a word. The badge cannot tell those apart on its own, and without a key it either animates on every render or never.

### The width

The pill springs to the new word rather than jumping to it. A badge in a row of them shoves its neighbours as it changes, and a jump does all of that shoving in one frame.

### One view, not two

The obvious build is to key the element on its content and let the old one animate out while the new one animates in. That does not work in a box this size: for the length of the transition both are mounted, and the badge swells around the pair of them and collapses again.

So there is one view throughout and the content is swapped at the far end of the roll — out carrying the old word, changed while it is off screen, back with the new one. Nothing is ever in the badge twice.

### Statuses

`neutral`, `info`, `success`, `warning`, `danger` and `loading`, each drawing its own tint and glyph from the theme's status tokens.

There is no ring around the pill. A ring would need a colour per status and there is no token for one — `border` on its own resolves to the current text colour, which comes out as a black outline on every badge in every theme. The tinted fill is what separates the badge from the surface.

`loading` spins rather than showing a still glyph, and turns the pulse on: a badge that says something is still happening should look like it. `pulse` takes that swell on or off for a state of your own that is also still running.

Pass `icon` for a glyph of your own — it replaces the status's, and it still rolls. It is drawn in the status's colour rather than its own set's, so a glyph from anywhere matches the word beside it. `showIcon={false}` drops it entirely, for a badge that is only a word.

### Reduced motion

With the preference on, the glyph and the label cut over, the pill resizes immediately, and the pulse does not run. The badge still says what it says, which is the part that mattered.

### A badge inside a paragraph

`animateLayout={false}` stops the pill springing to its new size and place.

The spring is right for a badge standing on its own — growing to a longer word in one frame shoves whatever is beside it. It is wrong inside a line of text: the words around a badge are placed by the text engine and appear where they now belong, so a badge that animates its position slides across a sentence that has already finished moving. The figure still rolls; only the pill stops travelling.

---

Full page, with every example: https://panelui.dev/docs/components/animated-badge
