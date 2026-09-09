# PanelUI — React Native UI components for Expo, styled with Tailwind CSS

**PanelUI** (`panelui-native`) is an accessible, high-performance React Native component
library for Expo apps. 111 typed components — buttons, bottom sheets, dialogs, selects,
toasts, forms — styled with Tailwind CSS v4 and animated on the UI thread with Reanimated.
Zero native code, so it runs in Expo Go.

[![npm version](https://img.shields.io/npm/v/panelui-native?style=flat-square)](https://www.npmjs.com/package/panelui-native)
[![npm downloads](https://img.shields.io/npm/dm/panelui-native?style=flat-square)](https://www.npmjs.com/package/panelui-native)
[![bundle size](https://img.shields.io/bundlephobia/minzip/panelui-native?style=flat-square)](https://bundlephobia.com/package/panelui-native)
[![MIT license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](https://github.com/panel-ui/PanelUI/blob/main/LICENSE)
![platforms iOS and Android](https://img.shields.io/badge/platforms-iOS%20%7C%20Android-black?style=flat-square)
![Expo SDK 57+](https://img.shields.io/badge/Expo-SDK%2057%2B-000?style=flat-square&logo=expo)
[![analytics by OpenPanel](https://shieldcn.dev/badge/analytics%20by-OpenPanel-2564EB.svg?logo=openpanel&logoColor=fff&variant=branded&brand=openpanel)](https://openpanel.dev)

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

## Quick start

Needs an Expo SDK 57+ app and Node 20+. No Xcode, no Android Studio, no `prebuild` — PanelUI has
no native modules, so it runs in Expo Go.

No app yet? `npx create-panelui-app@latest` writes one with every step below already done.

Six steps for an app you already have. The full walkthrough, with a fix for every error people
hit, is at **[panelui.dev/docs/installation](https://panelui.dev/docs/installation)**.

### 1. Install PanelUI

```sh
npx expo install panelui-native
```

### 2. Install the peer dependencies

```sh
npx expo install uniwind tailwindcss react-native-reanimated react-native-worklets react-native-gesture-handler react-native-safe-area-context react-native-svg @react-native-masked-view/masked-view expo-linear-gradient
```

Install all of them, including the ones you think you don't need. Metro resolves every import in
the library when it builds your bundle, so leaving one out fails the **first** bundle with
`Unable to resolve module …` — for a component you may never use. `npx expo install` (rather than
`npm install`) picks the versions that match your SDK.

Optional, each behind a guarded import: `expo-haptics` (the `haptics` prop), `expo-blur` (blurred
overlay backdrops), `expo-clipboard` (`useCopyToClipboard`), `react-native-keyboard-controller`
(keyboard avoidance on Android), `expo-file-system` + `react-native-view-shot` (Signature export),
`@expo/ui` (native platform controls).

### 3. Add `metro.config.js`

**In the root of your project, next to `package.json`** — not in `app/`, not in `src/`. A Metro
config anywhere else is silently ignored and none of your classes will do anything. A fresh Expo
app has no such file; `npx expo customize metro.config.js` writes one.

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './uniwind-types.d.ts',
  // Only needed to switch to the Moon or Grass themes at runtime.
  extraThemes: ['moon', 'moon-dark', 'grass', 'grass-dark'],
});
```

`cssEntryFile` and `dtsFile` are relative to this file. `./src/global.css` is where
`create-expo-app` puts the CSS — if yours is at the project root, change it to `'./global.css'`.

**Nothing validates that path.** Point it at a file that does not exist and Metro still bundles, the
app still launches, and not one class resolves — no `flex-1`, so views collapse and you get a blank
screen with `Uniwind - We couldn't find your variable --color-background`.

### 4. Add the imports to `global.css`

**Look for this file before you create one** — an app made by `create-expo-app` already has
`src/global.css`. Add these lines at the top of it and leave the rest below. A second CSS file at
the project root gives you two entries, only one of which is compiled, and nothing gets styled.

```css
/* src/global.css */
@import 'tailwindcss';
@import 'uniwind';
@import 'panelui-native/theme.css';

@source '../node_modules/panelui-native/src';
```

`@source` is relative to **the CSS file**, and has to land on `node_modules/panelui-native/src` —
hence the `../` above, from `src/`. From the project root it is `'./node_modules/…'`, from
`src/styles/` it is `'../../node_modules/…'`. Get it wrong and your own classes work while
PanelUI's components come out unstyled. Whichever file you used is what `cssEntryFile` must name.

### 5. Import the CSS and add the provider

At the top of your app's entry file. The default template uses Expo Router with routes under
`src/`, so there is usually no `App.tsx` — the entry is `src/app/_layout.tsx`, and it already
returns a navigation `ThemeProvider` to wrap rather than replace:

```tsx
// src/app/_layout.tsx
import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { PanelUIProvider } from 'panelui-native';

import AppTabs from '@/components/app-tabs';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PanelUIProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppTabs />
      </ThemeProvider>
    </PanelUIProvider>
  );
}
```

That navigation theme paints over PanelUI's background once you switch themes — see
[Using Expo Router?](#using-expo-router-read-this) below for the version fed from live tokens.

`PanelUIProvider` sets up the gesture root, the themed page background, the portal host used by
overlays, and the toast viewport. One at the root is enough — don't nest a second.

You do **not** need a `babel.config.js`; Expo's default preset already wires the worklets plugin
Reanimated needs.

### 6. Restart

```sh
npx expo start --clear
```

Metro reads `metro.config.js`, `global.css` and `extraThemes` once, at startup. After changing any
of them, stop the dev server and start it again — `--clear` on a running one is not enough.

```tsx
import { Button, Card } from 'panelui-native';

<Card>
  <Card.Header>
    <Card.Title>It works</Card.Title>
    <Card.Description>PanelUI is installed and themed.</Card.Description>
  </Card.Header>
  <Card.Footer>
    <Button>Deploy</Button>
  </Card.Footer>
</Card>;
```

A themed background, a card with a border and radius, and a button that dips when pressed means
you are done. Unstyled text on a white screen means the styles are not reaching the bundle — see
[Troubleshooting](https://panelui.dev/docs/installation#troubleshooting).

## Components

The root entry is the shortest import, and the one to reach for while you are trying things out:

```tsx
import { Button, useBreakpoint, formatTime } from 'panelui-native';
```

Every component, hook, utility and foundation also has a subpath, exposing the same
implementations and the same types:

```tsx
import { Button } from 'panelui-native/components/button';
import { useBreakpoint } from 'panelui-native/hooks/use-breakpoint';
import { formatTime } from 'panelui-native/utils/time';
import { PanelUIProvider } from 'panelui-native/provider';
import { useTheme } from 'panelui-native/theme';
import { Text } from 'panelui-native/primitives/text';
import { ChevronLeftIcon } from 'panelui-native/icons';
import { Scrim } from 'panelui-native/primitives/scrim';
```

The component subpath is the slug from its documentation URL. The public utilities are `cn`,
`color` and `time`; the other foundation leaves are `animated-pressable`, `keyboard-avoider` and
`scroll-progress` under `panelui-native/primitives/`.

**Prefer the subpath for anything you ship.** The root entry re-exports all 122 components and
Metro does not tree-shake, so one name from it loads every component and everything they import —
including the charts' SVG graphs and the map. On a desktop simulator that is invisible. On an
Android device it is not: the whole library evaluates before your first screen paints, and under
memory pressure the OS can end the process with nothing in the terminal to explain it. See
[Troubleshooting](https://panelui.dev/docs/troubleshooting).

| Component | What it does |
| --- | --- |
| `Accordion` | Collapsible sections with single or multiple selection |
| `Alert` | Status message with a built-in icon |
| `AreaChart` | Filled bands over time, stacked or overlaid |
| `Attachment` | File row with upload states, built on Item |
| `Avatar` | User image with an initials fallback, a badge overlay, and a stack for a group of them |
| `Badge` | Compact status label, dot, or notification count |
| `BarChart` | Categories compared by length, grouped or stacked |
| `BottomSheet` | Draggable sheet anchored to the bottom of the screen |
| `Breadcrumb` | The trail of links back up the hierarchy to the current page |
| `BubbleChart` | Named circles on two axes, with a third quantity on their area |
| `Button` | Pressable action with variants, sizes, loading state and icon slots |
| `ButtonGroup` | Several buttons drawn as one control |
| `Calendar` | A month of days, for picking one, several, or a range |
| `CandlestickChart` | Open, high, low and close for a period, drawn as one mark |
| `Card` | Content surface with header, body and footer |
| `Carousel` | A run of slides, one at a time, dragged with a finger |
| `Checkbox` | Animated checkbox, as a row or a selectable card |
| `Chip` | Interactive pill — a filter, a tag, or a removable token |
| `CodeBlock` | Syntax-highlighted code with a header and a copy button |
| `Collapsible` | One section of content, shown and hidden by its own header |
| `ColorPicker` | A colour chosen by dragging — a saturation square, a hue scale, and opacity |
| `Combobox` | A text field that filters a list of options as you type |
| `ContextMenu` | Actions for a piece of content, opened by holding it |
| `DatePicker` | A calendar behind a button |
| `DateTimePicker` | A day and a time of day, picked in one panel |
| `Dialog` | Modal dialog with a backdrop and footer actions |
| `Direction` | Reading direction for everything below it |
| `Drawer` | Panel that slides in from an edge of the screen |
| `EmptyState` | Placeholder for a list or screen with no content |
| `Fab` | The floating action button, and the dial behind it |
| `Field` | Layout and validation-state kit a form control composes into |
| `Flow` | Pan-and-zoom canvas of draggable nodes joined by animated edges |
| `Form` | Form state — values, validation and submission — with no form library underneath |
| `Frame` | Widget shell — a card of rows sitting in a titled tray |
| `FunnelChart` | Where a population drained away, one step at a time |
| `GridItem` | Bento tiles, and the grid that places them |
| `HeatmapChart` | Contribution grid with a themed colour ramp and a readout |
| `HexChart` | A whole broken into parts, counted out in cells |
| `Input` | Text field with label, description and error message |
| `InputGroup` | Input with leading and trailing decorators |
| `Item` | Row of media, text and actions for lists and settings |
| `Kpi` | One number, what it is doing, and the shape it made getting there |
| `Label` | Form field label with required, invalid and disabled states |
| `LineChart` | Animated time series, drawn on the UI thread |
| `LiveLineChart` | A reading that keeps arriving, against a window that keeps moving |
| `Loader` | Nine loading animations behind one variant prop |
| `Map` | Vector map whose basemap is drawn from your theme tokens |
| `MarkdownEditor` | A field for writing markdown, with a toolbar and a preview |
| `Marker` | Inline note between conversation turns |
| `Marquee` | Content that travels across its container on a loop |
| `Menu` | The list of things you can do to something |
| `Message` | Chat turn with avatar, bubble, header and footer |
| `MessageScroller` | Scroll behaviour a chat transcript needs |
| `Meter` | A measurement on a fixed scale, coloured by where it falls |
| `NumberInput` | Numeric field stepped by buttons or typed by hand |
| `OtpInput` | One-time-code field drawn as a row of separate cells |
| `Pagination` | Paged navigation over a long result set |
| `Panelside` | Collapsible side panel with its own search, groups and scenes |
| `PieChart` | One whole, divided between its parts |
| `Plan` | What an agent intends to do, before it does it |
| `Planner` | A month of days, each carrying what falls on it |
| `Plot` | A chart you assemble out of its marks |
| `PolarAreaChart` | Several readings on one scale, compared as wedges |
| `Popover` | Panel anchored to the element that opened it |
| `Post` | Social card — author, body, media and the counts underneath |
| `Progress` | Determinate and indeterminate progress bar |
| `PyramidChart` | Two series mirrored about a centre, on one shared scale |
| `QRCode` | A string a camera can read — framed, titled, or folded away behind a button |
| `Questionnaire` | One question at a time, with progress, validation and a way back |
| `RadarChart` | Several measures of one thing, drawn as one shape |
| `RadioGroup` | Single-select list of options |
| `Rating` | A row of stars to read or set a score |
| `Reasoning` | An agent’s thinking, collapsed until you want it |
| `Response` | Streamed markdown rendered as native components |
| `RingChart` | Concentric arcs, each measured against its own target |
| `ScatterChart` | Two quantities against each other, to show how they relate |
| `ScrollCanvas` | Image frame whose contents move as you scroll |
| `ScrollFade` | Fades the edges of a scroll container |
| `ScrollHeader` | A screen title that hands over to a compact bar as the page scrolls |
| `ScrollText` | Text that resolves word by word as you scroll |
| `SearchBar` | Search field with a clear button, a Cancel button and a panel of results |
| `SectionRail` | Floating section navigator for a long screen |
| `Select` | Picker shown in a bottom sheet, expanded in place, or floating over the page, with an optional filter |
| `SelectionMode` | Pick several rows out of a list, on a screen or in a sheet |
| `Separator` | Horizontal or vertical rule between content, optionally labelled |
| `Shimmer` | Animated highlight sweeping across content |
| `Signature` | Sign with a finger, and get the result back out as SVG or PNG |
| `Skeleton` | Shimmer placeholder for loading content |
| `Slider` | Pick a value, or a span, by dragging a thumb along a track |
| `Sortable` | A list whose rows can be dragged into a different order |
| `Soundwave` | What a voice looks like while an app listens |
| `Sources` | The references behind an answer, behind a disclosure |
| `Spinner` | Indeterminate loading indicator |
| `SplitView` | Two stacked panes whose seam settles on one of a few named heights |
| `Splitter` | Panes that share a container, with a seam between them you can drag |
| `Steps` | Stepper for multi-step flows |
| `Surface` | Elevated container with a variant ladder |
| `Swipe` | A row that slides aside to reveal the things you can do to it |
| `Switch` | Animated on/off toggle |
| `Table` | Rows and columns that stay lined up, with sortable headers |
| `Tabs` | Segmented navigation with an animated indicator |
| `TagInput` | A field whose value is a list of tokens rather than a string |
| `Task` | A step an agent is working through, with its files |
| `TextAnimation` | Five ways a piece of text or a number arrives |
| `Textarea` | Multi-line text field that can grow with its content |
| `ThinkingOrb` | Dotted orb saying which kind of busy an agent is |
| `Timeline` | Vertical sequence of events |
| `TimePicker` | Pick a time — as a wheel, a ruler, or a pair of fields |
| `Toast` | Transient notification queue with swipe to dismiss |
| `ToggleButton` | A button that stays down, on its own or in a group |
| `Tooltip` | A small label that names the control under your finger |
| `Tour` | A walkthrough that introduces a screen one control at a time |
| `Tree` | A hierarchy you can open a level at a time |
| `TreemapChart` | A total, cut into the parts it is made of, sized by area |
| `Typography` | Semantic text presets |
| `WaterfallChart` | How a run of changes carried one total to another |

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

### The first bundle fails with `Unable to resolve module …`

A required package is missing. Run the [install command](#1-install-the-packages) again — all of
it, not just the package named in the error. Metro resolves every import in the library, so this
happens even for components you never use.

### `Cannot use @variant with unknown variant: moon` when building

Fixed in 0.22.5 — upgrade with `npx expo install panelui-native`. Before that release the Moon and
Grass token blocks leaned on variants that only existed in the artifact Uniwind generates from your
Metro config, so the dev server worked while `npx expo export` and EAS builds failed.

### None of my classes do anything

In order of likelihood: `metro.config.js` is not in the project root; it does not wrap the config
in `withUniwindConfig`; `cssEntryFile` does not point at your CSS file; `import './global.css'` is
missing from the entry file; or the dev server was running when you changed one of those. Full
list at [Troubleshooting](https://panelui.dev/docs/installation#troubleshooting).

### How is PanelUI different from NativeWind?

NativeWind is a styling engine; PanelUI is a component library. PanelUI is built on **Uniwind**,
a faster Tailwind v4 engine for React Native that skips the Babel transform and applies theme
changes natively.

### Does it work with Expo Go?

Yes. PanelUI is pure TypeScript with no native modules, so no development build or prebuild is
required.

If an app closes in Expo Go on Android with nothing in the terminal, import through the subpaths
rather than the root — see [Components](#components) above and
[Troubleshooting](https://panelui.dev/docs/troubleshooting).

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
