# Card

A surface that holds one thing, with a heading, an action beside it and a footer.

```tsx
import { Card } from "@/components/panelui/card"
```

From npm the path is `panelui-web/card`. Install with `npx shadcn@latest add @panelui/card`.

## When to use it

Use it to hold one thing on a page: a plan, a setting, a summary, an item in a grid. It is a bordered surface with a header, a body and a footer, and the header keeps a place in its top trailing corner for a control that belongs to the whole card.

The padding lives on the parts, not on the card. A picture that should reach the card's edges goes straight inside it with `overflow-hidden` on the card.

It has no state and no event handlers of its own, so it renders as a server component.

For a list of rows under a title, use [Frame](/docs/web/components/frame).

## Usage

```tsx
<Card>
  <Card.Header>
    <Card.Title>Create a workspace</Card.Title>
    <Card.Description>Start on the free plan and invite your team later.</Card.Description>
    <Card.Action>
      <Button variant="link">Sign in</Button>
    </Card.Action>
  </Card.Header>
  <Card.Content>
    <Field>
      <FieldLabel>Work email</FieldLabel>
      <Input type="email" />
    </Field>
  </Card.Content>
  <Card.Footer variant="panel">
    <Button>Create workspace</Button>
  </Card.Footer>
</Card>
```

## Parts

```tsx
<Card>
  <Card.Header>
    <Card.Title />
    <Card.Description />
    <Card.Action />
  </Card.Header>
  <Card.Content />
  <Card.Footer />
</Card>
```

- `Card.Header` — The title, the line under it, and the action. It switches to two columns when there is an action.
- `Card.Title` — What the card is about. An `h3` by default; `as` picks another level to fit the page.
- `Card.Description` — A line under the title.
- `Card.Action` — A control for the whole card, held in the header's top trailing corner whatever order it is written in.
- `Card.Content` — The body. It starts with top padding of its own when the card has no header.
- `Card.Footer` — The row at the bottom. `variant="panel"` makes it a darker band set into the card, for actions.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `CardProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `'default' \| 'sm'` | — | `sm` tightens the padding and the title, for a card in a dense grid. Default `default`. |
| `as` | `'div' \| 'article' \| 'section' \| 'li'` | — | The element to render. `article` for a card that stands on its own, `li` for one in a list, `section` for one that groups a part of a page. |

#### `CardHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'card-header', className: slots.header({ className }) }, props),` | **required** | — |

#### `CardTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `as` | `'h2' \| 'h3' \| 'h4' \| 'div'` | — | The heading level, to fit the page around the card. Default `h3`. |

#### `CardDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'card-description', className: slots.description({ className }) }, props),` | **required** | — |

#### `CardActionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'card-action', className: slots.action({ className }) }, props),` | **required** | — |

#### `CardContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'card-content', className: slots.content({ className }) }, props),` | **required** | — |

#### `CardFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `'plain' \| 'panel'` | — | `plain` continues the card. `panel` is a darker band set into its bottom, for actions. Default `plain`. |

## In a Server Component

`Card` is a client component. A Server Component cannot read `Card.Header` off the import, so import each part by name: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`.

## Notes

`as` on the card renders it as a `div`, `article`, `section` or `li`. Use `article` for a card that makes sense on its own and `li` inside a list.

`Card.Title` is a heading so the page outline includes it. Set its level with `as`, from `h2` to `h4`, or `div` for a card that should stay out of the outline.

## Example

```tsx
import { Button } from '@/components/panelui/button';
import { Field } from '@/components/panelui/field';
import { Input } from '@/components/panelui/input';
import { Card } from '@/components/panelui/card';

export default function CardForm() {
  return (
    <Card as="section" className="w-full max-w-sm">
      <Card.Header>
        <Card.Title>Create a workspace</Card.Title>
        <Card.Description>Start on the free plan and invite your team later.</Card.Description>
        <Card.Action>
          <Button variant="link" className="px-0">
            Sign in
          </Button>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <form id="create-workspace" className="flex flex-col gap-5">
          <Field>
            <Field.Label>Work email</Field.Label>
            <Input type="email" placeholder="you@company.com" required />
          </Field>
          <Field>
            <Field.Label>Workspace name</Field.Label>
            <Input placeholder="Northwind Studio" required />
            <Field.Description>You can change it at any time.</Field.Description>
          </Field>
        </form>
      </Card.Content>
      <Card.Footer variant="panel" className="flex-col gap-2">
        <Button type="submit" form="create-workspace" className="w-full">
          Create workspace
        </Button>
        <Button variant="outline" className="w-full">
          Continue with Google
        </Button>
      </Card.Footer>
    </Card>
  );
}
```
