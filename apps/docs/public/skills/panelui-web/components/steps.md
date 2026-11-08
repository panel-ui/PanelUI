# Steps

A flow that moves one stop at a time, its numbered stops joined by a line that fills as far as you have got.

```tsx
import { Steps } from "@/components/panelui/steps"
```

From npm the path is `panelui-web/steps`. Install with `npx shadcn@latest add @panelui/steps`.

## When to use it

Use it for a flow that moves forward one stop at a time: a checkout, a wizard, onboarding, an upload. Each stop is a circle with a number, a tick or a spinner, and the stops are joined by a line that fills as far as the flow has got.

A stepper is not navigation and not a set of views. When the places are peers a reader should be able to look at in any order, use [Tabs](/docs/web/components/tabs). When they are separate pages worth linking to, use links. Steps is for a sequence with a beginning and an end, where the reader needs to know how much of it is behind them and how much is left.

Keep it to three to five stops. A flow with twelve steps is not a stepper, it is a form with a progress bar.

## Usage

```tsx
<Steps value={step} onValueChange={setStep}>
  <Steps.Item step={0}>
    <Steps.Trigger>
      <Steps.Indicator />
      <Steps.Title>Basket</Steps.Title>
    </Steps.Trigger>
  </Steps.Item>
  <Steps.Item step={1}>
    <Steps.Trigger>
      <Steps.Indicator />
      <Steps.Title>Delivery</Steps.Title>
    </Steps.Trigger>
  </Steps.Item>
  <Steps.Item step={2}>
    <Steps.Trigger>
      <Steps.Indicator />
      <Steps.Title>Payment</Steps.Title>
    </Steps.Trigger>
  </Steps.Item>
</Steps>
```

## Parts

```tsx
<Steps>
  <Steps.Item step={0}>
    <Steps.Trigger>
      <Steps.Indicator />
      <Steps.Title />
      <Steps.Description />
    </Steps.Trigger>
    <Steps.Separator />
  </Steps.Item>
</Steps>
```

- `Steps.Item` — One stop. Its `step` is its place in the flow, and its state is worked out by comparing that with the root's active step, so it never has to be kept in sync by hand. `completed` forces it done out of order, `loading` swaps the number for a spinner while it is the current step, `disabled` keeps it from being chosen, and `reachable` allows a step ahead to be chosen. The connector after it is drawn for you unless it is the last one or holds its own `Steps.Separator`.
- `Steps.Trigger` — The part that makes a step selectable. Every step is a `<button>` — the element does not change under a reader when a completed step becomes the current one, so focus stays put. A completed step is in the tab order and takes you back to itself; the step the flow is on, and any after it, are `aria-disabled` with `tabIndex={-1}`, so they are not dead stops but a reader already on one keeps their place. `render` draws it as something else, such as a router link.
- `Steps.Indicator` — The circle. It shows the position in the row, a tick once the step is complete, or a spinner while it is loading. Give it children to replace all of that with something of your own, such as an icon.
- `Steps.Title` — What the step is called. In a horizontal stepper it sits under the circle; in a vertical one it sits beside it.
- `Steps.Description` — A quieter line about the step: what it asks for, or what happened there. It runs on under the title without moving the connector.
- `Steps.Separator` — The connector to the next step. Every item draws one automatically, so this is only worth writing to dress a particular one; an item holding its own is given no second. It fills with the primary colour once the step before it is complete, so the line runs solid up to the flow and stays muted past it.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `StepsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | — | The active step, when the caller holds it. |
| `defaultValue` | `number` | `0` | The step it starts on, when the caller does not. Default `0`. |
| `onValueChange` | `(value: number) => void` | — | Called with the step chosen, whether by a trigger or by your own controls. |
| `orientation` | `StepsOrientation` | `'horizontal'` | Which way the flow runs. Default `horizontal`. |
| `separators` | `boolean` | `true` | Draw the connector between one step and the next. On by default. An item holding its own `Steps.Separator` is left alone either way, so this is for a stepper that wants no connectors at all. |
| `className` | `string` | — | Classes for the row, or column, that holds the steps. |

#### `StepsItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `step` | `number` | **required** | This step's position in the flow, as you number it. |
| `completed` | `boolean` | `false` | Force it complete, whatever the active step is. |
| `disabled` | `boolean` | `false` | Keep it from being chosen, and quiet its trigger. |
| `loading` | `boolean` | `false` | Show a spinner in the indicator while this is the active step. |
| `reachable` | `boolean` | `false` | Let this step be chosen while it is still ahead of the active one. For a flow that can be entered at any point; without it only steps already reached are pressable. |
| `className` | `string` | — | Classes for the box holding the trigger and its connector. |

#### `StepsTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the button, or the element `render` draws. |
| `render` | `useRender.ComponentProps<'button'>['render']` | — | Draw the trigger as another element, or compose it with a component: `render={<a href="/step-2" />}`. The step's classes, handlers and announcement are put on it. |

#### `StepsIndicatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the circle. |
| `render` | `useRender.ComponentProps<'span'>['render']` | — | Draw it as another element, or compose it with a component. |

#### `StepsTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the step's name. |
| `render` | `useRender.ComponentProps<'span'>['render']` | — | Draw it as another element, such as a heading: `render={<h3 />}`. |

#### `StepsDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the quieter line under the name. |
| `render` | `useRender.ComponentProps<'span'>['render']` | — | Draw it as another element. |

#### `StepsSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the connector. |

## In a Server Component

`Steps` is a client component. A Server Component cannot read `Steps.Item` off the import, so import each part by name: `StepsItem`, `StepsTrigger`, `StepsIndicator`, `StepsTitle`, `StepsDescription`, `StepsSeparator`.

## Notes

#### Two directions

`orientation="horizontal"` lays the stops across a row with the labels under the circles and the connectors between them, at circle height. `vertical` lays them down a column with the circle beside each label and the connector dropping from one to the next. Which state is which, and which steps can be pressed, does not change with the direction.

#### The state is worked out, not told

An item compares its own `step` with the root's active one: behind is complete, level is current, ahead is still to come. The circle, the title and the connector after it all read that one answer, so two current steps, or a tick on a step that has not been reached, cannot be written. `completed` is the one way to say a later stage was finished out of order; it fills the connector after it but does not make the step current.

#### The connectors

The root counts the items it holds and each one draws the connector to the next, so there is no separator to place, order or leave hanging past the last stop. Items have to be direct children of `Steps`, or in a fragment inside it, for that count to see them. `separators={false}` turns the automatic ones off; a `Steps.Separator` written by hand is kept either way and is not doubled.

#### Keyboard and screen readers

These are not tabs, and deliberately have no tablist semantics: a stepper is a line to walk, not a set to browse, so the arrow keys do nothing. Completed steps are buttons in the tab order — Tab reaches them, Enter or Space takes the flow back — and the step the flow is on and those ahead are also buttons, `aria-disabled` and removed from the tab order with `tabIndex={-1}`; the element type does not change when the flow moves, so focus is not lost. The current trigger carries `aria-current="step"`, and every trigger's name carries its position: a screen reader hears "Payment, step 2 of 3", and a completed one adds "completed". Pass `render={<a href="…" />}` when a step is a page of its own; the link keeps its semantics and its address.

#### Reduced motion

Colours settle over 200ms and the connector fills over 300ms. With reduced motion asked for, both change at once and nothing moves — there is no travel to remove, only the pause before the new colour.

#### Built on

Nothing but React and Tailwind, and the collection's own [Spinner](/docs/web/components/spinner) for the loading state. It adds no dependency and no stylesheet: every colour is a theme token, so a stepper follows the theme it is put in.

## Example

```tsx
'use client';

import { Steps } from '@/components/panelui/steps';

const STOPS = ['Basket', 'Delivery', 'Payment', 'Review'];

export default function StepsOverview() {
  return (
    <Steps defaultValue={1} className="max-w-lg">
      {STOPS.map((title, at) => (
        <Steps.Item key={title} step={at}>
          <Steps.Trigger>
            <Steps.Indicator />
            <Steps.Title>{title}</Steps.Title>
          </Steps.Trigger>
        </Steps.Item>
      ))}
    </Steps>
  );
}
```
