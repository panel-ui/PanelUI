# Usage

How full a model's context or a plan is, as a small indicator that opens into the figures.

```tsx
import { Usage } from "@/components/panelui/usage"
```

From npm the path is `panelui-web/usage`. Install with `npx shadcn@latest add @panelui/usage`.

## When to use it

Use it to show how much of a model's context window is used, or how much of a plan or a budget is left. The indicator is small enough for a composer's footer or a chat header. Pressing it opens a popover with the figures behind it.

The colour comes from the share used. Below 70% it is the info colour, from 70% the warning colour, and from 90% the destructive one; `warning` and `critical` move those points. `state="idle"` greys it out for a conversation that has not started, and `state="done"` turns it to the success colour, with the ring closing into its dot.

Pass `segments` to say what the space is taken up by, oldest first. The ring and the bars draw them in that order with a gap between each: the earlier ones in neutral greys and the last one in the state's colour, because the last is usually the part still growing. Without segments, pass the amount as `value`.

For one number with its change over time, use a [KPI](/docs/web/components/kpi). For a limit somebody sets by dragging, use a [Range Meter](/docs/web/components/range-meter).

## Usage

```tsx
const context = [
  { label: 'System prompt', value: 9_400 },
  { label: 'Files', value: 41_800 },
  { label: 'Messages', value: 56_600 },
]

<Usage limit={200_000} segments={context}>
  <Usage.Trigger />
  <Usage.Content>
    <Usage.Summary label="Context window" unit="tokens" />
    <Usage.Breakdown />
  </Usage.Content>
</Usage>
```

## Parts

```tsx
<Usage>
  <Usage.Trigger />
  <Usage.Content>
    <Usage.Summary />
    <Usage.Breakdown />
    <Usage.Section>
      <Usage.Meter />
    </Usage.Section>
    <Usage.Footer />
  </Usage.Content>
</Usage>
```

- `Usage.Trigger` — The indicator, and the button that opens the popover. `variant` picks the look: `ring`, `dots`, `gauge`, `bar`, `cells` or `pill`. Its accessible name says the share used, such as "Context: 62% used".
- `Usage.Content` — The popover, opened above the trigger by default since the trigger usually sits low on the page. `side` and `align` place it.
- `Usage.Summary` — The amount used, written large with the limit and the share, and the segments as one bar under it. The figure rolls to its new value. `unit` goes after the limit.
- `Usage.Breakdown` — One row per segment, with a swatch in the colour the indicator draws it in, its amount and its share, and a last row for what is left. `freeLabel` renames that row, and `null` removes it.
- `Usage.Section` — A block of figures under a rule, with a `title` and an `aside` at the far end of the heading.
- `Usage.Meter` — One limit with its own `value` and `limit`, drawn as a row of ticks in the colour of its own share. `note` adds a line under it, such as when it resets, and `display` replaces the figure beside the label.
- `Usage.Footer` — A band at the foot of the popover, for a note and an action.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `UsageProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `limit` | `number` | **required** | How much there is in all, in the unit of the values: tokens, requests, dollars. |
| `segments` | `readonly UsageSegment[]` | — | What the used space is taken up by, oldest first. Their sum is the amount used. |
| `value` | `number` | — | The amount used, when there are no `segments` to add up. |
| `state` | `UsageState` | `'active'` | `idle` greys it out, `active` breathes, `done` turns it to the success colour. Default `active`. |
| `warning` | `number` | `0.7` | The share, from 0 to 1, at which it turns to the warning colour. Default `0.7`. |
| `critical` | `number` | `0.9` | The share, from 0 to 1, at which it turns to the destructive colour. Default `0.9`. |
| `label` | `string` | `'Context'` | What is being measured, as the trigger's accessible name begins. Default `Context`. |
| `format` | `Intl.NumberFormatOptions` | `{ notation: 'compact', maximumFractionDigits: 1 }` | How amounts are written. Default compact, so 124000 is `124K`. |
| `locales` | `Intl.LocalesArgument` | `'en-US'` | The locale the amounts are written in. Default `en-US`, so `124K` reads the same on every device; pass the reader's locale to write them in their language. |

#### `UsageTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `UsageVariant` | `ring` | The indicator: `ring`, `dots`, `gauge`, `bar`, `cells` or `pill`. Default `ring`. |
| `className` | `string` | — | — |

#### `UsageContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `side` | `Popover.Positioner.Props['side']` | — | Which side of the trigger it opens on. Default `top`, since the trigger usually sits low in a composer. |
| `align` | `Popover.Positioner.Props['align']` | — | How it lines up with the trigger along that side. Default `start`. |
| `sideOffset` | `number` | — | The gap between the trigger and the popover, in pixels. Default `8`. |
| `container` | `Popover.Portal.Props['container']` | — | Where in the document it is put. Default `document.body`. |
| `className` | `string` | — | — |

#### `UsageSummaryProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | `'Context'` | What is being measured, over the figure. Default the root's `label`. |
| `unit` | `ReactNode` | — | The unit after the limit: `tokens`. |

#### `UsageBreakdownProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `freeLabel` | `ReactNode` | — | What the unused space is called in the last row. Pass `null` for no such row. Default `Free`. |

#### `UsageSectionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | The section's heading: `Plan`, `This month`. |
| `aside` | `ReactNode` | — | Something at the far end of the heading, such as the plan's name. |

#### `UsageMeterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | `'Context'` | What it measures: `Session`, `This week`. |
| `value` | `number` | **required** | How much is used. |
| `limit` | `number` | — | How much there is. Default `100`, for a value that is already a percentage. |
| `note` | `ReactNode` | — | A line under the bar: when it resets, what happens at the limit. |
| `display` | `ReactNode` | — | How the value is written beside the label. Default `value / limit` in the root's format, or a percentage when `limit` is 100. |

## In a Server Component

`Usage` is a client component. A Server Component cannot read `Usage.Trigger` off the import, so import each part by name: `UsageTrigger`, `UsageContent`, `UsageSummary`, `UsageBreakdown`, `UsageSection`, `UsageMeter`, `UsageFooter`.

## Notes

#### Accessibility

The trigger's accessible name is the root's `label` and the share used, such as "Context: 62% used", or "not started" while idle. The drawing inside it is hidden from screen readers. Each `Usage.Meter` is a `role="meter"` with its value and limit.

#### Reduced motion

With reduced motion turned on, the indicator jumps to each new reading instead of growing to it, the dot stops breathing, and the popover appears without growing.

#### Amounts

Amounts are written compactly and in English by default, so 124000 is `124K` whatever language the device is set to. Pass `format` to the root for another style, such as `{ style: 'currency', currency: 'USD' }`, and `locales` to write them in the reader's language, such as `locales="ar"`.

## Example

```tsx
'use client';

import { Usage, type UsageState } from '@/components/panelui/usage';

/** One conversation at five points: not started, under way, getting full, nearly full, finished. */
const MOMENTS: { label: string; state: UsageState; segments: { label: string; value: number }[] }[] = [
  { label: 'New chat', state: 'idle', segments: [] },
  {
    label: 'Refactor auth',
    state: 'active',
    segments: [
      { label: 'System prompt', value: 9_400 },
      { label: 'Tools', value: 16_200 },
      { label: 'Messages', value: 58_000 },
    ],
  },
  {
    label: 'Migrate billing',
    state: 'active',
    segments: [
      { label: 'System prompt', value: 9_400 },
      { label: 'Files', value: 61_000 },
      { label: 'Messages', value: 84_000 },
    ],
  },
  {
    label: 'Audit logs',
    state: 'active',
    segments: [
      { label: 'System prompt', value: 9_400 },
      { label: 'Files', value: 92_000 },
      { label: 'Messages', value: 88_500 },
    ],
  },
  {
    label: 'Fix flaky test',
    state: 'done',
    segments: [
      { label: 'System prompt', value: 9_400 },
      { label: 'Messages', value: 31_000 },
    ],
  },
];

export default function UsageOverview() {
  return (
    <div className="flex items-center gap-3">
      {MOMENTS.map((moment) => (
        <Usage key={moment.label} limit={200_000} segments={moment.segments} state={moment.state}>
          <Usage.Trigger />
          <Usage.Content side="bottom" align="center">
            <Usage.Summary label={moment.label} unit="tokens" />
            <Usage.Breakdown />
          </Usage.Content>
        </Usage>
      ))}
    </div>
  );
}
```
