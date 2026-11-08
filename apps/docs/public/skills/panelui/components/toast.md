# Toast

Transient notification queue with swipe to dismiss.

```tsx
import { Toast } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Toast } from '@/components/ui/toast';
```

### Anatomy

```tsx
<Toast>
  <Toast.Indicator />
  <Toast.Content>
    <Toast.Title>…</Toast.Title>
    <Toast.Description>…</Toast.Description>
  </Toast.Content>
  <Toast.Action>…</Toast.Action>
  <Toast.Close />
</Toast>
```

### Variants

- **variant** — `default` *(default)*, `info`, `success`, `warning`, `destructive`

### Parts

- `Toast.Indicator` — Status icon, picked from the variant.
- `Toast.Content` — Flex-1 wrapper for title and description.
- `Toast.Title` — Heading, coloured by the variant.
- `Toast.Description` — Body text.
- `Toast.Action` — Trailing action button. Dismisses the toast after its own `onPress`.
- `Toast.Close` — Icon-only dismiss button.

### Props

#### `ToastProps`

Extends `ViewProps, VariantProps<typeof toastVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `onHide` | `() => void` | — | Called when the close button is pressed or the toast is swiped away. |
| `children` | `ReactNode` | — | — |

#### `ToastIndicatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `iconProps` | `{ size?: number; color?: string }` | — | — |
| `children` | `ReactNode` | — | — |

#### `ToastCloseProps`

Extends `Omit<ViewProps, 'accessibilityLabel'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `accessibilityLabel` | `string` | `Dismiss notification` | What a screen reader calls the button. Defaults to "Dismiss notification"; pass your own in an app that is not in English. |

### Example — Firing one

Toasts are queued through `useToast`, so any component can raise one without rendering it.

```tsx
const { toast } = useToast();

<Button
  onPress={() =>
    toast({
      variant: 'success',
      title: 'Saved',
      description: 'Your changes are live.',
    })
  }
>
  Save
</Button>
```

### Notes

Toasts stack as an overlapping deck: the newest is fully visible and the ones behind peek out, with anything past the third fading rather than accumulating. Swiping toward the edge the toast entered from dismisses it; dragging the other way rubber-bands.

Auto-dismiss durations count visible foreground time: countdowns pause while the app is inactive or in the background, then resume where they left off. `toast.hide(id)` dismisses one, `toast.hideAll()` clears the queue. A `duration` of `0` keeps a toast up until it is dismissed.

---

Full page, with every example: https://panelui.dev/docs/components/toast
