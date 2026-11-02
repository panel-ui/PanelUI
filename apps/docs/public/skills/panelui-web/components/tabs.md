# Tabs

A few views of one thing, one at a time, chosen from a row of tabs whose marker slides to the one chosen.

```tsx
import { Tabs } from "@/components/panelui/tabs"
```

From npm the path is `panelui-web/tabs`. Install with `npx shadcn@latest add @panelui/tabs`.

## When to use it

Use it to switch between a few views of the same thing: the overview, activity and files of one project, the sections of a settings page, a range on a chart. Only the chosen view is shown, and the others are a press away.

The views have to be peers. When one step leads to the next, use a sequence of steps instead. When the views are separate pages a reader should be able to link to, use links.

Tabs works best with two to six tabs. More than fit the row scroll sideways, with the end that has more faded, so a long row stays one line.

## Usage

```tsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="activity">
      Activity <Tabs.Badge>3</Tabs.Badge>
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">…</Tabs.Content>
  <Tabs.Content value="activity">…</Tabs.Content>
</Tabs>
```

## Parts

```tsx
<Tabs>
  <Tabs.List>
    <Tabs.Trigger>
      <Tabs.Badge />
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content />
</Tabs>
```

- `Tabs.List` — The row of tabs, and the marker under the chosen one. Give it an `aria-label` when nothing on the page names the tabs. It scrolls sideways when the tabs do not fit.
- `Tabs.Trigger` — One tab. Its `value` names the `Tabs.Content` it shows. An icon and a `Tabs.Badge` can sit beside the label. `disabled` keeps it from being chosen.
- `Tabs.Badge` — A count beside a tab's label: unread, open, waiting. It follows the tab's colour when the tab is chosen.
- `Tabs.Content` — What one tab shows. Only the chosen one is in the page; `keepMounted` keeps the others there, hidden, for content that is expensive to build again.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `TabsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `TabsVariant` | `segmented` | How the tabs are drawn. Default `segmented`. |
| `className` | `string` | — | — |

#### `TabsListProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `TabsTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `TabsBadgeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'tabs-badge', className: slots.badge({ className }) }, props),` | **required** | — |

#### `TabsContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

## In a Server Component

`Tabs` is a client component. A Server Component cannot read `Tabs.List` off the import, so import each part by name: `TabsList`, `TabsTrigger`, `TabsBadge`, `TabsContent`.

## Notes

#### Keyboard

The arrow keys move focus between tabs, Home and End go to the first and last, and Enter or Space chooses the one focused. Pass `activateOnFocus` to `Tabs.List` to choose a tab as soon as it is reached.

#### Reduced motion

With reduced motion turned on, the marker and the new view appear in place without sliding.

#### Built on

The tabs are the Base UI tabs, which the package depends on directly.

## Example

```tsx
'use client';

import { Tabs } from '@/components/panelui/tabs';

const PANELS = [
  {
    value: 'overview',
    label: 'Overview',
    text: 'The autumn catalogue: 64 pages, a print run of 4,000, due at the printer on 9 November.',
  },
  {
    value: 'activity',
    label: 'Activity',
    count: 3,
    text: 'Three changes today: the cover moved to review, twelve illustrations arrived, and the print date was set.',
  },
  {
    value: 'files',
    label: 'Files',
    text: 'The brief, the fourth cover and the print schedule. Nothing has been added since Monday.',
  },
];

export default function TabsOverview() {
  return (
    <Tabs defaultValue="overview" className="w-full max-w-md">
      <Tabs.List aria-label="Catalogue">
        {PANELS.map((panel) => (
          <Tabs.Trigger key={panel.value} value={panel.value}>
            {panel.label}
            {panel.count ? <Tabs.Badge>{panel.count}</Tabs.Badge> : null}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {PANELS.map((panel) => (
        <Tabs.Content key={panel.value} value={panel.value} className="text-sm leading-6 text-muted-foreground">
          {panel.text}
        </Tabs.Content>
      ))}
    </Tabs>
  );
}
```
