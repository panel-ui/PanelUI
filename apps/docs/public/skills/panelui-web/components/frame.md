# Frame

A panel of rows set into a tray, with the tray's top strip carrying the title.

```tsx
import { Frame } from "@/components/panelui/frame"
```

From npm the path is `panelui-web/frame`. Install with `npx shadcn@latest add @panelui/frame`.

## When to use it

Use it for a widget that is a list of rows under a title: deploys, settings, activity, service status. A panel of rows sits in a tray, and the tray's strip along the top carries the title, so the header needs no rule or background of its own.

`band` holds a bordered card in a thin muted band, for a widget that shows one figure or chart rather than a list. `inset` floats the panel in a recessed band and gives `Frame.Footer` a place for actions. `plain` drops the tray, for a frame inside a card or another container that already draws an edge.

It has no state of its own and renders as a server component. A row with `href` is a link and one with `onClick` is a button.

For a single surface with a heading and a body, use [Card](/docs/web/components/card).

## Usage

```tsx
<Frame>
  <Frame.Header>
    <Frame.Title>Deploys</Frame.Title>
    <Frame.Action>Last 24 hours</Frame.Action>
  </Frame.Header>
  <Frame.Panel>
    <Frame.Row>
      <Frame.Media><RocketIcon /></Frame.Media>
      <Frame.Content>
        <Frame.Title as="p">main · a41c2e9</Frame.Title>
        <Frame.Description>Production · 2 minutes ago</Frame.Description>
      </Frame.Content>
      <Frame.Actions><Badge>Ready</Badge></Frame.Actions>
    </Frame.Row>
  </Frame.Panel>
</Frame>
```

## Parts

```tsx
<Frame>
  <Frame.Header>
    <Frame.Title />
    <Frame.Description />
    <Frame.Action />
  </Frame.Header>
  <Frame.Panel>
    <Frame.Section>
      <Frame.Row>
        <Frame.Media />
        <Frame.Content>
          <Frame.Title />
          <Frame.Description />
        </Frame.Content>
        <Frame.Actions />
      </Frame.Row>
    </Frame.Section>
  </Frame.Panel>
  <Frame.Footer />
</Frame>
```

- `Frame.Header` — The strip above the panel: a title, an optional description, and `Frame.Action` on the trailing side.
- `Frame.Title` — A quiet caption in the header. Inside `Frame.Content` it is the row's subject instead: full colour, and cut to one line. Use `as="p"` there.
- `Frame.Description` — A line under a title, in the header or in a row.
- `Frame.Action` — The header's trailing side: a short status, a link, a small button.
- `Frame.Panel` — The card the rows sit on. It draws the hairline between its children, except under `band`, where it holds one figure and draws none.
- `Frame.Row` — One line of the panel. `href` makes it a link, `onClick` a button, and `chevron` marks one that leads somewhere.
- `Frame.Media` — A row's leading icon or avatar. It keeps its size.
- `Frame.Content` — The middle of a row. It takes the space left and can shrink past its content, so a long line truncates instead of pushing the actions off the edge.
- `Frame.Actions` — A row's trailing side: a badge, a value, a switch. It keeps its size.
- `Frame.Section` — A titled group of rows, for a panel holding more than one.
- `Frame.Footer` — The strip below the panel. Under `inset` its children become equal-width pills.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `FrameProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `FrameVariant` | `default` | `default` sets the panel in a tray. `band` holds a bordered card in a thin muted band, for a widget showing one figure or chart, and its panel draws no rule between its children. `inset` floats the panel in a recessed band and gives `Frame.Footer` somewhere to sit. `plain` drops the shell, for a frame inside a container that already draws its own edge. |

#### `FrameHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'frame-header', className: frameVariants().header({ className }) }, props),` | **required** | — |

#### `FrameTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `as` | `'h2' \| 'h3' \| 'h4' \| 'p'` | — | The heading level in a header. Default `h3`; a row title is always a `p`. |

#### `FrameDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `FrameActionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'frame-action', className: frameVariants().action({ className }) }, props),` | **required** | — |

#### `FramePanelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'frame-panel', className: frameVariants().panel({ className }) }, props),` | **required** | — |

#### `FrameRowProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `href` | `string` | — | Make the row a link to this address. |
| `target` | `string` | — | Where a link row opens, as on an `<a>`. |
| `rel` | `string` | — | The relationship of a link row's target, as on an `<a>`. |
| `onClick` | `MouseEventHandler<HTMLElement>` | — | Make the row a button that calls this. Ignored when `href` is set. |
| `chevron` | `boolean` | `false` | A trailing chevron, for a row that leads somewhere. |

#### `FrameMediaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'frame-media', className: frameVariants().media({ className }) }, props),` | **required** | — |

#### `FrameContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'frame-content', className: frameVariants().content({ className }) }, props),` | **required** | — |

#### `FrameActionsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'frame-actions', className: frameVariants().actions({ className }) }, props),` | **required** | — |

#### `FrameSectionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | The heading over the section's rows. |

#### `FrameFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'frame-footer', className: frameVariants().footer({ className }) }, props),` | **required** | — |

## In a Server Component

`Frame` is a client component. A Server Component cannot read `Frame.Header` off the import, so import each part by name: `FrameHeader`, `FrameTitle`, `FrameDescription`, `FrameAction`, `FramePanel`, `FrameRow`, `FrameMedia`, `FrameContent`, `FrameActions`, `FrameSection`, `FrameFooter`.

## Notes

The panel draws a hairline between each of its children, so rows never need to know whether they come first.

Under `band` and `inset` the panel's corners are the shell's less the band, so the two curves stay concentric.

The variant reaches the parts through a data attribute and CSS rather than React context, which is what keeps the frame a server component.

## Example

```tsx
import { GitBranchIcon, RocketIcon } from 'lucide-react';
import { Badge } from '@/components/panelui/badge';
import { Frame } from '@/components/panelui/frame';

const DEPLOYS = [
  { ref: 'main · a41c2e9', where: 'Production · 2 minutes ago', status: 'Ready', tone: 'success' as const, prod: true },
  { ref: 'feature/sheet · 7d02b11', where: 'Preview · 9 minutes ago', status: 'Building', tone: 'info' as const, prod: false },
  { ref: 'main · e5c90af', where: 'Production · 3 hours ago', status: 'Failed', tone: 'destructive' as const, prod: true },
  { ref: 'docs/hero · 19bf3a4', where: 'Preview · 5 hours ago', status: 'Ready', tone: 'success' as const, prod: false },
];

export default function FrameDeploys() {
  return (
    <Frame className="w-full max-w-md">
      <Frame.Header>
        <Frame.Title>Deploys</Frame.Title>
        <Frame.Action>Last 24 hours</Frame.Action>
      </Frame.Header>
      <Frame.Panel>
        {DEPLOYS.map((deploy) => (
          <Frame.Row key={deploy.ref}>
            <Frame.Media className="size-9 rounded-lg bg-muted text-muted-foreground">
              {deploy.prod ? <RocketIcon className="size-4" /> : <GitBranchIcon className="size-4" />}
            </Frame.Media>
            <Frame.Content>
              <Frame.Title as="p">{deploy.ref}</Frame.Title>
              <Frame.Description>{deploy.where}</Frame.Description>
            </Frame.Content>
            <Frame.Actions>
              <Badge variant={deploy.tone}>{deploy.status}</Badge>
            </Frame.Actions>
          </Frame.Row>
        ))}
      </Frame.Panel>
    </Frame>
  );
}
```
