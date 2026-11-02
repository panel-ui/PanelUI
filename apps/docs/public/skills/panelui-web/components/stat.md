# Stat

One figure written large, with a label over it, a unit after it and a badge beside it.

```tsx
import { Stat } from "@/components/panelui/stat"
```

From npm the path is `panelui-web/stat`. Install with `npx shadcn@latest add @panelui/stat`.

## When to use it

Use it for the one number a panel is about: storage used, a response time, words written this month. The badge on the far side of the row says how the reading stands, such as "31.6 GB free" or "inside budget".

It shows a number and nothing else. It does not draw a trend, a sparkline or a target; put the chart that goes with the number under it, in the same panel.

For a metric with a trend, a sparkline or progress towards a target, use [Kpi](/docs/web/components/kpi). For a number that rolls to its new value as it changes, put a [Rolling Number](/docs/web/components/rolling-number) inside `Stat.Value`.

## Usage

```tsx
<Stat>
  <Stat.Content>
    <Stat.Label>Response time</Stat.Label>
    <Stat.Value>
      240<Stat.Unit>ms</Stat.Unit>
    </Stat.Value>
  </Stat.Content>
  <Stat.Badge>60 ms inside budget</Stat.Badge>
</Stat>
```

## Parts

```tsx
<Stat>
  <Stat.Content>
    <Stat.Label />
    <Stat.Description />
    <Stat.Value>
      <Stat.Unit />
    </Stat.Value>
  </Stat.Content>
  <Stat.Badge />
</Stat>
```

- `Stat.Content` — The label and the value, stacked. Use it on its own, without `Stat` round it, for a figure with no badge.
- `Stat.Label` — What is measured, in a quiet line over the value. `weight="medium"` sets it heavier, for a figure that stands on its own rather than under a panel's title.
- `Stat.Description` — What the reading means, in words, under the label: "Answering slowly".
- `Stat.Value` — The figure. `size` is `sm`, `md` or `lg`, from 2xl to 4xl; the default is `lg`.
- `Stat.Unit` — The unit after the number, written inside `Stat.Value`. It takes its size and its gap from the value.
- `Stat.Badge` — How the reading stands, in a pill on the trailing side of the row.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `StatProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'stat', className: statVariants().root({ className }) }, props),` | **required** | — |

#### `StatContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'stat-content', className: statVariants().content({ className }) }, props),` | **required** | — |

#### `StatLabelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `weight` | `'normal' \| 'medium'` | — | `medium` sets the label in a heavier weight, for a figure that stands on its own rather than at the top of a panel that is already titled. Default `normal`. |

#### `StatDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'stat-description', className: statVariants().description({ className }) }, props),` | **required** | — |

#### `StatValueProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `'sm' \| 'md' \| 'lg'` | — | `sm` is 2xl, `md` 3xl and `lg` 4xl. Default `lg`. |

#### `StatUnitProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'stat-unit', className: statVariants().unit({ className }) }, props),` | **required** | — |

#### `StatBadgeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'stat-badge', className: statVariants().badge({ className }) }, props),` | **required** | — |

## In a Server Component

`Stat` is a client component. A Server Component cannot read `Stat.Content` off the import, so import each part by name: `StatContent`, `StatLabel`, `StatDescription`, `StatValue`, `StatUnit`, `StatBadge`.

## Notes

#### In a row and on its own

Inside `Stat`, the value is set with no leading, so the foot of the number lines up with the foot of the badge at the bottom of the row. A `Stat.Content` used on its own keeps the value's line height, which is what text beside it expects.

#### Changing values

Give `Stat` `aria-live="polite"` when the number changes as somebody uses the chart beside it, so a screen reader reads the new figure without cutting in on anything else.

#### Server Components

It holds no state and handles no events, so a Server Component can render it, dotted parts and all.

## Example

```tsx
import { Frame } from '@/components/panelui/frame';
import { RangeMeter } from '@/components/panelui/range-meter';
import { Stat } from '@/components/panelui/stat';

export default function StatStorage() {
  return (
    <Frame variant="band" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Storage</Frame.Title>
        <Frame.Action>Design team</Frame.Action>
      </Frame.Header>

      <Frame.Panel className="gap-4 p-5">
        <Stat>
          <Stat.Content>
            <Stat.Label>Used</Stat.Label>
            <Stat.Value>
              68.4
              <Stat.Unit>GB</Stat.Unit>
            </Stat.Value>
          </Stat.Content>
          <Stat.Badge>31.6 GB free</Stat.Badge>
        </Stat>

        <div className="flex flex-col gap-2">
          <RangeMeter
            value={68}
            color="info"
            formatValue={(value) => `${value}%`}
            label="Storage used"
            valueText="68 percent used"
          />
          <RangeMeter.Scale start="0 GB" end="100 GB" />
        </div>
      </Frame.Panel>
    </Frame>
  );
}
```
