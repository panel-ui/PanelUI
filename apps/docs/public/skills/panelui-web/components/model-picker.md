# Model Picker

A select for the model a message goes to, searched by name, filtered by provider and starred.

```tsx
import { ModelPicker } from "@/components/panelui/model-picker"
```

From npm the path is `panelui-web/model-picker`. Install with `npx shadcn@latest add @panelui/model-picker`.

## When to use it

Use it to choose the model a message goes to, in a composer's footer or a chat's header, when there are more models than a plain select can show well. For three or four models with no need to search, [Prompt](/docs/web/components/prompt)'s own `Prompt.Model` is enough.

It opens with the search field focused. Typing searches every model by its name, its provider, its description and its tags, whatever filter is on. The arrow keys move through the list, Enter chooses, and ⌥1 to ⌥9 choose the numbered rows. `hotkey` opens it from anywhere on the page; opened that way it appears at once instead of growing.

Starred models come first: they are the rail's first filter, and the first group of the `list` layout. Star a model with the star on its row, or with ⌥S on the highlighted one.

The component draws no logos. Give each provider an `icon`, and each model shows its provider's unless it has its own. The marks on this page are the providers' own, and an app needs the right to show them.

## Usage

```tsx
const providers = [
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
]

const models = [
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai' },
]

<ModelPicker items={models} providers={providers} defaultValue="claude-sonnet-5.5" hotkey="alt+m">
  <ModelPicker.Trigger />
  <ModelPicker.Content />
</ModelPicker>
```

## Parts

```tsx
<ModelPicker>
  <ModelPicker.Trigger />
  <ModelPicker.Content />
</ModelPicker>
```

- `ModelPicker.Trigger` — The button that opens the list, showing the chosen model's icon and name. `appearance` is `ghost`, with no box until hovered, for a composer, or `outline`, for a toolbar. With a `hotkey` on the root, its tooltip shows the keys.
- `ModelPicker.Content` — The list, laid out as the root's `variant` says. `side` and `align` place it against the trigger, and `placeholder` and `emptyText` change what the search field and an empty list say.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ModelPickerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `readonly ModelPickerItem[]` | **required** | The models to choose from, in the order they are listed. |
| `providers` | `readonly ModelPickerProvider[]` | **required** | The providers the models come from, in the order the rail and the headings show them. |
| `value` | `string \| null` | — | The chosen model, when the caller holds it. |
| `defaultValue` | `string \| null` | `null` | The model chosen to begin with, when the caller does not hold it. |
| `onValueChange` | `(value: string) => void` | — | Called with the model's `value` when another is chosen. |
| `favorites` | `readonly string[]` | — | The starred models, when the caller holds them. |
| `defaultFavorites` | `readonly string[]` | `[]` | The models starred to begin with. |
| `onFavoritesChange` | `(favorites: string[]) => void` | — | Called with every starred model when one is starred or unstarred. |
| `variant` | `ModelPickerVariant` | `'rail'` | The layout of the list: `rail`, `list`, `cards`, `compare` or `detail`. Default `rail`. |
| `hotkey` | `string` | — | Keys that open it from anywhere on the page, such as `alt+m`. `mod` is ⌘ on a Mac and Ctrl elsewhere. Avoid keys the browser keeps for itself, such as ⌘1 to ⌘9, ⌘T and ⌘⇧M, which a page never receives. |
| `open` | `boolean` | — | Whether the list is open, when the caller holds it. |
| `defaultOpen` | `boolean` | `false` | Whether the list is open to begin with. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the list opens or closes. |
| `label` | `string` | `'Model'` | What a screen reader calls the trigger and the list. Default `Model`. |

#### `ModelPickerTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `appearance` | `'ghost' \| 'outline'` | `ghost` | `ghost` has no box until hovered, for a composer's footer. `outline` has an edge, for a toolbar. Default `ghost`. |
| `placeholder` | `ReactNode` | `'Search models…'` | What it says before a model is chosen. Default `Choose a model`. |
| `className` | `string` | — | — |

#### `ModelPickerContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `side` | `Popover.Positioner.Props['side']` | `'bottom'` | Which side of the trigger it opens on. Default `bottom`. |
| `align` | `Popover.Positioner.Props['align']` | `'start'` | How it lines up with the trigger along that side. Default `start`. |
| `sideOffset` | `number` | `8` | The gap between the trigger and the list, in pixels. Default `8`. |
| `placeholder` | `string` | `'Search models…'` | What the search field says while empty. Default `Search models…`. |
| `emptyText` | `ReactNode` | `'No models match'` | What the list says when nothing matches. Default `No models match`. |
| `container` | `Popover.Portal.Props['container']` | — | Where in the document it is put. Default `document.body`. |
| `className` | `string` | — | — |

## In a Server Component

`ModelPicker` is a client component. A Server Component cannot read `ModelPicker.Trigger` off the import, so import each part by name: `ModelPickerTrigger`, `ModelPickerContent`.

## Notes

#### Keyboard

With the list open, the search field has focus. The arrow keys move the highlight, Enter chooses the highlighted model, and Escape closes the list. ⌥1 to ⌥9, or Alt+1 to Alt+9 on Windows and Linux, choose the row with that number, and ⌥S, or Alt+S, stars or unstars the highlighted model. Tab and Shift+Tab move between the search field and the provider filters.

#### Accessibility

The trigger's accessible name is the root's `label` and the chosen model, such as "Model: Claude Sonnet 5.5". The list is a listbox named by the search field. The meters in `compare` and `detail` are read as "Speed 4 of 5".

#### Searching

The search matches every word typed against a model's name, its provider's name, its description and its tags, in any order, so "fast google" finds a Gemini model tagged `Fast`.

#### Choosing a hotkey

A page never receives the keys a browser keeps for itself: ⌘1 to ⌘9 and Ctrl+1 to Ctrl+9 switch tabs, and in Chrome on a Mac ⌘⇧M opens the profile menu. That is why the row numbers are on ⌥. Pick a `hotkey` the browser leaves alone, such as `alt+m`.

## Example

```tsx
'use client';

import { ClaudeMark, DeepSeekMark, GeminiMark, MetaMark, MistralMark, OpenAIMark, XAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from '@/components/panelui/model-picker';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark />, status: 'new' },
  { value: 'xai', label: 'xAI', icon: <XAIMark /> },
  { value: 'mistral', label: 'Mistral', icon: <MistralMark /> },
  { value: 'deepseek', label: 'DeepSeek', icon: <DeepSeekMark />, status: 'limited' },
  { value: 'meta', label: 'Meta', icon: <MetaMark /> },
];

const MODELS: ModelPickerItem[] = [
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai', badge: 'New' },
  { value: 'gpt-5.4-thinking', label: 'GPT-5.4 Thinking', provider: 'openai' },
  { value: 'claude-opus-5.5', label: 'Claude Opus 5.5', provider: 'anthropic' },
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
  { value: 'claude-haiku-5.5', label: 'Claude Haiku 5.5', provider: 'anthropic' },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'google' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'google' },
  { value: 'grok-4', label: 'Grok 4', provider: 'xai' },
  { value: 'mistral-large-3', label: 'Mistral Large 3', provider: 'mistral' },
  { value: 'deepseek-v4', label: 'DeepSeek V4', provider: 'deepseek', disabled: true, note: 'Rate-limited until 14:00' },
  { value: 'llama-4-maverick', label: 'Llama 4 Maverick', provider: 'meta' },
];

export default function ModelPickerOverview() {
  return (
    <ModelPicker
      items={MODELS}
      providers={PROVIDERS}
      defaultValue="claude-sonnet-5.5"
      defaultFavorites={['gpt-5.5', 'claude-opus-5.5', 'claude-sonnet-5.5', 'gemini-3.1-pro']}
      hotkey="alt+m"
    >
      <ModelPicker.Trigger appearance="outline" />
      <ModelPicker.Content />
    </ModelPicker>
  );
}
```
