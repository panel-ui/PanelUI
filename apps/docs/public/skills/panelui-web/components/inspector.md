# Inspector

The settings panel beside an editor's canvas: a rail of icons, each opening a page of titled sections.

```tsx
import { Inspector } from "@/components/panelui/inspector"
```

From npm the path is `panelui-web/inspector`. Install with `npx shadcn@latest add @panelui/inspector`.

## When to use it

Use it for the settings beside an editor's canvas: the properties of what is selected, or the options of a recording, a photo or a page. The rail on the side holds one icon per page, and the panel shows the open page as titled sections.

A section's title shares its line with one action: a [Switch](/docs/web/components/switch) that turns the whole section on, or a Reset that puts its values back. The controls under it are what that action applies to.

With only one page, leave the rail out and write the sections straight into the panel. For settings that belong to a form and are saved together, use a form with [Labels](/docs/web/components/label) instead.

## Usage

```tsx
<Inspector defaultValue="pointer">
  <Inspector.Rail>
    <Inspector.Tab value="pointer" label="Pointer">
      <MousePointer2Icon />
    </Inspector.Tab>
    <Inspector.Tab value="audio" label="Audio">
      <Volume2Icon />
    </Inspector.Tab>
  </Inspector.Rail>
  <Inspector.Panel className="h-[30rem]">
    <Inspector.Page value="pointer">
      <Inspector.Section>
        <Inspector.SectionTitle>Click sound</Inspector.SectionTitle>
        <Inspector.SectionAction>
          <Switch size="sm" label="Click sound" />
        </Inspector.SectionAction>
        <Inspector.SectionContent>
          <Slider label="Volume" defaultValue={40} />
        </Inspector.SectionContent>
      </Inspector.Section>
    </Inspector.Page>
    <Inspector.Page value="audio">…</Inspector.Page>
  </Inspector.Panel>
</Inspector>
```

## Parts

```tsx
<Inspector>
  <Inspector.Rail>
    <Inspector.Tab />
    <Inspector.RailSeparator />
  </Inspector.Rail>
  <Inspector.Panel>
    <Inspector.Page>
      <Inspector.Section>
        <Inspector.SectionTitle />
        <Inspector.SectionAction />
        <Inspector.SectionContent />
      </Inspector.Section>
      <Inspector.Separator />
    </Inspector.Page>
  </Inspector.Panel>
</Inspector>
```

- `Inspector.Rail` — The column of page icons, in a pill of its own beside the panel. A filled marker slides to the open page's icon.
- `Inspector.Tab` — One page's icon. `value` names the `Inspector.Page` it opens, and `label` is its tooltip and its name for a screen reader.
- `Inspector.RailSeparator` — A short line between groups of pages on the rail.
- `Inspector.Panel` — The card the pages open in. Give it a height, such as `h-[30rem]`, and a longer page scrolls inside it with a thin bar. Without pages, its children are one page of sections.
- `Inspector.Page` — What one tab opens. It arrives from the direction the marker moved.
- `Inspector.Section` — A titled group of settings. `collapsible` folds it away by its title, and `defaultOpen` or `open` with `onOpenChange` hold whether it is open.
- `Inspector.SectionTitle` — The section's name. In a collapsible section it is the button that folds it, with a chevron.
- `Inspector.SectionAction` — One control at the end of the title's line: the switch for the section, or a Reset.
- `Inspector.SectionContent` — The controls under the title, stacked with an even gap. In a collapsible section it opens and closes with an animated height.
- `Inspector.Separator` — A hairline between sections about different things.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `InspectorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `InspectorRailProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `InspectorTabProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | **required** | What the page is called: the tab's tooltip and its name for a screen reader. |
| `className` | `string` | — | — |

#### `InspectorPageProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `InspectorSectionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `collapsible` | `boolean` | `false` | Fold the section away by its title. Its content then shows only while it is open. |
| `defaultOpen` | `boolean` | `true` | Whether a collapsible section starts open. Default true. |
| `open` | `boolean` | — | Whether a collapsible section is open, when the caller holds it. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when a collapsible section opens or closes. |

## In a Server Component

`Inspector` is a client component. A Server Component cannot read `Inspector.Rail` off the import, so import each part by name: `InspectorRail`, `InspectorTab`, `InspectorRailSeparator`, `InspectorPanel`, `InspectorPage`, `InspectorSection`, `InspectorSectionTitle`, `InspectorSectionAction`, `InspectorSectionContent`, `InspectorSeparator`.

## Notes

#### Keyboard

The rail is one stop in the tab order. The up and down arrows move between pages, and Tab goes on into the open page.

#### Height

The panel sizes to its page unless it is given a height. In an editor, give it the height of the canvas beside it, so switching pages does not move anything else on the screen.

With reduced motion turned on, the marker, the pages and folding sections change without moving.

## Example

```tsx
'use client';

import { ImageIcon, LayoutPanelTopIcon, MousePointer2Icon, VideoIcon, Volume2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/panelui/button';
import { ChoiceCards } from '@/components/panelui/choice-cards';
import { Inspector } from '@/components/panelui/inspector';
import { Slider } from '@/components/panelui/slider';
import { Switch } from '@/components/panelui/switch';
import { XYPad, type XYPadPoint } from '@/components/panelui/xy-pad';

const PERCENT = { style: 'unit', unit: 'percent' } as const;
const MOTION = { overshoot: 18, settle: 320, size: 1.25 };

const POINTERS = [
  { value: 'arrow', label: 'Arrow', drawing: <path d="M14 10v26l7-6.5 4.5 10 4.5-2-4.5-9.5H35Z" /> },
  { value: 'dot', label: 'Dot', drawing: <circle cx="24" cy="24" r="7" /> },
  {
    value: 'halo',
    label: 'Halo',
    drawing: (
      <>
        <circle cx="24" cy="24" r="15" fillOpacity={0.22} stroke="none" />
        <circle cx="24" cy="24" r="6" />
      </>
    ),
  },
];

const BACKDROPS = [
  { value: 'dusk', label: 'Dusk', image: 'linear-gradient(140deg, var(--chart-1), var(--chart-4))' },
  { value: 'lagoon', label: 'Lagoon', image: 'linear-gradient(140deg, var(--chart-2), var(--chart-3))' },
  { value: 'plain', label: 'Plain', image: 'var(--foreground)' },
];

export default function InspectorOverview() {
  const [clicks, setClicks] = useState(true);
  const [lead, setLead] = useState<XYPadPoint>({ x: 0.35, y: 0.1 });
  const [motion, setMotion] = useState(MOTION);
  const changed = motion !== MOTION || lead.x !== 0.35 || lead.y !== 0.1;

  return (
    <Inspector defaultValue="pointer">
      <Inspector.Rail>
        <Inspector.Tab value="backdrop" label="Backdrop">
          <ImageIcon />
        </Inspector.Tab>
        <Inspector.Tab value="pointer" label="Pointer">
          <MousePointer2Icon />
        </Inspector.Tab>
        <Inspector.Tab value="camera" label="Camera">
          <VideoIcon />
        </Inspector.Tab>
        <Inspector.Tab value="audio" label="Audio">
          <Volume2Icon />
        </Inspector.Tab>
        <Inspector.RailSeparator />
        <Inspector.Tab value="layout" label="Layout">
          <LayoutPanelTopIcon />
        </Inspector.Tab>
      </Inspector.Rail>

      <Inspector.Panel className="h-[30rem]">
        <Inspector.Page value="pointer">
          <Inspector.Section>
            <Inspector.SectionTitle>Click sound</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Switch size="sm" label="Click sound" checked={clicks} onCheckedChange={setClicks} />
            </Inspector.SectionAction>
            <Inspector.SectionContent>
              <ChoiceCards defaultValue="halo" aspect="5 / 4" aria-label="Pointer style">
                {POINTERS.map(({ value, label, drawing }) => (
                  <ChoiceCards.Item key={value} value={value}>
                    <ChoiceCards.Media>
                      <svg viewBox="0 0 48 48" className="size-9 fill-current stroke-background" strokeWidth={2}>
                        {drawing}
                      </svg>
                    </ChoiceCards.Media>
                    <ChoiceCards.Label>{label}</ChoiceCards.Label>
                  </ChoiceCards.Item>
                ))}
              </ChoiceCards>
              <Slider label="Click volume" defaultValue={42} format={PERCENT} disabled={!clicks} />
            </Inspector.SectionContent>
          </Inspector.Section>
          <Inspector.Separator />
          <Inspector.Section>
            <Inspector.SectionTitle>Motion</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Button
                size="sm"
                variant="secondary"
                disabled={!changed}
                onClick={() => {
                  setMotion(MOTION);
                  setLead({ x: 0.35, y: 0.1 });
                }}
              >
                Reset
              </Button>
            </Inspector.SectionAction>
            <Inspector.SectionContent>
              <XYPad label="Lead" value={lead} onValueChange={setLead} aspect="16 / 9" />
              <Slider
                label="Overshoot"
                value={motion.overshoot}
                onValueChange={(overshoot) => setMotion({ ...motion, overshoot })}
                format={PERCENT}
              />
              <Slider
                label="Settle time"
                min={80}
                max={800}
                step={10}
                value={motion.settle}
                onValueChange={(settle) => setMotion({ ...motion, settle })}
                format={(v) => `${v} ms`}
              />
              <Slider
                label="Pointer size"
                min={0.5}
                max={3}
                step={0.05}
                value={motion.size}
                onValueChange={(size) => setMotion({ ...motion, size })}
                format={(v) => `${v.toFixed(2)}×`}
              />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>

        <Inspector.Page value="backdrop">
          <Inspector.Section>
            <Inspector.SectionTitle>Backdrop</Inspector.SectionTitle>
            <Inspector.SectionContent>
              <ChoiceCards defaultValue="lagoon" aspect="1 / 1" aria-label="Backdrop">
                {BACKDROPS.map(({ value, label, image }) => (
                  <ChoiceCards.Item key={value} value={value}>
                    <ChoiceCards.Media>
                      <span className="size-full" style={{ background: image }} />
                    </ChoiceCards.Media>
                    <ChoiceCards.Label>{label}</ChoiceCards.Label>
                  </ChoiceCards.Item>
                ))}
              </ChoiceCards>
            </Inspector.SectionContent>
          </Inspector.Section>
          <Inspector.Separator />
          <Inspector.Section>
            <Inspector.SectionTitle>Frame</Inspector.SectionTitle>
            <Inspector.SectionContent>
              <Slider label="Padding" defaultValue={12} format={PERCENT} />
              <Slider label="Corners" min={0} max={48} defaultValue={18} format={(v) => `${v} px`} />
              <Slider label="Shadow" defaultValue={60} format={PERCENT} />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>

        <Inspector.Page value="camera">
          <Inspector.Section>
            <Inspector.SectionTitle>Show camera</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Switch size="sm" label="Show camera" defaultChecked />
            </Inspector.SectionAction>
            <Inspector.SectionContent>
              <Slider label="Size" defaultValue={22} format={PERCENT} />
              <Slider label="Roundness" defaultValue={100} format={PERCENT} />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>

        <Inspector.Page value="audio">
          <Inspector.Section>
            <Inspector.SectionTitle>Levels</Inspector.SectionTitle>
            <Inspector.SectionContent>
              <Slider label="Voice" defaultValue={80} format={PERCENT} />
              <Slider label="Music" defaultValue={24} format={PERCENT} />
            </Inspector.SectionContent>
          </Inspector.Section>
          <Inspector.Separator />
          <Inspector.Section>
            <Inspector.SectionTitle>Remove background noise</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Switch size="sm" label="Remove background noise" defaultChecked />
            </Inspector.SectionAction>
          </Inspector.Section>
        </Inspector.Page>

        <Inspector.Page value="layout">
          <Inspector.Section>
            <Inspector.SectionTitle>Margins</Inspector.SectionTitle>
            <Inspector.SectionContent>
              <Slider label="Inset" defaultValue={6} format={PERCENT} />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>
      </Inspector.Panel>
    </Inspector>
  );
}
```
