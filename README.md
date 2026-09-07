<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/surface.svg?title=PanelUI&amp;subtitle=High-performance+React+Native+components+for+Expo&amp;logo=https%3A%2F%2Fraw.githubusercontent.com%2Fpanel-ui%2FPanelUI%2Fmain%2F.github%2Fassets%2Flogo-dark.png&amp;mode=dark&amp;align=center&amp;font=geist-mono&amp;border=false" />
    <img alt="PanelUI — high-performance React Native components for Expo" src="https://shieldcn.dev/header/surface.svg?title=PanelUI&amp;subtitle=High-performance+React+Native+components+for+Expo&amp;logo=https%3A%2F%2Fraw.githubusercontent.com%2Fpanel-ui%2FPanelUI%2Fmain%2F.github%2Fassets%2Flogo-light.png&amp;mode=light&amp;align=center&amp;font=geist-mono&amp;border=false" />
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/panelui-native"><img alt="npm version and monthly downloads" src="https://shieldcn.dev/group/npm/v/panelui-native+npm/dm/panelui-native.svg?variant=branded&amp;size=xs" /></a>
  <a href="https://github.com/panel-ui/PanelUI"><img alt="GitHub stars, license, contributors and last commit" src="https://shieldcn.dev/group/github/panel-ui/PanelUI/stars+github/panel-ui/PanelUI/license+github/panel-ui/PanelUI/contributors+github/panel-ui/PanelUI/last-commit.svg?variant=branded&amp;size=xs" /></a>
  <a href="https://openpanel.dev"><img alt="analytics by OpenPanel" src="https://shieldcn.dev/badge/analytics%20by-OpenPanel-2564EB.svg?logo=openpanel&amp;logoColor=fff&amp;variant=branded&amp;brand=openpanel&amp;size=xs" /></a>
</p>

<p align="center">
  Semantic design tokens · Tailwind v4 via Uniwind · Reanimated on the UI thread.
</p>

<p align="center">
  <a href="https://panelui.dev/docs"><b>Documentation</b></a> ·
  <a href="https://panelui.dev/docs/installation">Installation</a> ·
  <a href="https://panelui.dev/docs/components/button">Components</a> ·
  <a href="https://panelui.dev/docs/customization/theming">Theming</a> ·
  <a href="https://panelui.dev/docs/cli">CLI</a>
</p>

<p align="center">
  <a href="https://neon.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Sponsored%20by%3A?variant=ghost&size=lg&font=inter&fontSize=20&height=44&mode=dark" />
      <img src="https://shieldcn.dev/badge/Sponsored%20by%3A?variant=ghost&size=lg&font=inter&fontSize=20&height=44&mode=light" alt="Sponsored by:" />
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://neon.com">
    <img
      src="https://raw.githubusercontent.com/panel-ui/PanelUI/main/.github/assets/neon.png"
      alt="Neon"
      width="200"
    />
  </a>
</p>

---

**PanelUI is an open-source React Native UI component library for Expo apps**, styled with
Tailwind CSS v4 and animated with Reanimated 4. **127 accessible, typed component modules** — buttons,
inputs, forms, dialogs, bottom sheets, charts, calendars, maps and a set of AI chat components —
in one coherent visual language, with light and dark themes out of the box.

Pure TypeScript with no native modules, so it runs in **Expo Go** with no `prebuild`, no Xcode and
no Android Studio.

## Why PanelUI

- ⚡ **Fast styling** — [Uniwind](https://uniwind.dev) brings Tailwind v4 to React
  Native with no Babel transform, around 2.4–3× faster than the alternatives.
- 🧵 **UI-thread animations** — press feedback, switches, sheets, dialogs and tabs all run on the
  UI thread with Reanimated 4. No JS-thread jank.
- 🎨 **Semantic design tokens** — one colour system (`background`, `primary`, `muted`,
  `destructive`, …) across light and dark, precomputed to static values for native.
- 🌗 **Native dark mode** — theme switching is applied natively, without re-rendering your tree.
- ♿ **Accessible by default** — every interactive component wires up `accessibilityRole` and
  mirrors its state.
- 🧩 **Compound APIs** — `Card.Header`, `Dialog.Content`, `Table.Row` compose the way the markup
  reads.
- 📦 **Typed, tree-shakeable, zero native code** — works in Expo Go, ships full TypeScript types.

## Getting started

Needs Node 20+. A new app, with everything below already done:

```bash
npx create-panelui-app@latest
```

Adding it to an app you already have, on Expo SDK 57+:

```bash
npx expo install panelui-native
npx expo install uniwind tailwindcss react-native-reanimated react-native-worklets react-native-gesture-handler react-native-safe-area-context react-native-svg @react-native-masked-view/masked-view expo-linear-gradient
```

Then three files — a Metro config, a CSS entry and the provider. The
**[installation guide](https://panelui.dev/docs/installation)** walks through each one and lists a
fix for every error people hit.

### Or copy the source

`panelui-cli` copies a component's source into your project, to own and edit:

```bash
npx panelui-cli@latest init
npx panelui-cli@latest add button
```

Both approaches are supported and you can mix them. See [the CLI docs](https://panelui.dev/docs/cli).

## Usage

```tsx
import { Button, Card, Dialog, Input } from 'panelui-native';

function CreateProject() {
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

Every component takes `className`, so anything can be restyled with Tailwind classes:

```tsx
<Button className="w-full rounded-full" labelClassName="uppercase">
  Continue
</Button>
```

## Components

**127 component modules**, documented with live examples and full props tables at
**[panelui.dev/docs](https://panelui.dev/docs)**.

- **Layout & content** — Card, Frame, PageHeader, Surface, Item, GridItem, Separator, Splitter, Typography,
  SplitView,
  Table, Timeline, Steps, Accordion, Collapsible, Carousel, EmptyState, Skeleton
- **Forms & inputs** — Form, Field, Input, Textarea, InputGroup, NumberInput, OtpInput, SearchBar,
  Select, Combobox, TagInput, Checkbox, RadioGroup, Switch, Slider, Rating, Signature, ColorPicker,
  DatePicker, TimePicker, DateTimePicker, Calendar, Label, MarkdownEditor, Questionnaire
- **Actions & navigation** — Button, ButtonGroup, ToggleButton, Fab, Menu, ContextMenu, Swipe,
  SelectionMode, Sortable, Tabs, Breadcrumb, Pagination, SectionRail, Panelside, Tree, Chip, Badge
- **Overlays & feedback** — Dialog, BottomSheet, Drawer, Popover, Tooltip, Toast, Alert, Tour,
  Progress, Meter, Spinner, Loader
- **Data visualisation** — Plot, LineChart, LiveLineChart, AreaChart, BarChart, WaterfallChart,
  PyramidChart, ScatterChart, BubbleChart, CandlestickChart, PieChart, PolarAreaChart, FunnelChart,
  TreemapChart, RingChart, RadarChart, HeatmapChart, HexChart, Kpi, Map, Marker, Flow, QRCode
- **AI components** — Message, MessageScroller, Response, Reasoning, Plan, Task, Sources,
  CodeBlock, Shimmer, ThinkingOrb, Soundwave
- **Social** — Post, Avatar, Attachment
- **Scroll & motion** — ScrollFade, ScrollText, ScrollCanvas, TextAnimation, Marquee, Direction

Plus the primitives: `PanelUIProvider`, `Portal`, `AnimatedPressable`, `useTheme`, `useThemeMode`,
`useToast`, `cn`.

## Theming

Six themes ship in [`theme.css`](packages/panelui/theme.css) — `light`, `dark`, `moon`,
`moon-dark`, `grass` and `grass-dark`. Each family sets its own radius scale as well as its own
palette, so switching one changes the shape of the UI too.

```tsx
const { theme, setTheme } = useTheme();
setTheme('moon-dark');
setTheme('system'); // follow the device

const { family, mode, setFamily, toggleMode } = useThemeMode();
toggleMode();       // dark ↔ light, staying in the current brand
setFamily('grass'); // switch family, staying in the current mode
```

Tokens are CSS variables and can be overridden in your own `global.css`. See
**[Colors](https://panelui.dev/docs/customization/colors)** for the token reference and the
`@variant` shape overrides have to use, and **[Fonts](https://panelui.dev/docs/customization/fonts)**
for pointing the library at a typeface of your own.

## Coding agents

An agent writing React Native in your project has no idea PanelUI is there. It writes a styled
`View` where there is a `Card`, invents a prop `Button` does not have, and hardcodes `#171717`
into a screen that has six themes.

The **skill** tells it. In Claude Code it installs as a plugin, and brings the MCP server with it:

```
/plugin marketplace add panel-ui/PanelUI
/plugin install panelui
```

For any other agent — Cursor, Copilot, Windsurf, Codex — the same folder installs with the
`skills` CLI:

```sh
npx skills add panel-ui/PanelUI
```

It carries an index of every component and a file each with the anatomy, every prop with its type
and default, the variants and the parts, generated from the library's own TypeScript. Alongside
those: the install steps and **every reason `className` silently does nothing**, worked screens
for the compositions that come up (settings, form, chat, filters, charts, search), the hooks and
primitives, and the rules that are not negotiable. It reads from disk, so an agent with no network
tool is not left guessing.

The skill activates on its own once a project has `panelui-native` in its dependencies or a
`panelui.json` beside it. Full details, and the URLs everything is served from, at
**[panelui.dev/docs/skills](https://panelui.dev/docs/skills)**.

## Example app

An Expo Router showcase with a live demo for every component and a theme picker — used to
smoke-test the whole library in all six themes before a release.

```sh
git clone https://github.com/panel-ui/PanelUI.git
cd PanelUI
npm install
npx expo prebuild --clean   # in apps/example, once
npm run example
```

**The showcase needs a development build; it does not run in Expo Go.** One component is the
reason — `Map`, whose renderer is native code that Expo Go's prebuilt binary does not contain.
Opening it in Expo Go closes the app with nothing in the terminal, which looks like a crash in
the library and is not one. See [`apps/example/README.md`](apps/example/README.md).

The library itself is a different matter: it ships no native code and runs in Expo Go.

## Contributing

Contributions are welcome. The library lives in [`packages/panelui`](packages/panelui), the
showcase in [`apps/example`](apps/example) and the documentation site in
[`apps/docs`](apps/docs).

```sh
npm install         # install workspace deps
npm test            # run every repository contract test
npm run typecheck   # typecheck all workspaces
npm run build       # build the library
```

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a pull request, and please follow the
**[Code of Conduct](CODE_OF_CONDUCT.md)**.

## Community

- **[Report a bug](https://github.com/panel-ui/PanelUI/issues/new?template=bug_report.yml)** or
  **[request a component](https://github.com/panel-ui/PanelUI/issues/new?template=feature_request.yml)**
- **[Ask a question](https://github.com/panel-ui/PanelUI/discussions)** in Discussions
- Star the repo if PanelUI is useful to you — it is how other people find it

## Contributors

Thank you to everyone who has shipped something here. If you would like to join them,
**[CONTRIBUTING.md](CONTRIBUTING.md)** is the place to start.

<p align="center">
  <a href="https://github.com/panel-ui/PanelUI/graphs/contributors">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/contributors/panel-ui/PanelUI.svg?title=false&amp;preset=transparent&amp;border=false&amp;mode=dark" />
      <img alt="PanelUI contributors" src="https://shieldcn.dev/contributors/panel-ui/PanelUI.svg?title=false&amp;preset=transparent&amp;border=false&amp;mode=light" />
    </picture>
  </a>
</p>

## License

[MIT](LICENSE) © Khalid Abdi
