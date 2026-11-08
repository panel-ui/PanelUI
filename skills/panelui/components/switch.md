# Switch

Animated on/off toggle.

```tsx
import { Switch } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Switch } from '@/components/ui/switch';
```

### Usage

```tsx
<Switch value={enabled} onValueChange={setEnabled} />
```

### Variants

- **size** — `xs`, `sm`, `md` *(default)*, `lg`, `xl`
- **disabled** — `true`

### Props

#### `SwitchProps`

Extends `VariantProps<typeof switchVariants>, Pick<PressableProps, 'accessibilityLabel' \| 'accessibilityHint' \| 'accessibilityLabelledBy'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `boolean` | **required** | — |
| `onValueChange` | `(value: boolean) => void` | — | — |
| `disabled` | `boolean` | — | — |
| `native` | `boolean` | — | Render the platform's own switch instead of this one. Requires the optional `@expo/ui` package; without it this prop does nothing. **Theme tokens do not apply** — the platform draws the control, so `className` and `size` are ignored. |
| `label` | `string` | — | Names the control to assistive technology; native mode also draws it. |
| `haptics` | `boolean` | — | Tick the haptic engine each time the switch is flipped — a toggle you feel click rather than one that merely slides. Needs the optional `expo-haptics`, and is silent without it. Ignored in `native` mode, where the platform control owns its own feedback. |
| `interactive` | `boolean` | `true` | Set to `false` to draw only the track, with no press and no role of its own. Use it when a whole row is the switch: the row is the one `Pressable` with `accessibilityRole="switch"`, and a second switch inside it would be announced twice and take two Tab stops. |

### Example — In a settings row

```tsx
<View className="flex-row items-center justify-between py-3">
  <View className="flex-1 gap-0.5">
    <Text weight="medium">Push notifications</Text>
    <Text size="sm" muted>Alerts on this device.</Text>
  </View>
  <Switch value={push} onValueChange={setPush} />
</View>
```

### Notes

Pass `haptics` to tick the platform's haptic engine each time the switch is flipped — the toggle clicks under the thumb rather than merely sliding. It needs the optional `expo-haptics` and is silent without it, and it is ignored in `native` mode, where the platform control owns its own feedback.

### Native rendering

Pass `native` to render the platform's own switch instead — SwiftUI on iOS, Jetpack Compose on Android. It needs the optional `@expo/ui` package and is a silent no-op without it.

**Theme tokens do not apply in native mode**: the platform draws the control with its own colours and metrics, so `className` and most styling props are ignored. The native switch gains a `label` prop the styled one does not have.

See [Native rendering](/docs/native) for the full prop-by-prop breakdown.

---

Full page, with every example: https://panelui.dev/docs/components/switch
