# Sheet

A panel that rises from an edge of the screen, floating clear of it, and leaves with a swipe.

```tsx
import { Sheet } from "@/components/panelui/sheet"
```

From npm the path is `panelui-web/sheet`. Install with `npx shadcn@latest add @panelui/sheet`.

## When to use it

Use it for a task that belongs to the page but should not leave it: answering an invitation, editing a profile, changing a setting. It rises from an edge, stands a few pixels clear of every side with its corners rounded, and goes back with a swipe, the Escape key or a click outside.

A sheet that needs the whole height can meet the edges instead: set `size="full"` or `detached={false}`.

A sheet can open another. Declare the second one inside the first as `Sheet.Next` with a `name`, and any `Sheet.Trigger to="name"` in the first opens it: a row in the body, an icon in the header, a button in the footer. The first sheet steps back behind it. Wrap the app in `Sheet.Stage` and the page steps back too.

For a decision that needs an answer before anything else, use a dialog. For one question with a written answer, use [Feedback](/docs/web/components/feedback).

## Usage

```tsx
<Sheet>
  <Sheet.Trigger render={<Button />}>Edit profile</Sheet.Trigger>
  <Sheet.Content>
    <Sheet.Header title="Edit profile" description="Shown on your public page." />
    <Sheet.Body>
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input defaultValue="Noor Haddad" />
      </Field>
    </Sheet.Body>
    <Sheet.Footer>
      <Sheet.Close render={<Button />}>Save changes</Sheet.Close>
      <Sheet.Close render={<Button variant="ghost" />}>Cancel</Sheet.Close>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet>
```

## Parts

```tsx
<Sheet.Stage>
  <Sheet>
    <Sheet.Trigger />
    <Sheet.Content>
      <Sheet.Header>
        <Sheet.Close />
        <Sheet.Title />
        <Sheet.Description />
      </Sheet.Header>
      <Sheet.Body>
        <Sheet.Trigger to="details" />
      </Sheet.Body>
      <Sheet.Slides>
        <Sheet.Slide />
      </Sheet.Slides>
      <Sheet.Footer>
        <Sheet.Close />
      </Sheet.Footer>
      <Sheet.Next name="details">
        <Sheet.Header />
        <Sheet.Body />
        <Sheet.Footer />
      </Sheet.Next>
    </Sheet.Content>
  </Sheet>
</Sheet.Stage>
```

- `Sheet.Trigger` — What opens a sheet. A plain button, or your own through `render`. With `to`, it opens the `Sheet.Next` of that name instead, and `payload` is handed to that sheet.
- `Sheet.Content` — The sheet and the backdrop behind it. It draws the grabber on a top or bottom sheet and the round close button in the top trailing corner. `showGrabber={false}` and `showClose={false}` leave them out. `inline` draws it in the page instead of over it.
- `Sheet.Next` — A second sheet, opened from the first by any `Sheet.Trigger` whose `to` is its `name`. Declare it anywhere inside the first sheet's content. It takes the same props as `Content` and draws its own, so its children are the header, body and footer. Pass a function as its children to read the opening trigger's `payload`.
- `Sheet.Header` — The title and a line under it, as `title` and `description` or as `Title` and `Description` children. It leaves room for the close button on the same line.
- `Sheet.Title` — The sheet's name. It is also what a screen reader announces when the sheet opens.
- `Sheet.Description` — A sentence under the title, read out after it.
- `Sheet.Body` — The part that scrolls. The header and footer stay where they are while it moves.
- `Sheet.Slides` — A column of rounded slides in place of `Sheet.Body`, for photos or a deck. By default it is a deck: each slide fills the sheet's height, a scroll glides to the next slide, the arrow keys move one at a time, and a counter sits under it. `snap={false}` makes it a numbered column of smaller slides that scrolls freely, and with `onIndexChange` pressing one chooses it. `index` and `defaultIndex` hold the current slide.
- `Sheet.Slide` — One slide: a rounded frame that an image or a video fills edge to edge, or anything drawn. `label` is what a screen reader calls it after its place, such as "3 of 8".
- `Sheet.Footer` — The actions, stacked full width.
- `Sheet.Close` — Closes the sheet, even when `dismissible` is off. Give it `render` or children to make your own button close it. Written with nothing inside, it is the round close button, drawn where it is written; the one in the corner is then left out. Inside `Sheet.Header` it shares the title's line, before the title or after it depending on where it is written.
- `Sheet.Stage` — Wraps the page. While a sheet inside it is open, the page steps back slightly and rounds its corners. Set `--stage-radius` to the radius of what it sits in, less the gap, so the two corners are concentric.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `SheetProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether the sheet is open, when the caller holds that. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the sheet asks to open or close. |
| `defaultOpen` | `boolean` | `false` | Whether it starts open, when the caller does not hold it. |
| `side` | `SheetSide` | `bottom` | The edge it rises from and is swiped back to. Default `bottom`. |
| `dismissible` | `boolean` | `true` | Whether a click outside, a swipe or Escape closes it. Turn it off for a sheet that must be answered; `Sheet.Close` still works. |

#### `SheetTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `render` | `ReactElement` | — | Your own element to be the trigger, such as a styled button. It is given the click handler and the attributes that tie it to the sheet. |
| `to` | `string` | — | The `name` of a `Sheet.Next` to open instead of the sheet this trigger is in. Any button in a sheet can open the next one this way, wherever it sits. |
| `payload` | `unknown` | — | Handed to the `Sheet.Next` that `to` names, as the argument of its children function. Use it to open one sheet for every row of a list. |

#### `SheetNextProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `name` | `string` | **required** | What a `Sheet.Trigger` passes as `to` to open this sheet. Unique within one stack of sheets. |
| `side` | `SheetSide` | `bottom` | The edge it rises from. Default: the edge of the sheet it is declared in. |
| `dismissible` | `boolean` | `true` | Whether a click outside, a swipe or Escape closes it. Default true. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when it opens or closes. |

#### `SheetContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `detached` | `boolean` | `true` | Stand clear of the screen edges with every corner rounded. On by default; off, the sheet meets the edges it rises from. |
| `size` | `'auto' \| 'half' \| 'full'` | `'auto'` | How tall a top or bottom sheet is. `auto` fits the content; `half` and `full` take that share of the screen, and `full` meets the edges. |
| `showGrabber` | `boolean` | — | Show the grabber. On by default for a top or bottom sheet that a swipe can close, and off when `dismissible` is. |
| `showClose` | `boolean` | `true` | Show the round close button in the top trailing corner. Default true. Write a bare `<Sheet.Close />` into the sheet to place it somewhere else, or set this to `false` for a sheet with no close button at all. |
| `blur` | `boolean` | `false` | Frost the page behind the sheet instead of only dimming it. |
| `inline` | `boolean` | `false` | Draw the sheet in the page instead of over it: no backdrop, no trigger, always there. For previews and for a layout that shows the sheet as part of a screen. |

#### `SheetHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | The heading. In an open sheet it is also what the sheet is announced as. |
| `description` | `ReactNode` | — | A line under the heading. |

#### `SheetCloseProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `render` | `ReactElement` | — | Your own element to close the sheet with, such as a Cancel button. Without it, and without children, this is the round close button, drawn where it is written in place of the one in the corner. |
| `icon` | `boolean` | — | Draw the round close button. A `Sheet.Close` with nothing inside it already is one. |

#### `SheetSlidesProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `snap` | `boolean` | `true` | `true` makes it a deck: each slide fills the height, and a scroll glides to the next one. `false` makes it a numbered column of smaller slides that scrolls freely. Default `true`. |
| `index` | `number` | — | The current slide, counted from 0, when the caller holds it. Setting it scrolls that slide into view. |
| `defaultIndex` | `number` | `0` | The slide to start on, when the caller does not hold it. Default `0`. |
| `onIndexChange` | `(index: number) => void` | — | Called with the new index when the current slide changes: scrolled to in a deck, pressed in a column. In a column, passing it makes each slide a button. |
| `counter` | `boolean` | — | Show "3 / 8" under the current slide. Default: on in a deck. |
| `aspect` | `string` | `'16 / 9'` | The shape of a slide in a column, as a CSS aspect ratio. Default `16 / 9`. |

#### `SheetSlideProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | What a screen reader calls it, after its place: "3 of 8, Harbour at dawn". An image's `alt` usually says it already. |
| `aspect` | `string` | `'16 / 9'` | Its shape in a column, overriding `Sheet.Slides`' `aspect`. |

## In a Server Component

`Sheet` is a client component. A Server Component cannot read `Sheet.Trigger` off the import, so import each part by name: `SheetTrigger`, `SheetNext`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetBody`, `SheetFooter`, `SheetClose`, `SheetStage`, `SheetSlides`, `SheetSlide`.

## Notes

#### Closing a stack

A press outside the sheets closes all of them. Escape, a swipe and `Sheet.Close` close only the one on top, and the one behind it comes forward again.

#### Names

A `Sheet.Next` name is shared by every sheet in one stack, so a trigger finds its sheet however deep either of them is. Use each name once per stack.

A sheet written as a plain `<Sheet>` inside another sheet's content also stacks. That needs its trigger wrapped in it, so use `Sheet.Next` when the trigger and the sheet are apart.

#### Gestures

Swiping follows the pointer, and a quick flick toward the edge closes the sheet even when it has not moved far.

With a mouse, a press on text selects it instead of starting a drag. The grabber and the padding around the header still drag the sheet. Touch swipes from anywhere, except while text in the sheet is selected.

`dismissible={false}` keeps a click outside, Escape and a swipe from closing it. Only `Sheet.Close` and your own `open` state close it then.

`size` applies to top and bottom sheets. Side sheets always run the full height.

Focus moves into the sheet when it opens and returns to the trigger when it closes. The page behind cannot be scrolled or focused while it is open.

With reduced motion turned on, the sheet appears and disappears without sliding.

#### Slides need a height

A deck fills the height it is given, so put it in a sheet that has one: a side sheet, or a top or bottom sheet with `size="half"` or `size="full"`. In a sheet that sizes itself to its content it falls back to 60% of the screen, at most 32rem. A column needs no height of its own; it scrolls once it reaches the edge of the screen.

## Example

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Radio, RadioGroup } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Sheet } from '@/components/panelui/sheet';

export default function SheetEvent() {
  return (
    <Sheet>
      <Sheet.Trigger render={<Button variant="outline" />}>Respond to invite</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header
          title="Design critique"
          description="Thursday 22 October · 14:00–15:00"
        />
        <Sheet.Body className="flex flex-col gap-6">
          <RadioGroup defaultValue="going" aria-label="Your answer">
            <Label>
              <Radio value="going" /> Going
            </Label>
            <Label>
              <Radio value="maybe" /> Maybe
            </Label>
            <Label>
              <Radio value="declined" /> Can’t make it
            </Label>
          </RadioGroup>
          <Field>
            <FieldLabel>Note to Noor</FieldLabel>
            <Textarea placeholder="Running ten minutes late, start without me." />
          </Field>
          <Label className="justify-between">
            Remind me 15 minutes before
            <Switch defaultChecked />
          </Label>
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button size="lg" />}>Send answer</Sheet.Close>
          <Sheet.Close render={<Button size="lg" variant="ghost" />}>Cancel</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet>
  );
}
```
