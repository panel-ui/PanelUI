# Radio Group

One choice from a short list, with every option visible and the arrow keys moving between them.

```tsx
import { RadioGroup } from "@/components/panelui/radio-group"
```

From npm the path is `panelui-web/radio-group`. Install with `npx shadcn@latest add @panelui/radio-group`.

## When to use it

Use a radio group for one choice out of two to about seven options, where seeing every option at once helps someone choose.

For options that each need a line of description or a price, use `RadioGroup.Card`. For options best chosen by a picture, use [Choice Cards](/docs/web/components/choice-cards). For more than about seven, use a [Select](/docs/web/components/select). For a choice that applies at once without a form, use [Tabs](/docs/web/components/tabs).

## Usage

```tsx
<RadioGroup defaultValue="standard" aria-label="Delivery">
  <Label>
    <Radio value="standard" />
    <Label.Text>Standard</Label.Text>
  </Label>
  <Label>
    <Radio value="express" />
    <Label.Text>Express</Label.Text>
  </Label>
</RadioGroup>
```

## Parts

```tsx
<RadioGroup>
  <Radio />
</RadioGroup>

<RadioGroup>
  <RadioGroup.Card>
    <RadioGroup.CardBody>
      <RadioGroup.CardTitle />
      <RadioGroup.CardDescription />
    </RadioGroup.CardBody>
    <RadioGroup.CardAside />
  </RadioGroup.Card>
</RadioGroup>
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `RadioGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `orientation` | `'vertical' \| 'horizontal'` | — | Whether the radios stack or sit in a row. Also sets which arrow keys move the choice. Default `vertical`. |
| `className` | `string` | — | — |

#### `RadioProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `RadioSize` | `md` | Default `md`. |
| `color` | `RadioColor` | `primary` | The colour of the chosen radio. `primary` by default. |
| `label` | `string` | — | What a screen reader calls it, when there is no visible label tied to it. |
| `className` | `string` | — | — |
| `style` | `CSSProperties` | — | — |

#### `RadioCardProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `appearance` | `RadioCardAppearance` | — | How the chosen card is marked: a ring, a tint, or a dither ramp from the far edge. The ramp draws where `RadioGroup.CardAside` would sit, so leave the aside out of a `dither` card. Default `outline`. |
| `color` | `RadioColor` | `primary` | The colour the chosen card is marked in. `primary` by default. |
| `className` | `string` | — | — |
| `style` | `CSSProperties` | — | — |

## In a Server Component

`RadioGroup` is a client component. A Server Component cannot read `RadioGroup.Item` off the import, so import each part by name: `RadioGroupItem`, `RadioGroupCard`, `RadioGroupCardBody`, `RadioGroupCardTitle`, `RadioGroupCardDescription`, `RadioGroupCardAside`.

## Notes

#### Keyboard

The group is one Tab stop. Inside it, the arrow keys move the choice to the next radio, as a native radio group does.

#### Motion

The chosen radio's dot grows in with a small overshoot, and the one it leaves shrinks. With reduced motion turned on, both change at once.

#### Exports

`Radio` is also exported as `RadioGroup.Item` and `RadioGroupItem`. The card parts are also exported by name, such as `RadioGroupCard` and `RadioGroupCardTitle`, for a Server Component.

#### Reduced motion

The dither card's sweep and the dot's overshoot are skipped; the chosen card is filled at once.

## Example

```tsx
import { Label } from '@/components/panelui/label';
import { Radio, RadioGroup } from '@/components/panelui/radio-group';

export default function RadioGroupOverview() {
  return (
    <RadioGroup defaultValue="standard" aria-label="Delivery" className="w-full max-w-xs">
      <Label>
        <Radio value="standard" />
        <Label.Text>Standard</Label.Text>
        <Label.Action>3–5 days · Free</Label.Action>
      </Label>
      <Label>
        <Radio value="express" />
        <Label.Text>Express</Label.Text>
        <Label.Action>Next day · £6</Label.Action>
      </Label>
      <Label>
        <Radio value="collect" />
        <Label.Text>Collect in store</Label.Text>
        <Label.Action>Today · Free</Label.Action>
      </Label>
    </RadioGroup>
  );
}
```
