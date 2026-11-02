# Not Found

An error code drawn in pixels that come apart near the pointer, with a title and a way out.

```tsx
import { NotFound } from "@/components/panelui/not-found"
```

From npm the path is `panelui-web/not-found`. Install with `npx shadcn@latest add @panelui/not-found`.

## When to use it

Use it for a page that does not exist, or any page that stands in for an error: the code at the top, a title saying what happened, a line on what to do next, and the links that get someone out.

The code is drawn as cells on a canvas, in the text colour and an accent from the theme. A band of light goes slowly round it, and the pointer lights the cells it passes. Bring the pointer to a digit and that digit comes apart, then goes back together when the pointer moves on. Pick how it comes apart with `effect`.

The code is decoration. It is read to a screen reader as a short label, and the title is the page's heading, so write the title as if the code were not there.

## Usage

```tsx
<NotFound>
  <NotFound.Code code="404" />
  <NotFound.Title>Nothing lives at this address</NotFound.Title>
  <NotFound.Description>The link may be mistyped, or the page has moved.</NotFound.Description>
  <NotFound.Actions>
    <a href="/">Take me home</a>
  </NotFound.Actions>
</NotFound>
```

## Parts

```tsx
<NotFound>
  <NotFound.Code />
  <NotFound.Title />
  <NotFound.Description />
  <NotFound.Actions />
</NotFound>
```

- `NotFound.Code` — The code, drawn in cells. `effect` picks how a digit comes apart, `fill` draws solid strokes or outlines, and `color` is the theme role of the accent.
- `NotFound.Title` — What happened, in a few words. An `h1` by default; pass `as` for a lower level.
- `NotFound.Description` — One line on what to do next.
- `NotFound.Actions` — The links or buttons that get someone out, in a row that wraps on a narrow screen.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `NotFoundProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `backdrop` | `boolean` | — | Draws a faint grid behind everything, fading out towards the edges. On by default. |

#### `NotFoundCodeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `code` | `string` | `'404'` | The code to draw. Digits only; any other character leaves a blank the width of a digit. |
| `effect` | `NotFoundEffect` | `'scatter'` | How the digit nearest the pointer reacts. |
| `fill` | `'outline' \| 'solid'` | `'solid'` | Digits drawn with solid strokes three cells wide, or as their outline. |
| `ambient` | `boolean` | `true` | A band of light that goes slowly round the code on its own. While it is on, the canvas draws about 30 frames a second when the code is on screen; turn it off and nothing is drawn until the pointer comes near. |
| `color` | `NotFoundColor` | `'info'` | The theme role of the accent: the highlighted digit, the band of light and the pointer's light. |
| `highlight` | `number \| null` | — | Which digit is lit in `color` even with nothing else lighting it, counting from 0. Defaults to the middle one. `null` lights none of them. |
| `label` | `string` | — | What a screen reader says for the code. Defaults to "Error" and the code. |

#### `NotFoundTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `as` | `'h1' \| 'h2' \| 'h3'` | — | The heading level. A page that is only this one message wants `h1`. |

#### `NotFoundDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `NotFoundActionsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

## In a Server Component

`NotFound` is a client component. A Server Component cannot read `NotFound.Code` off the import, so import each part by name: `NotFoundCode`, `NotFoundTitle`, `NotFoundDescription`, `NotFoundActions`.

## Notes

#### Light

Each cell is drawn in either the text colour or the accent, depending on how much light falls on it. The highlighted digit is always partly lit. A band of light goes slowly round the code, and the pointer lights the cells within a few cells of it, which fade over about half a second once it moves on. Cells in half light are mixed between the two colours.

Pass `ambient={false}` to stop the band. The code is then still until the pointer comes near.

#### Which digit reacts

The digit nearest the pointer reacts once the pointer is within a few cells of it, and is put back once the pointer moves away or onto another digit. On a touch screen, tapping a digit does the same, and it is put back about 0.7 seconds after the finger lifts.

#### The highlighted digit

One digit is lit in `color` with nothing else lighting it. It is the middle one by default; `highlight` takes another position, counted from 0, or `null` to light none.

#### Backdrop

`NotFound` draws a faint grid behind its contents, fading out towards its edges. Pass `backdrop={false}` to leave it out, for instance inside a card that has a surface of its own.

#### Room around the code

Scattered cells fly outside the code's box, over whatever is around it. They do not block the pointer. `NotFound` clips them at its own left and right edges so a phone page never scrolls sideways; if you use `NotFound.Code` on its own, give its container `overflow-x: clip`.

#### Reduced motion

With reduced motion turned on, nothing travels and the band holds still. A digit under the pointer dims instead of scattering or dissolving, and Scramble swaps the digit for the icon at once.

#### Cost

The band draws 30 frames a second while the code is on screen, a few hundred cells in about sixteen fills each. Nothing is drawn while the code is scrolled out of view, and with `ambient={false}` nothing is drawn at rest.

#### Characters

`code` draws the digits 0 to 9. Any other character leaves a blank the width of a digit.

## Example

```tsx
'use client';

import { NotFound } from '@/components/panelui/not-found';
import { Button } from '@/components/panelui/button';

export default function NotFoundPage() {
  return (
    <NotFound>
      <NotFound.Code />
      <NotFound.Title as="h2">Nothing lives at this address</NotFound.Title>
      <NotFound.Description>
        The link may be mistyped, or the page has moved somewhere else.
      </NotFound.Description>
      <NotFound.Actions>
        <Button render={<a href="#" />}>Take me home</Button>
        <Button variant="ghost" render={<a href="#" />}>
          Report the link
        </Button>
      </NotFound.Actions>
    </NotFound>
  );
}
```
