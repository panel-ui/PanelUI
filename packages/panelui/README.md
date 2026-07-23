# PanelUI — React Native UI components for Expo, styled with Tailwind CSS

**PanelUI** (`panelui-native`) is an accessible, high-performance React Native component
library for Expo apps. 29 typed components — buttons, bottom sheets, dialogs, selects,
toasts, forms — styled with Tailwind CSS v4 and animated on the UI thread with Reanimated.
Zero native code, so it runs in Expo Go.

[![npm version](https://img.shields.io/npm/v/panelui-native?style=flat-square)](https://www.npmjs.com/package/panelui-native)
[![npm downloads](https://img.shields.io/npm/dm/panelui-native?style=flat-square)](https://www.npmjs.com/package/panelui-native)
[![bundle size](https://img.shields.io/bundlephobia/minzip/panelui-native?style=flat-square)](https://bundlephobia.com/package/panelui-native)
[![MIT license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](https://github.com/panel-ui/PanelUI/blob/main/LICENSE)
![platforms iOS and Android](https://img.shields.io/badge/platforms-iOS%20%7C%20Android-black?style=flat-square)
![Expo SDK 57+](https://img.shields.io/badge/Expo-SDK%2057%2B-000?style=flat-square&logo=expo)

- ⚡ **Tailwind CSS for React Native** via [Uniwind](https://uniwind.dev) — no Babel transform,
  roughly 2.4–3× faster styling than NativeWind.
- 🧵 **60fps animations on the UI thread** with Reanimated 4. Press feedback, switches, sheets,
  dialogs and tabs never touch the JS thread.
- 🎨 **Six built-in themes** — Panel, Moon and Grass, each in light and dark. A theme sets radius
  as well as colour, so switching one restyles the shape of the UI too.
- 🌗 **Native dark mode.** Theme switching is applied natively by Uniwind, without re-rendering
  your component tree.
- ♿ **Accessible by default** — every interactive component wires up `accessibilityRole`,
  state and labels.
- 📦 **TypeScript, tree-shakeable, zero native modules** — works in Expo Go, no prebuild needed.

## Install

```sh
npx expo install panelui-native uniwind tailwindcss react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-svg react-native-worklets
```

## Quick start

**1. Configure Metro**

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
  // Only needed if you use the Moon or Grass themes.
  extraThemes: ['moon', 'moon-dark', 'grass', 'grass-dark'],
});
```

**2. Create `global.css`**

```css
@import 'tailwindcss';
@import 'uniwind';
@import 'panelui-native/theme.css';

@source './node_modules/panelui-native/src';
```

**3. Wrap your app**

```tsx
// App.tsx
import './global.css';
import { PanelUIProvider, Button, Card } from 'panelui-native';

export default function App() {
  return (
    <PanelUIProvider>
      <Card>
        <Card.Header>
          <Card.Title>Create project</Card.Title>
          <Card.Description>Deploy your new project in one click.</Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button>Deploy</Button>
        </Card.Footer>
      </Card>
    </PanelUIProvider>
  );
}
```

`PanelUIProvider` sets up the gesture root, the themed page background, the portal host used by
overlays, and the toast viewport.

## Components

| Component | What it does |
| --- | --- |
| `Accordion` | Collapsible sections with single or multiple selection |
| `Alert` | Status message with a built-in icon |
| `Attachment` | File row with upload states, built on Item |
| `Avatar` | User image with an initials fallback and an optional badge overlay |
| `Badge` | Compact status label, dot, or notification count |
| `BottomSheet` | Draggable sheet anchored to the bottom of the screen |
| `Button` | Pressable action with variants, sizes, loading state and icon slots |
| `Card` | Content surface with header, body and footer |
| `Checkbox` | Animated checkbox, as a row or a selectable card |
| `Chip` | Interactive pill — a filter, a tag, or a removable token |
| `Dialog` | Modal dialog with a backdrop and footer actions |
| `Direction` | Reading direction for everything below it |
| `EmptyState` | Placeholder for a list or screen with no content |
| `Frame` | Widget shell — a card of rows sitting in a titled tray |
| `HeatmapChart` | Contribution grid with a themed colour ramp and a readout |
| `Input` | Text field with label, description and error message |
| `InputGroup` | Input with leading and trailing decorators |
| `Item` | Row of media, text and actions for lists and settings |
| `Label` | Form field label with required, invalid and disabled states |
| `LineChart` | Animated time series, drawn on the UI thread |
| `Marker` | Inline note between conversation turns |
| `Message` | Chat turn with avatar, bubble, header and footer |
| `MessageScroller` | Scroll behaviour a chat transcript needs |
| `Popover` | Panel anchored to the element that opened it |
| `Progress` | Determinate and indeterminate progress bar |
| `RadioGroup` | Single-select list of options |
| `ScrollCanvas` | Image frame whose contents move as you scroll |
| `ScrollFade` | Fades the edges of a scroll container |
| `ScrollText` | Text that resolves word by word as you scroll |
| `SectionRail` | Floating section navigator for a long screen |
| `Select` | Picker shown in a bottom sheet, expanded in place, or floating over the page |
| `Separator` | Horizontal or vertical rule between content |
| `Shimmer` | Animated highlight sweeping across content |
| `Skeleton` | Shimmer placeholder for loading content |
| `Slider` | Pick a value by dragging a thumb along a track |
| `Soundwave` | What a voice looks like while an app listens |
| `Spinner` | Indeterminate loading indicator |
| `Steps` | Stepper for multi-step flows |
| `Surface` | Elevated container with a variant ladder |
| `Switch` | Animated on/off toggle |
| `Tabs` | Segmented navigation with an animated indicator |
| `ThinkingOrb` | Dotted orb saying which kind of busy an agent is |
| `Timeline` | Vertical sequence of events |
| `Toast` | Transient notification queue with swipe to dismiss |
| `ToggleButton` | A button that stays down, on its own or in a group |
| `Typography` | Semantic text presets |

Plus `PanelUIProvider`, `Portal`, `AnimatedPressable`, `KeyboardAvoider`, `ScrollProgress`,
`Text`, a set of SVG icons (with brand marks for Google, Facebook and Apple), and the `cn`
class-merging helper.

**Hooks:** `useTheme`, `useThemeMode`, `useToast`, `useCopyToClipboard`, `useDisclosure`,
`useBreakpoint`, `useKeyboard`, `useKeyboardAvoidance`, `useScrollSections`,
`useRevealProgress`, `useDebouncedValue`, `usePrevious`.

Icons inside a coloured surface inherit a readable colour automatically — `Button` provides the
foreground its variant reads against, so an icon in `startContent` follows the theme without a
hardcoded hex. Wrap your own surfaces in `IconColorProvider` to do the same.

Every component takes a `className`, so anything can be restyled with Tailwind utilities:

```tsx
<Button className="w-full rounded-full" labelClassName="uppercase">
  Continue
</Button>
```

## Toasts

```tsx
import { useToast } from 'panelui-native';

const { toast } = useToast();

toast.show('Link copied');
toast.show({
  variant: 'success',
  label: 'Deployment complete',
  description: 'panelui.dev is live on production.',
  actionLabel: 'View',
  onActionPress: ({ hide }) => hide(),
});
```

The queue lives outside React, so `toast.show()` also works from API clients and other
non-component code.

## Theming and dark mode

PanelUI ships three theme families, each in light and dark: **Panel** (`light` / `dark`),
**Moon** (`moon` / `moon-dark`) and **Grass** (`grass` / `grass-dark`). A family sets its own
radius scale as well as its own palette — Panel is the default, Moon is sharp and
monochrome, Grass is soft and green.

```tsx
import { useTheme, useThemeMode, PANEL_THEMES } from 'panelui-native';

// Switch to a specific theme
const { theme, setTheme } = useTheme();
setTheme('moon-dark');
setTheme('system'); // follow the device

// Or treat brand and light/dark as separate axes
const { family, mode, setFamily, toggleMode } = useThemeMode();
toggleMode();            // dark ↔ light, staying in the current brand
setFamily('grass');      // switch family, staying in the current mode
```

Tokens are plain CSS variables, so you can override any of them in your own `global.css`:

```css
@import 'panelui-native/theme.css';

@layer theme {
  :root {
    @variant dark {
      --color-primary: #818cf8;
    }
  }
}
```

### Using Expo Router? Read this

React Navigation paints its own theme background over every screen, and it defaults to an opaque
light grey — which sits on top of `PanelUIProvider`'s background and makes theme switching look
like it does nothing. Feed it the live PanelUI tokens:

```tsx
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useCSSVariable } from 'uniwind';
import { useThemeMode } from 'panelui-native';

function ThemedNavigation() {
  const { mode } = useThemeMode();
  const [background, card, text, border] = useCSSVariable([
    '--color-background', '--color-card', '--color-foreground', '--color-border',
  ]) as (string | undefined)[];

  const base = mode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={{ ...base, dark: mode === 'dark',
                            colors: { ...base.colors, background, card, text, border } }}>
      <Stack />
    </ThemeProvider>
  );
}
```

`useCSSVariable` subscribes to Uniwind's theme changes, so this re-runs on every switch — including
the named themes, which the OS `Appearance` API knows nothing about. For the same reason, drive
`<StatusBar>` from `mode` rather than `style="auto"`.

## FAQ

### How is PanelUI different from NativeWind?

NativeWind is a styling engine; PanelUI is a component library. PanelUI is built on **Uniwind**,
a faster Tailwind v4 engine for React Native that skips the Babel transform and applies theme
changes natively.

### Does it work with Expo Go?

Yes. PanelUI is pure TypeScript with no native modules, so no development build or prebuild is
required.

### Is it accessible?

Every interactive component sets an `accessibilityRole`, mirrors its state through
`accessibilityState`, and exposes labels. Decorative icons are hidden from screen readers.

### Can I use it in a bare React Native app?

Yes, as long as Uniwind, Reanimated and Gesture Handler are configured. Expo is the tested
path.

### Why do my Moon or Grass themes throw "it was not registered"?

Named themes must be listed in `extraThemes` in your Metro config — see [Quick start](#quick-start).

## Links

- **Documentation:** [panelui.dev](https://panelui.dev) — a page per component, with anatomy, props and examples
- **Source:** [github.com/panel-ui/PanelUI](https://github.com/panel-ui/PanelUI)
- **Report an issue:** [github.com/panel-ui/PanelUI/issues](https://github.com/panel-ui/PanelUI/issues)
- **Changelog:** [releases](https://github.com/panel-ui/PanelUI/releases)

## License

MIT © Khalid Abdi
