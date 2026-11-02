# Message

One turn of a conversation with an assistant: a person's bubble, or an answer set as prose with actions under it.

```tsx
import { Message } from "@/components/panelui/message"
```

From npm the path is `panelui-web/message`. Install with `npx shadcn@latest add @panelui/message`.

## When to use it

Use it for the turns of a conversation with an assistant. `from="user"` is what the person wrote, in a bubble on the trailing side. `from="assistant"` is the answer, set as prose across the full width with no bubble, because an answer is long and is the thing being read.

`Message.BubbleContent` sets paragraphs, lists, inline code, code blocks and headings, so Markdown rendered to HTML can go straight in.

It lays turns out and does not scroll them. Put the turns in a scrolling column of your own, and the composer under it; [Prompt](/docs/web/components/prompt) is one.

## Usage

```tsx
<Message from="user">
  <Message.Content>
    <Message.Bubble>
      <Message.BubbleContent>How do I make it for six?</Message.BubbleContent>
    </Message.Bubble>
  </Message.Content>
</Message>

<Message from="assistant">
  <Message.Content>
    <Message.Bubble>
      <Message.BubbleContent>Multiply by 1.5…</Message.BubbleContent>
    </Message.Bubble>
    <Message.Actions>
      <Message.Action label="Copy" copy={answer} />
    </Message.Actions>
  </Message.Content>
</Message>
```

## Parts

```tsx
<Message.Group>
  <Message>
    <Message.Avatar />
    <Message.Content>
      <Message.Header />
      <Message.Attachments>
        <Message.Attachment />
      </Message.Attachments>
      <Message.Status />
      <Message.Bubble>
        <Message.BubbleContent />
      </Message.Bubble>
      <Message.Footer />
      <Message.Actions>
        <Message.Branch />
        <Message.Action />
      </Message.Actions>
    </Message.Content>
  </Message>
</Message.Group>
```

- `Message.Group` — Turns in a row from the same side, set closer together. Its `from` applies to every `Message` in it.
- `Message.Avatar` — Optional: who the turn is from, beside its first line. An assistant's answer reads best without one, as plain text; use it where several people share a thread. Put an [Avatar](/docs/web/components/avatar) in it.
- `Message.Content` — The column that holds the rest. On a person's turn it is at most 80% of the width.
- `Message.Header` — A line above the turn: a name in `<strong>`, a time.
- `Message.Attachments` — The files sent with a turn, above its bubble.
- `Message.Attachment` — One file. With `src` it is a picture; without, a card with an `icon`, the `name` and a `meta` line.
- `Message.Status` — What the assistant is doing before its first word, as a line that shimmers. It is a `role="status"`, so it is read out as it changes. Swap it for the bubble when the text starts.
- `Message.Bubble` — The surface. A person's turn is drawn in a muted bubble; an assistant's draws nothing.
- `Message.BubbleContent` — The text, set as prose. With `streaming` on the `Message`, a caret follows the last word.
- `Message.Footer` — A line under the turn: seen, edited, how long it took.
- `Message.Actions` — The row of actions under an answer. `reveal="hover"` hides it until the turn is hovered or focused, for answers before the latest; on a touch screen it always shows.
- `Message.Action` — An icon button with a tooltip. `label` is required, because the button has no text. `copy` puts its text on the clipboard and shows a check for a moment. `pressed` makes it a toggle, such as a thumbs-up.
- `Message.Branch` — "‹ 2 / 3 ›", for stepping between versions of an answer that was retried or edited. `count`, `index` from 0, and `onIndexChange`.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `MessageProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `from` | `MessageFrom` | `assistant` | Who wrote it. A person's turn is a bubble on the trailing side; the assistant's is prose. |
| `streaming` | `boolean` | — | Still being written: a caret follows the last word and the turn is marked busy. |

#### `MessageGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `from` | `MessageFrom` | `assistant` | Who wrote every turn in it. |

#### `MessageAvatarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'message-avatar', className: messageVariants().avatar({ className }) }, props),` | **required** | — |

#### `MessageContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `MessageHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `MessageBubbleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `MessageFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `MessageActionsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `reveal` | `'always' \| 'hover'` | `always` | `always`, the default, for the latest answer. `hover` for earlier ones: hidden until the turn is hovered or focused, and always shown on touch. |

#### `MessageActionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | **required** | Said by a screen reader and shown in the tooltip. Required, since the button is an icon. |
| `copy` | `string \| (() => string)` | — | Text to put on the clipboard when pressed. The icon turns to a check for a moment, and the label to "Copied". |
| `pressed` | `boolean` | — | For a toggle such as a thumbs-up: whether it is on. |

#### `MessageBranchProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `count` | `number` | **required** | How many versions of the answer there are. |
| `index` | `number` | **required** | Which one is shown, from 0. |
| `onIndexChange` | `(index: number) => void` | **required** | Called with the index of the version asked for. |

#### `MessageAttachmentsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `MessageAttachmentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `name` | `string` | **required** | The file's name. |
| `src` | `string` | — | A picture to show in place of the file's card. |
| `meta` | `string` | — | A line under the name: its type and size. |
| `icon` | `ReactNode` | — | The glyph on a file's card. A page outline when left out. |

## In a Server Component

`Message` is a client component. A Server Component cannot read `Message.Group` off the import, so import each part by name: `MessageGroup`, `MessageAvatar`, `MessageContent`, `MessageHeader`, `MessageBubble`, `MessageBubbleContent`, `MessageFooter`, `MessageActions`, `MessageAction`, `MessageBranch`, `MessageStatus`, `MessageAttachments`, `MessageAttachment`.

## Notes

#### Accessibility

A streaming turn is `aria-busy`, so a screen reader reads it once it is finished rather than a word at a time. `Message.Status` is a `role="status"`. Each action has its `label` as its accessible name, and `Message.Actions` is a toolbar named "Message actions".

#### Reduced motion

With reduced motion turned on, the caret does not pulse and the status line does not shimmer.

#### Rendering Markdown

`Message.BubbleContent` styles the HTML that Markdown renders to: `p`, `ul`, `ol`, `li`, `strong`, `a`, `code`, `pre` and `h3`. Render the Markdown with the library you already use and put the result inside it.

## Example

```tsx
'use client';

import { RotateCcwIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { useState } from 'react';
import { Message } from '@/components/panelui/message';

const ANSWER =
  'Scale everything by 1.5, then round to what a kitchen measures. 300 g flour, 3 eggs, 375 ml milk and a pinch more salt. Bake in two tins rather than one deep one, at the same 180 °C for 25 minutes.';


export default function MessageConversation() {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);

  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <Message from="user">
        <Message.Content>
          <Message.Bubble>
            <Message.BubbleContent>This sponge serves four. How do I make it for six?</Message.BubbleContent>
          </Message.Bubble>
        </Message.Content>
      </Message>

      <Message from="assistant">
        <Message.Content>
          <Message.Bubble>
            <Message.BubbleContent>
              <p>
                Multiply by <strong>1.5</strong> and round to what you can weigh:
              </p>
              <ul>
                <li>300 g self-raising flour</li>
                <li>3 eggs, where the original had two</li>
                <li>375 ml milk</li>
              </ul>
              <p>Bake in two tins rather than one deeper one, at the same 180 °C for about 25 minutes.</p>
            </Message.BubbleContent>
          </Message.Bubble>
          <Message.Actions>
            <Message.Action label="Copy" copy={ANSWER} />
            <Message.Action label="Good answer" pressed={rating === 'up'} onClick={() => setRating(rating === 'up' ? null : 'up')}>
              <ThumbsUpIcon />
            </Message.Action>
            <Message.Action label="Bad answer" pressed={rating === 'down'} onClick={() => setRating(rating === 'down' ? null : 'down')}>
              <ThumbsDownIcon />
            </Message.Action>
            <Message.Action label="Try again">
              <RotateCcwIcon />
            </Message.Action>
          </Message.Actions>
        </Message.Content>
      </Message>

      <Message from="user">
        <Message.Content>
          <Message.Bubble>
            <Message.BubbleContent>And without eggs?</Message.BubbleContent>
          </Message.Bubble>
        </Message.Content>
      </Message>

      <Message from="assistant" streaming>
        <Message.Content>
          <Message.Bubble>
            <Message.BubbleContent>
              <p>Use 3 tablespoons of aquafaba for each egg, whisked until it holds soft peaks. Fold it in last, and</p>
            </Message.BubbleContent>
          </Message.Bubble>
        </Message.Content>
      </Message>
    </div>
  );
}
```
