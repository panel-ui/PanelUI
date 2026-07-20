<p align="center">
  <img src=".github/assets/logo.png" alt="PanelUI logo" width="140" />
</p>

<h1 align="center">PanelUI</h1>

<p align="center">
  High-performance React Native components for Expo.<br />
  Coss UI design language · Tailwind v4 via Uniwind · Reanimated on the UI thread.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/panelui-native"><img src="https://img.shields.io/npm/v/panelui-native?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/Khalidabdi1/PanelUI/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/platforms-iOS%20%7C%20Android-black?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/Expo-SDK%2057%2B-000?style=flat-square&logo=expo" alt="Expo SDK 57+" />
</p>

---

**PanelUI** brings the component quality of [shadcn/ui](https://ui.shadcn.com) and the visual language of [Coss UI](https://coss.com/ui) to React Native — built for Expo from day one and engineered for performance:

- ⚡ **Uniwind (Tailwind v4)** — the fastest Tailwind bindings for React Native. No Babel transform, ~2.4–3× faster styling than NativeWind.
- 🧵 **UI-thread animations** — every animation (press feedback, switches, sheets, dialogs, tabs) runs on the UI thread with Reanimated 4. No JS-thread jank.
- 🎨 **Coss UI design tokens** — the exact same semantic color system (`background`, `primary`, `muted`, `destructive`, …) in light and dark, translated 1:1 for native.
- 🌗 **Native dark mode** — theme switching handled by Uniwind at the native level, without re-rendering your tree.
- ♿ **Accessible** — proper `accessibilityRole` and state wiring on every interactive component.
- 📦 **Tree-shakeable, typed, zero native code** — pure TypeScript, works in Expo Go.

## Components

| | | |
| --- | --- | --- |
| Alert | Checkbox | RadioGroup |
| Avatar | Dialog | Select |
| Badge | Frame | Skeleton |
| BottomSheet | InlineSelect | Spinner |
| Button | Input | Switch |
| Card | Progress | Tabs |

`Select` opens a bottom-sheet picker; `InlineSelect` expands its options in place.
`Frame` is a tinted grouping container (Coss's CardFrame) with `Frame.Header`,
`Frame.Panel`, `Frame.Row`, and `Frame.Footer` for grouped list sections.

Plus primitives: `PanelUIProvider`, `Portal`, `AnimatedPressable`, `useTheme`, `cn`.

## Installation

```sh
npx expo install panelui-native uniwind tailwindcss react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-svg react-native-worklets
```

### 1. Configure Metro

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
});
```

### 2. Create `global.css`

```css
@import 'tailwindcss';
@import 'uniwind';
@import 'panelui-native/theme.css';

@source './node_modules/panelui-native/src';
```

### 3. Import the CSS and wrap your app

```tsx
// App.tsx
import './global.css';
import { PanelUIProvider } from 'panelui-native';

export default function App() {
  return (
    <PanelUIProvider>
      {/* your app */}
    </PanelUIProvider>
  );
}
```

## Usage

```tsx
import { Button, Card, Dialog, Input, useTheme } from 'panelui-native';

function Example() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <Card.Header>
        <Card.Title>Create project</Card.Title>
        <Card.Description>Deploy your new project in one click.</Card.Description>
      </Card.Header>
      <Card.Content className="gap-4">
        <Input label="Name" placeholder="My project" />
      </Card.Content>
      <Card.Footer>
        <Dialog>
          <Dialog.Trigger>
            <Button>Deploy</Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>Are you sure?</Dialog.Title>
            <Dialog.Description>This will start a deployment.</Dialog.Description>
            <Dialog.Footer>
              <Dialog.Close>
                <Button variant="ghost" size="sm">Cancel</Button>
              </Dialog.Close>
              <Dialog.Close>
                <Button size="sm">Confirm</Button>
              </Dialog.Close>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </Card.Footer>
    </Card>
  );
}
```

Every component accepts `className`, so you can restyle anything with Tailwind classes:

```tsx
<Button className="w-full rounded-full" labelClassName="uppercase">
  Continue
</Button>
```

### Buttons

`Button` supports icon slots, a `loading` state (renders a variant-matched
spinner and blocks presses), and `fullWidth`:

```tsx
<Button loading={saving} startContent={<SaveIcon />} fullWidth>
  {saving ? 'Saving…' : 'Save changes'}
</Button>
```

### Progress

Determinate or indeterminate, animated on the UI thread. `value` is `0–100`:

```tsx
<Progress value={uploaded} color="success" />
<Progress indeterminate color="info" />
```

`color` is `primary | success | warning | destructive | info` and `size` is
`sm | md | lg`.

### Dark mode

```tsx
const { theme, setTheme } = useTheme();

setTheme('dark');   // force dark
setTheme('light');  // force light
setTheme('system'); // follow the device
```

## Theming

PanelUI ships the Coss UI token set as CSS variables in [`theme.css`](packages/panelui/theme.css). Override any token in your own `global.css` after the import:

```css
@import 'panelui-native/theme.css';

:root {
  --primary: #4f46e5;
  --primary-foreground: #ffffff;
}

.dark {
  --primary: #818cf8;
}
```

## Performance principles

Every component follows the same rules:

1. Animations run on the UI thread (Reanimated 4) — never the RN `Animated` API.
2. Variant styles are computed once at module scope with `tailwind-variants`.
3. Overlays mount lazily and unmount after their exit animation.
4. Theme switches are applied natively by Uniwind without a tree re-render.

The [example app](apps/example) includes a 1,000-row perf screen used to smoke-test render cost on every release.

## Example app

```sh
git clone https://github.com/Khalidabdi1/PanelUI.git
cd PanelUI
npm install
npm run example
```

Then press `i` for iOS or `a` for Android.

## Contributing

Contributions are welcome! The library lives in [`packages/panelui`](packages/panelui), the showcase app in [`apps/example`](apps/example).

```sh
npm install         # install workspace deps
npm run typecheck   # typecheck all workspaces
npm run build       # build the library with react-native-builder-bob
```

## License

[MIT](LICENSE) © Khalid Abdi
