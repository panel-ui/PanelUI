# Alert

A message set into the page that stays until it is dealt with, as a card in a tray of its tone.

```tsx
import { Alert } from "@/components/panelui/alert"
```

From npm the path is `panelui-web/alert`. Install with `npx shadcn@latest add @panelui/alert`.

## When to use it

Use it for a message that belongs to a page and stays there until it has been dealt with: a payment that failed, a limit that is close, a form that needs another look.

By default the message is a card set into a tray tinted in its `tone`, and `Alert.Actions` sit in the strip of tray under the card, at its end. `variant="plain"` is one tinted box, for inside a form or a dialog that already has an edge. `variant="banner"` is one line across the top of a page or a panel.

An alert does not leave on its own. It stays until `Alert.Close` is pressed or `open` is set to false, and then it folds away.

To ask a question that has to be answered before anything else, use [Alert Dialog](/docs/web/components/alert-dialog).

## Usage

```tsx
<Alert tone="warning">
  <Alert.Icon />
  <Alert.Title>Storage is 90% full</Alert.Title>
  <Alert.Description>Uploads stop at 50 GB.</Alert.Description>
  <Alert.Actions>
    <Button size="sm">Upgrade</Button>
  </Alert.Actions>
  <Alert.Close />
</Alert>
```

## Parts

```tsx
<Alert>
  <Alert.Icon />
  <Alert.Title />
  <Alert.Description />
  <Alert.Details>
    <Alert.Item />
  </Alert.Details>
  <Alert.Actions />
  <Alert.Close />
</Alert>
```

- `Alert.Icon` — The glyph at the start, in the tone's colour. In the default variant it sits in a disc of that colour. Without children it draws the tone's own glyph.
- `Alert.Title` — What happened, in a few words.
- `Alert.Description` — The sentence under the title. A link in it is underlined.
- `Alert.Details` — A line under the description that opens into a list, for an alert that sums up several things. `label` is the line's text.
- `Alert.Item` — One entry in the list, marked with a dot in the tone's colour.
- `Alert.Actions` — The buttons. In the default variant they move out of the card into the tray under it; in `plain` they sit under the words, and in `banner` at the end of the line. Keep it a direct child of `Alert`.
- `Alert.Close` — A round cross at the end that folds the alert away. It calls `onOpenChange(false)`.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `AlertProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `tone` | `AlertTone` | `'neutral'` | The theme role it is drawn in, which also says how urgent it is. Default `neutral`. |
| `variant` | `AlertVariant` | `'default'` | `default` sets the message in a card inside a tray of its tone, with the actions in the tray under it. `plain` is one tinted box, for inside a form or a dialog. `banner` is one line across the top of a page or panel. |
| `open` | `boolean` | — | Whether it is shown, when the caller holds that. It folds away when it is not. |
| `defaultOpen` | `boolean` | `true` | Whether it starts shown, when the caller does not hold it. Default `true`. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when `Alert.Close` asks for it to close. |

#### `AlertIconProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |
| `className` | `alertVariants().icon({ className }),` | **required** | — |

#### `AlertTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'alert-title', className: alertVariants().title({ className }) }, props),` | **required** | — |

#### `AlertDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `AlertActionsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'alert-actions', className: alertVariants().actions({ className }) }, props),` | **required** | — |

#### `AlertDetailsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | **required** | The line that opens the list: "Show the 3 fields". |
| `open` | `boolean` | — | Whether the list is open, when the caller holds that. |
| `defaultOpen` | `boolean` | `false` | Whether the list starts open, when the caller does not hold it. Default `false`. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the line is pressed to open or close the list. |

#### `AlertItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'li',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'alert-item', className: alertVariants().item({ className }) }, props),` | **required** | — |

## In a Server Component

`Alert` is a client component. A Server Component cannot read `Alert.Icon` off the import, so import each part by name: `AlertIcon`, `AlertTitle`, `AlertDescription`, `AlertActions`, `AlertClose`, `AlertDetails`, `AlertItem`.

## Notes

#### Tone and screen readers

A `destructive` or `warning` alert has `role="alert"`, so a screen reader announces it as soon as it appears. The other tones have `role="status"` and are read when the reader reaches them. Pass `role` to choose for yourself.

#### Closing

A closed alert stays in the page at no height, and nothing inside it can be focused. Use `open` and `onOpenChange` to hold the state outside, for example to remember that it was dismissed. In a column with a `gap`, the gap stays where the alert was.

#### Actions in the tray

The default variant finds `Alert.Actions` among its own children and moves it into the tray, so keep it a direct child rather than wrapping it in another component.

## Example

```tsx
'use client';

import { Alert } from '@/components/panelui/alert';

export default function AlertOverview() {
  return (
    <Alert tone="info" className="w-full max-w-md">
      <Alert.Icon />
      <Alert.Title>Two-step sign-in starts on 1 December</Alert.Title>
      <Alert.Description>After their password, everyone in the workspace will be asked for a code from their phone.</Alert.Description>
    </Alert>
  );
}
```
