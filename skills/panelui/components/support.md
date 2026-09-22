# Support

The screen a person arrives on when they need help.

```tsx
import { Support } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Support } from '@/components/ui/support';
```

### Anatomy

```tsx
<Support availability="online">
  <Support.Header />         {/* the screen's name, and who answers */}
  <Support.Status />         {/* whether anyone is there, and how long a reply takes */}

  <Support.Channels>         {/* the ways to reach somebody */}
    <Support.Channel />
  </Support.Channels>

  <Support.Topics>           {/* what the problem is about */}
    <Support.Topic />
  </Support.Topics>

  <Support.Conversations>    {/* requests already made */}
    <Support.Conversation />
  </Support.Conversations>

  <Support.Articles>         {/* the questions with a written answer */}
    <Support.Article />
  </Support.Articles>
</Support>
```

### Variants

- **availability** — `online` *(default)*, `away`, `offline`
- **selected** — `true`, `false` *(default)*
- **disabled** — `true`

### Parts

- `Support.Header` — The screen's name and one line under it, with a trailing slot for the faces of the people who answer.
- `Support.Status` — Whether anyone is there, and how long an answer takes. The dot takes its colour from `availability`; `replyTime` is your own wording, because the honest version is a median somebody measured and the rounding is a judgement about tone.
- `Support.Channels` — The titled run of ways to get in touch.
- `Support.Channel` — One of them. A row rather than a tile, because each channel is a sentence — what it is, and what it costs you in waiting — and a grid of icons with one word under each is a quiz about which one is right.
- `Support.Topics` — Single-select group for what the problem is about. A request goes to one queue, so it selects one. Controlled with `value`, or left to track its own.
- `Support.Topic` — One thing the problem could be about, with room for a line of what belongs under it.
- `Support.Conversations` — The titled run of requests the reader already made.
- `Support.Conversation` — One of them: the subject, the last thing said, where it has got to, and when it last moved.
- `Support.Articles` — The titled run of help-centre pages.
- `Support.Article` — One page, with the collection it came from under it.

### Props

#### `SupportProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `availability` | `SupportAvailability` | `online` | Whether anyone is at the other end. Read by every part below rather than passed to each — a screen that is half "we're here" and half "we're not" is worse than either. |
| `children` | `ReactNode` | — | — |

#### `SupportHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | The screen's own name. |
| `description` | `string` | — | One line under it — who answers, or what this section covers. |
| `children` | `ReactNode` | — | Trailing slot: the faces of the people who answer, or a close button. |

#### `SupportStatusProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `availability` | `SupportAvailability` | `online` | Overrides the availability the root published. |
| `replyTime` | `string` | — | How long a reply takes, in your own words — "Typically replies in under an hour", "Back on Monday". Left unset, the availability alone is stated. A string rather than a number of minutes, because the honest version of this is a median somebody measured and the rounding is a judgement about tone: "a few minutes" and "4 minutes" promise different things. |
| `children` | `ReactNode` | — | — |

#### `SupportGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small heading above the rows. |
| `children` | `ReactNode` | — | — |

#### `SupportChannelProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ReactNode` | — | The glyph on the left. Tinted to match the row. |
| `label` | `string` | **required** | What the channel is called — the thing pressed, so write it as an action. |
| `description` | `string` | — | One line under it: what it is for, or the address behind it. |
| `detail` | `string` | — | Trailing note — a wait time, an opening hour. |
| `disabled` | `boolean` | — | — |
| `onPress` | `() => void` | — | — |

#### `SupportTopicsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small heading above the list. |
| `value` | `string \| null` | — | The selected topic. Leave unset to let the group track it. |
| `defaultValue` | `string \| null` | — | The topic selected before anybody pressed anything. |
| `onValueChange` | `(value: string) => void` | — | — |
| `children` | `ReactNode` | — | — |

#### `SupportTopicProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | What this topic is worth to the group's `value`. |
| `icon` | `ReactNode` | — | — |
| `label` | `string` | **required** | — |
| `description` | `string` | — | One line of what belongs under it, for the ones whose name is not enough. |
| `disabled` | `boolean` | — | — |
| `onPress` | `() => void` | — | — |

#### `SupportConversationProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | **required** | What it was about. |
| `preview` | `string` | — | The last thing said in it. |
| `status` | `SupportConversationStatus` | `open` | Where it has got to. |
| `timestamp` | `string` | — | When it last moved, in your own words — "2h", "Yesterday". |
| `unread` | `boolean` | `false` | There is a reply here the reader has not seen. Separate from `updated`, because they are different facts: a thread can move without anything being addressed to you, and a dot that means both means neither. |
| `updated` | `boolean` | `false` | The thread moved since it was last opened, with nothing new to read. |
| `reference` | `string` | — | Reference for the request, shown beside the status. |
| `onPress` | `() => void` | — | — |

#### `SupportArticleProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `icon` | `ReactNode` | — | — |
| `title` | `string` | **required** | The article's own title. |
| `collection` | `string` | — | Which part of the help centre it came from. |
| `onPress` | `() => void` | — | — |

### Example — The ways in

Each channel is a row with an action for a label, a line of what it is for, and what the wait is. `disabled` is for a channel that is real but shut — out of hours, or not on this plan — which reads better than a channel that vanishes.

```tsx
<Support.Channels title="Get in touch">
  <Support.Channel
    icon={<SparklesIcon />}
    label="Ask the assistant"
    description="Answers most questions straight away"
    onPress={openAssistant}
  />
  <Support.Channel
    icon={<MessageCircleIcon />}
    label="Message the team"
    description="We pick these up through the day"
    detail="~1h"
    onPress={openThread}
  />
  <Support.Channel
    icon={<MailIcon />}
    label="Email us"
    description="support@example.com"
    detail="1 day"
    onPress={openMail}
  />
</Support.Channels>
```

### Notes

### Availability

`availability` is published by the root and read from context by `Support.Status`. A part can override it for itself, which is for the case where one channel keeps different hours from the rest — not for saying two different things about the same team.

### Why the conversation is not in here

A support thread is a chat transcript. `Message`, `MessageScroller`, `Response`, `Sources`, `Reasoning` and `AIInput` already cover one, including the scroll behaviour and the keyboard handling, and a second set of bubbles living in this component would drift away from those the first time either changed. So `Support` ends where the conversation begins.

### Statuses

Four, and fewer than a helpdesk runs internally. The states a desk distinguishes for its own routing are not distinctions the person waiting can act on, and offering them invites a question about the difference that nobody wants to answer.

### Selection

`Support.Topics` is a radio group: it wires `accessibilityRole` on itself and on each `Support.Topic`, and reports the selected one through `accessibilityState`. Leave `value` unset and it tracks its own; pass it and it stands back.

---

Full page, with every example: https://panelui.dev/docs/components/support
