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
  <a href="https://github.com/panel-ui/PanelUI/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT license" /></a>
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
| Alert | Frame | Skeleton |
| Avatar | InlineSelect | Spinner |
| Badge | Input | Switch |
| BottomSheet | InputGroup | Tabs |
| Button | Label | Toast |
| Card | Progress | Typography |
| Checkbox | RadioGroup | |
| Dialog | Select | |
| EmptyState | | |

`Select` opens a bottom-sheet picker; `InlineSelect` expands its options in place.
`Frame` is a tinted grouping container (Coss's CardFrame) with `Frame.Header`,
`Frame.Panel`, `Frame.Row`, and `Frame.Footer` for grouped list sections.
`InputGroup` measures its prefix/suffix and pads the input to match.

Plus primitives: `PanelUIProvider`, `Portal`, `AnimatedPressable`, `useTheme`,
`useThemeMode`, `useToast`, `cn`.

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
  // Only needed if you use the Vercel or Supabase themes.
  extraThemes: ['vercel', 'vercel-dark', 'supabase', 'supabase-dark'],
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

### Toasts

The toast queue lives outside React, so `toast.show()` works from anywhere —
including API clients and other non-component code:

```tsx
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

## Theming

Six themes ship in [`theme.css`](packages/panelui/theme.css): `light`, `dark`,
`vercel`, `vercel-dark`, `supabase` and `supabase-dark`.

Uniwind only gives `light` and `dark` `prefers-color-scheme` handling — any other
theme compiles to a plain class selector and cannot adapt on its own. So each brand
ships as a light/dark pair, and `useThemeMode()` treats brand and mode as separate
axes:

```tsx
const { theme, setTheme } = useTheme();
setTheme('vercel-dark');
setTheme('system'); // follow the device

const { family, mode, setFamily, toggleMode } = useThemeMode();
toggleMode();          // dark ↔ light, staying in the current brand
setFamily('supabase'); // switch brand, staying in the current mode
```

Named themes must be registered in `extraThemes` in your Metro config, or
`setTheme` throws "it was not registered".

Tokens are CSS variables. Override them in your own `global.css` using the same
`@variant` shape the library uses — Uniwind does not support the shadcn-style
`:root` / `.dark` pattern:

```css
@import 'panelui-native/theme.css';

@layer theme {
  :root {
    @variant light {
      --color-primary: #4f46e5;
    }
    @variant dark {
      --color-primary: #818cf8;
    }
  }
}
```

Every theme must define the same set of variables — Uniwind fails the build with
"All themes must have the same variables" otherwise.

## Performance principles

Every component follows the same rules:

1. Animations run on the UI thread (Reanimated 4) — never the RN `Animated` API.
2. Variant styles are computed once at module scope with `tailwind-variants`.
3. Overlays mount lazily and unmount after their exit animation.
4. Theme switches are applied natively by Uniwind without a tree re-render.

The [example app](apps/example) is an Expo Router showcase — a browsable component
gallery with a live demo per component and a theme picker, used to smoke-test every
component in all six themes before a release.

## Example app

```sh
git clone https://github.com/panel-ui/PanelUI.git
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
