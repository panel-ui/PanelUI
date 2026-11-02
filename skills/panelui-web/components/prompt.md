# Prompt

A field for writing to an assistant, with its files, model and tools in one card.

```tsx
import { Prompt } from "@/components/panelui/prompt"
```

From npm the path is `panelui-web/prompt`. Install with `npx shadcn@latest add @panelui/prompt`.

## When to use it

Use it for the field a person writes to an assistant in: a question, an instruction, a follow-up. It holds the text, the files attached to it, the model it goes to, a menu of what else can be added, and the button that sends it.

It does not talk to a model. `onSubmit` is handed the text and the files, and `status` is how you tell it what the answer is doing: `submitted` and `streaming` turn the send button into a stop button and open the status band, and `error` marks the field.

The field is a card, and what is said about it sits in bands the card overlaps: a banner above for something to do first, a status band below for the answer on its way, and an inset strip below for where the message is going. Each opens and closes with its `open` prop.

For one question asked from anywhere on a page, with the answer listed under it, use [Command Dock](/docs/web/components/command-dock).

## Usage

```tsx
<Prompt onSubmit={send} status={status} onStop={stop}>
  <Prompt.Field>
    <Prompt.Attachments />
    <Prompt.Textarea placeholder="Ask anything" />
    <Prompt.Footer>
      <Prompt.Tools>
        <Prompt.Menu>
          <Prompt.AttachItem />
          <Menu.Separator />
          <Menu.CheckboxItem checked={search} onCheckedChange={setSearch}>
            <GlobeIcon />
            Search the web
          </Menu.CheckboxItem>
        </Prompt.Menu>
        <Prompt.Model items={models} />
      </Prompt.Tools>
      <Prompt.Submit />
    </Prompt.Footer>
  </Prompt.Field>
  <Prompt.Status>Writing the answer</Prompt.Status>
</Prompt>
```

## Parts

```tsx
<Prompt>
  <Prompt.Banner>
    <Prompt.BannerAction />
  </Prompt.Banner>
  <Prompt.Tasks>
    <Prompt.Task />
  </Prompt.Tasks>
  <Prompt.Commands />
  <Prompt.Field>
    <Prompt.Attachments />
    <Prompt.Textarea />
    <Prompt.Footer>
      <Prompt.Tools>
        <Prompt.Menu>
          <Prompt.AttachItem />
        </Prompt.Menu>
        <Prompt.Attach />
        <Prompt.Tool />
        <Prompt.Model />
      </Prompt.Tools>
      <Prompt.Submit />
    </Prompt.Footer>
    <Prompt.Recorder />
  </Prompt.Field>
  <Prompt.Status />
  <Prompt.Context>
    <Prompt.ContextItem />
  </Prompt.Context>
  <Prompt.Hint />
</Prompt>
```

- `Prompt.Banner` — A band above the field for something to do first, such as connecting an account. It folds under the field when `open` is false. With `mode`, it is open while the prompt is in that mode.
- `Prompt.Tasks` — A band above the field with an agent's tasks. One line holds a ring that fills as they are done, the `title` and a count; pressed, it opens into the list, which scrolls past `maxHeight`. With `mode`, the band is open while the prompt is in that mode.
- `Prompt.Task` — One task, `pending`, `active`, `done` or `error`. An active task's words are lit while it runs, and a done one is checked and struck through.
- `Prompt.Commands` — A band above the field listing `items` while the text is the trigger and a word. Chosen with the keys or a press.
- `Prompt.BannerAction` — The banner's button, at its end. It takes everything a [Button](/docs/web/components/button) does, `loading` included.
- `Prompt.Field` — The card that holds the text, the files and the footer. Files dropped on it are attached. `layout="inline"` puts its parts in one row, for a one-line composer.
- `Prompt.Attachments` — The attached files: images as thumbnails, anything else as a chip with its name and size, each with a button to remove it. It takes no room while there are none.
- `Prompt.Textarea` — Where the message is written. It grows from two lines to ten. Enter sends, Shift+Enter starts a new line, and a pasted image is attached.
- `Prompt.Recorder` — Takes the place of the text and the footer while voice is recorded: the `transcript` so far, the sound as a wave scrolling to the left, the time, and buttons to throw the recording away or keep it.
- `Prompt.Footer` — The row under the text, with the tools at its start and the submit button at its end.
- `Prompt.Tools` — A row of tools. It wraps onto a second line when the footer is narrow.
- `Prompt.Menu` — One round button with a plus that opens a [Menu](/docs/web/components/menu) of what can be added to the message: files, skills, connections, modes. Its children are `Menu` items, check items and submenus. The plus turns to a cross while it is open. `width="field"` opens it as wide as the field.
- `Prompt.AttachItem` — The menu item that opens the file picker, with `⌘U` at its end. ⌘U or Ctrl+U in the field opens the picker too.
- `Prompt.Tool` — A round button holding an icon. `label` is what a screen reader and the tooltip call it, and `showLabel` writes it beside the icon. With `pressed` and `onPressedChange` it switches on and off, and while on it is drawn in the info colour.
- `Prompt.Attach` — A tool that opens the file picker, for a prompt with no menu.
- `Prompt.Model` — Chooses the model. `items` are `{ value, label, icon, description }`, and the button shows the chosen one's icon and label. `variant="ghost"` has no edge.
- `Prompt.Submit` — Sends the message. While `status` is `submitted` or `streaming` it stops the answer instead, with a ring turning round it. With `onVoice`, it starts voice while the field is empty.
- `Prompt.Status` — A band under the field saying what the answer is doing. It opens while the prompt is busy, or with `mode`, while the prompt is in that mode, unless `open` says otherwise.
- `Prompt.Context` — A strip under the field, inset from its edges, for where the message goes: a machine, a branch, a ticket. It folds away when `open` is false, or with `mode`, while the prompt is in another mode.
- `Prompt.ContextItem` — One fact in the strip, with an icon before it. `onSelect` makes it a button.
- `Prompt.Hint` — A quiet line under the prompt. Without children it says that Shift+Enter starts a new line.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `PromptProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | What is written in the field, when the caller holds it. |
| `defaultValue` | `string` | `''` | What the field starts with, when the caller does not hold it. |
| `onValueChange` | `(value: string) => void` | — | Called with what is written, each time it changes, and with `''` when it is sent. |
| `onSubmit` | `(message: PromptMessage) => void` | — | Called with the text and the files when the message is sent. |
| `status` | `PromptState` | `'idle'` | Where the answer is. `submitted` and `streaming` stop the field being sent and turn the submit button into a stop button; `error` marks the field. Default `idle`. |
| `onStop` | `() => void` | — | Called when the stop button is pressed. Without it, the button cannot be pressed while busy. |
| `disabled` | `boolean` | `false` | Turns the whole prompt off. |
| `defaultFiles` | `File[]` | — | Files attached to begin with, such as those of a message being edited and sent again. |
| `accept` | `string` | — | Which files can be attached, as for `<input type="file">`: `image/*,.pdf`. Default any. |
| `maxFiles` | `number` | — | How many files can be attached at once. Default no limit. |
| `onReject` | `(files: File[], reason: PromptRejectReason) => void` | — | Called with the files that were not taken, and why. |
| `mode` | `string` | — | The state the prompt is in, named by you: `"connect"`, `"tasks"`, `"writing"`. Each band given a `mode` of its own opens while this matches it and folds away otherwise. |

#### `PromptBannerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether it is shown. It folds under the field when it is not. Default: shown, or with `mode`, while the prompt is in that mode. |
| `mode` | `PromptBandMode` | — | The prompt modes it is shown in. It folds away in any other. |

#### `PromptStatusProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether it is shown. Default: while `status` is `submitted` or `streaming`, or with `mode`, while the prompt is in that mode. |
| `mode` | `PromptBandMode` | — | The prompt modes it is shown in. It folds away in any other. |
| `icon` | `ReactNode` | — | Something before the words: the model's mark, a tool's icon. |
| `spinner` | `boolean` | — | Whether a spinner turns at its end. Default `true`. |

#### `PromptContextProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether it is shown. It folds under the field when it is not. Default: shown, or with `mode`, while the prompt is in that mode. |
| `mode` | `PromptBandMode` | — | The prompt modes it is shown in. It folds away in any other. |

#### `PromptContextItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onSelect` | `() => void` | — | Called when it is pressed. Passing this makes the item a button. |

#### `PromptHintProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |
| `className` | `promptVariants().hint({ className }),` | **required** | — |

#### `PromptFieldProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `layout` | `'stacked' \| 'inline'` | `'stacked'` | `stacked` puts the text above a footer. `inline` puts every part in one row, the text between them, for a one-line composer; the row wraps as the text grows. Default `stacked`. |

#### `PromptFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'prompt-footer', className: promptVariants().footer({ className }) }, props),` | **required** | — |

#### `PromptToolsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'prompt-tools', className: promptVariants().tools({ className }) }, props),` | **required** | — |

#### `PromptToolProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | **required** | What it does, for a screen reader and for the tooltip. Shown beside the icon with `showLabel`. |
| `pressed` | `boolean` | — | Whether it is switched on, for a tool that stays on. Leave it out for one that acts once. |
| `onPressedChange` | `(pressed: boolean) => void` | — | Called with the new state when a tool with `pressed` is pressed. |
| `showLabel` | `boolean` | `false` | Writes the label beside the icon. |

#### `PromptAttachProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | `'Model'` | Default `Attach files`. |

#### `PromptModelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `readonly PromptModelItem[]` | **required** | The models to choose from. |
| `value` | `string` | — | The chosen model, when the caller holds it. |
| `defaultValue` | `string` | — | The model chosen to begin with, when the caller does not hold it. |
| `onValueChange` | `(value: string) => void` | — | Called with the model's `value` when another is chosen. |
| `variant` | `'pill' \| 'ghost'` | `'pill'` | `pill` has an edge, like the tools beside it. `ghost` has none until hovered. Default `pill`. |
| `label` | `string` | `'Model'` | What a screen reader calls the button. Default `Model`. |
| `className` | `string` | — | — |

#### `PromptMenuProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | `'Add'` | What a screen reader and the tooltip call the button. Default `Add`. |
| `icon` | `ReactNode` | — | Replaces the plus on the button. |
| `width` | `'auto' \| 'field'` | `'auto'` | `field` opens the menu as wide as the field, lined up with it, for items with descriptions. Default `auto`. |

#### `PromptAttachItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `shortcut` | `ReactNode` | — | The keys shown at its end. Default `⌘U`; pass `null` for none. ⌘U and Ctrl+U in the field open the picker. |

#### `PromptSubmitProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onVoice` | `() => void` | — | Makes the button a voice button while the field is empty. Called when it is pressed. |
| `listening` | `boolean` | `false` | Whether voice is being heard. The bars move while it is. |
| `sendLabel` | `string` | `'Send'` | What a screen reader calls the button while it sends. Default `Send`. |
| `stopLabel` | `string` | `'Stop'` | While it stops the answer. Default `Stop`. |
| `voiceLabel` | `string` | `'Speak'` | While it starts voice. Default `Speak`. |

#### `PromptTasksProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether the band is shown. It folds under the field when it is not. Default: shown, or with `mode`, while the prompt is in that mode. |
| `mode` | `PromptBandMode` | — | The prompt modes it is shown in. It folds away in any other. |
| `title` | `ReactNode` | **required** | What the agent is doing, on the band's one line: "Preparing the release". |
| `expanded` | `boolean` | — | Whether the list is open under the title, when the caller holds it. |
| `defaultExpanded` | `boolean` | `false` | Whether the list starts open, when the caller does not hold it. Default `false`. |
| `onExpandedChange` | `(expanded: boolean) => void` | — | Called when the title is pressed to open or close the list. |
| `maxHeight` | `string` | `'10rem'` | How tall the list grows before it scrolls, as a CSS length. Default `10rem`. |

#### `PromptTaskProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `status` | `PromptTaskStatus` | `'idle'` | `pending`, `active` (its words are lit while it runs), `done` (a check) or `error`. Default `pending`. |

#### `PromptCommandsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `readonly PromptCommandItem[]` | **required** | The commands. |
| `trigger` | `string` | `'/'` | The character that opens the list when the field starts with it. Default `/`. |
| `onSelect` | `(item: PromptCommandItem) => void` | — | Called with the command chosen. With it, the field is cleared and the command is yours to show; without it, the command is written into the field. |
| `label` | `ReactNode` | `'Commands'` | The heading over the list. Default `Commands`. |
| `maxHeight` | `string` | `'12rem'` | How tall the list grows before it scrolls, as a CSS length. Default `12rem`. |

#### `PromptRecorderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `transcript` | `ReactNode` | — | What has been heard so far, written in as it arrives. |
| `placeholder` | `ReactNode` | `'Listening…'` | Shown, lit by a moving sweep, until there is a transcript. Default `Listening…`. |
| `onCancel` | `() => void` | — | Called when the cross is pressed, to throw the recording away. |
| `onDone` | `() => void` | — | Called when the check is pressed, to keep it. |
| `level` | `number` | — | How loud the input is now, from 0 to 1, to draw from a real microphone. Without it the wave moves on its own, as a sign that it is listening. |
| `cancelLabel` | `string` | `'Cancel recording'` | What a screen reader calls the cross. Default `Cancel recording`. |
| `doneLabel` | `string` | `'Finish recording'` | And the check. Default `Finish recording`. |

## In a Server Component

`Prompt` is a client component. A Server Component cannot read `Prompt.Banner` off the import, so import each part by name: `PromptBanner`, `PromptBannerAction`, `PromptField`, `PromptAttachments`, `PromptTextarea`, `PromptFooter`, `PromptTools`, `PromptTool`, `PromptAttach`, `PromptMenu`, `PromptAttachItem`, `PromptModel`, `PromptSubmit`, `PromptStatus`, `PromptTasks`, `PromptTask`, `PromptCommands`, `PromptRecorder`, `PromptContext`, `PromptContextItem`, `PromptHint`.

## Notes

#### Sending

Enter sends and Shift+Enter starts a new line. An Enter that ends a composition in an input method, as when typing Japanese or Chinese, is left to the input method. `onSubmit` is called with `{ text, files }`, the text trimmed, and the field and files are then cleared. Nothing is sent while there is no text and no file, or while `status` is `submitted` or `streaming`.

#### Controlled text

`value` and `onValueChange` hold the text from outside, to fill it from a suggestion or keep a draft. `onValueChange` is called with `''` when the message is sent.

#### The submit button

It has three jobs and changes between them in place, so it never moves under the pointer. It sends while the prompt is idle. It stops the answer while `status` is `submitted` or `streaming`, calling `onStop`, and it cannot be pressed then if `onStop` is not given. With `onVoice` it is a voice button while the field is empty, and its bars move while `listening` is true.

#### Files

Files arrive from `Prompt.AttachItem` or `Prompt.Attach`, from ⌘U or Ctrl+U in the field, from a paste and from a drop on the field. `accept` takes the same rules as a file input's, such as `image/*,.pdf`, and `maxFiles` caps how many are held at once. Files that are not taken are passed to `onReject` with the reason, `accept` or `max-files`, so you can say why. Images get a thumbnail from an object URL, which is released when the file is removed.

#### Bands

`Prompt.Banner` and `Prompt.Status` open and close by their `open` prop, folding under the card, and nothing inside a closed band can be focused. The status band opens by itself while the prompt is busy. Its words are lit by a sweep that stops when reduced motion is asked for.

#### Modes

A band is open by, in order: its own `open`, when given; its `mode`, when given, matched against the prompt's `mode` (a band can name several in an array); and otherwise what it does by default, which is open for the banner, the tasks and the context strip and while busy for the status band. Bands that change together fold and open in the same 300ms, so the card moves once, by the difference in their heights.

#### Screen readers

The text field is called "Message" unless you give it an `aria-label`. Each tool's `label` is its name, a pressed tool is announced as pressed, and the submit button's name follows its job: Send, Stop or Speak. The status band is a live region, so what it says is read as it changes.

#### The menu and what it switches on

`Prompt.Menu` keeps the footer to one button however many tools there are. A mode switched on in it, such as web search, is best shown beside it as a pressed `Prompt.Tool` with `showLabel`, which switches it off again when pressed. The first example does this for a chosen skill, and keeps web search as a tool that stays in the footer and turns blue while it is on.

#### Commands and the keyboard

While the command list is open, the arrow keys, Enter, Tab and Escape go to it rather than to the field, and the field points a screen reader at the highlighted command. Escape puts the list away until the text changes. Without `onSelect`, a chosen command is written into the field followed by a space.

#### Tasks

The count and the ring are worked out from the `status` of the `Prompt.Task` children, so keep the tasks as its direct children. The task in progress is scrolled to the middle of the list as it changes; the page itself does not scroll.

## Example

```tsx
'use client';

import {
  BookTextIcon,
  BrainIcon,
  CalendarIcon,
  FolderIcon,
  GlobeIcon,
  PlusIcon,
  PlugIcon,
  ScrollTextIcon,
  SparklesIcon,
  TicketIcon,
  TriangleAlertIcon,
  ZapIcon,
} from 'lucide-react';
import { Menu } from '@/components/panelui/menu';
import { Prompt, type PromptMessage, type PromptModelItem, type PromptState } from '@/components/panelui/prompt';
import { useEffect, useRef, useState } from 'react';

const MODELS: PromptModelItem[] = [
  { value: 'lumen', label: 'Lumen 4', icon: <SparklesIcon />, description: 'Balanced, for most questions' },
  { value: 'lumen-mini', label: 'Lumen 4 Mini', icon: <ZapIcon />, description: 'Quick answers to small asks' },
  { value: 'lumen-deep', label: 'Lumen 4 Deep', icon: <BrainIcon />, description: 'Slower, for hard problems' },
];

const SKILLS = ['Weekly report', 'Release notes', 'Meeting brief', 'Code review'];

export default function PromptAsk() {
  const [status, setStatus] = useState<PromptState>('idle');
  const [search, setSearch] = useState(true);
  const [calendar, setCalendar] = useState(true);
  const [drive, setDrive] = useState(false);
  const [skill, setSkill] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  // Stands in for a model: a moment to read the question, then a few seconds writing.
  const send = ({ text, files }: PromptMessage) => {
    clear();
    setListening(false);
    setSent(text || `${files.length} file${files.length === 1 ? '' : 's'}`);
    setStatus('submitted');
    timers.current.push(window.setTimeout(() => setStatus('streaming'), 1200));
    timers.current.push(window.setTimeout(() => setStatus('idle'), 4200));
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <Prompt
        onSubmit={send}
        status={status}
        onStop={() => {
          clear();
          setStatus('idle');
        }}
      >
        <Prompt.Field>
          <Prompt.Attachments />
          <Prompt.Textarea placeholder="Ask about your notes, or attach a file" />
          <Prompt.Footer>
            <Prompt.Tools>
              <Prompt.Menu>
                <Prompt.AttachItem />
                <Menu.Separator />
                <Menu.Sub>
                  <Menu.SubTrigger>
                    <BookTextIcon />
                    Skills
                  </Menu.SubTrigger>
                  <Menu.SubContent>
                    {SKILLS.map((name) => (
                      <Menu.Item key={name} onClick={() => setSkill(name)}>
                        <ScrollTextIcon />
                        {name}
                      </Menu.Item>
                    ))}
                    <Menu.Separator />
                    <Menu.Item>
                      <PlusIcon />
                      Browse skills
                    </Menu.Item>
                  </Menu.SubContent>
                </Menu.Sub>
                <Menu.Sub>
                  <Menu.SubTrigger
                    end={
                      drive ? null : (
                        <Menu.Badge>
                          <TriangleAlertIcon />1
                        </Menu.Badge>
                      )
                    }
                  >
                    <PlugIcon />
                    Connections
                  </Menu.SubTrigger>
                  <Menu.SubContent>
                    <Menu.CheckboxItem checked={calendar} onCheckedChange={setCalendar}>
                      <CalendarIcon />
                      Calendar
                    </Menu.CheckboxItem>
                    <Menu.CheckboxItem checked={drive} onCheckedChange={setDrive}>
                      <FolderIcon />
                      Shared drive
                    </Menu.CheckboxItem>
                    <Menu.Item disabled>
                      <TicketIcon />
                      Issue tracker
                    </Menu.Item>
                  </Menu.SubContent>
                </Menu.Sub>
              </Prompt.Menu>
              {/* A mode that stays in the footer and turns blue while it is on. */}
              <Prompt.Tool label="Search" showLabel pressed={search} onPressedChange={setSearch}>
                <GlobeIcon />
              </Prompt.Tool>
              {/* A skill chosen in the menu, pressed again to put it away. */}
              {skill ? (
                <Prompt.Tool label={skill} showLabel pressed onPressedChange={() => setSkill(null)} title={`Remove ${skill}`}>
                  <ScrollTextIcon />
                </Prompt.Tool>
              ) : null}
              <Prompt.Model items={MODELS} variant="ghost" />
            </Prompt.Tools>
            <Prompt.Submit onVoice={() => setListening((on) => !on)} listening={listening} />
          </Prompt.Footer>
        </Prompt.Field>
        <Prompt.Status icon={<SparklesIcon />}>
          {status === 'submitted' ? 'Reading your question' : 'Writing the answer'}
        </Prompt.Status>
      </Prompt>
      <p className="px-4 text-xs text-muted-foreground" aria-live="polite">
        {listening ? 'Listening…' : sent ? `Sent: ${sent}` : 'Nothing sent yet.'}
      </p>
    </div>
  );
}
```
