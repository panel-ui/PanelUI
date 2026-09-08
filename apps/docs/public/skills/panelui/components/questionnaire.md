# Questionnaire

One question at a time, with progress, validation and a way back.

```tsx
import { Questionnaire } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Questionnaire } from '@/components/ui/questionnaire';
```

### Anatomy

```tsx
<Questionnaire items={questions}>
  <Questionnaire.Title>…</Questionnaire.Title>
  <Questionnaire.Progress />
  <Questionnaire.Item name="…">
    <Questionnaire.Question>…</Questionnaire.Question>
    <Questionnaire.Description>…</Questionnaire.Description>
    <Questionnaire.Choices>
      <Questionnaire.Choice value="…" label="…" />
      <Questionnaire.Input placeholder="…" />
    </Questionnaire.Choices>
    <Questionnaire.Error />
  </Questionnaire.Item>
  <Questionnaire.Footer>
    <Questionnaire.Back />
    <Questionnaire.Spacer />
    <Questionnaire.Next />
    <Questionnaire.Submit />
  </Questionnaire.Footer>
</Questionnaire>
```

### Variants

- **framed** — `true` *(default)*, `false`

### Parts

- `Questionnaire.Title` — Names the questionnaire as a whole, in the frame’s header strip. Leave it out and the progress centres on the strip instead of sitting at its trailing edge.
- `Questionnaire.Progress` — Where the reader is in the set — an arc that sweeps round as they advance, by default. `pips` draws a bar per question, `numbers` counts them out, `count` is plain text. Give it a function for anything else.
- `Questionnaire.Item` — One question. Only the active one is mounted.
- `Questionnaire.Question` — The question being asked.
- `Questionnaire.Description` — A line under it — what to consider, or that it can be skipped.
- `Questionnaire.Choices` — The answers to a question. Hands each one its shortcut badge.
- `Questionnaire.Choice` — One fixed answer. The whole row is the target.
- `Questionnaire.Input` — An answer that is not on the list.
- `Questionnaire.Error` — Why the way forward is closed. Nothing until the question fails to pass.
- `Questionnaire.Footer` — The action row, in its own section at the foot of the panel.
- `Questionnaire.Spacer` — A flexible gap, so the trailing buttons stay against the trailing edge.
- `Questionnaire.Back` — To the previous question. Absent on the first.
- `Questionnaire.Skip` — Records that the active question was deliberately left out and moves on. Pair it with the primary action rather than adding it to a Back/Next row — three actions in the band is a row nobody reads.
- `Questionnaire.Next` — On to the next question. Dims while a required question is unanswered, and is absent on the last.
- `Questionnaire.Submit` — Hands over every answer. Only on the last question, and dims the same way.

### Props

#### `QuestionnaireProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `items` | `readonly QuestionnaireItemDefinition[]` | — | The full set of questions, in order. Optional: without it the order and the totals come from the `Questionnaire.Item` children instead. Pass it when a question is conditional, since a question the user has not reached still has to be counted — or not counted, if it no longer applies. |
| `item` | `string` | — | Controlled active question, by name. |
| `defaultItem` | `string` | — | Which question to open on. Defaults to the first enabled one. |
| `onItemChange` | `(name: string) => void` | — | Called with the name of the question being moved to. |
| `answers` | `QuestionnaireAnswers` | — | Controlled answers. |
| `defaultAnswers` | `QuestionnaireAnswers` | — | Answers to start with — for resuming a part-finished questionnaire. |
| `onAnswersChange` | `(answers: QuestionnaireAnswers) => void` | — | Called with the whole set every time any answer changes. |
| `onSubmit` | `(answers: QuestionnaireAnswers) => void` | — | Called with every answer once the last question validates. |
| `shortcuts` | `QuestionnaireShortcutMode` | — | Badge every answer with a letter (`A`, `B`, `C`) or a number (`1`, `2`, `3`). Disabled answers are skipped rather than taking a badge with them. The badge is an affordance, not a binding: React Native surfaces hardware key events only to a focused text field, so nothing here can listen for the key itself. |
| `swipeable` | `boolean` | `true` | Let a horizontal drag move between questions. Going forward is gated on the same answer the button is, so a swipe off an unanswered required question springs back and shows its error. |
| `frame` | `boolean` | `true` | Draw the surrounding `Frame`. Turn it off to place the questionnaire in a sheet, a dialog or a card that already draws its own boundary. |
| `children` | `ReactNode` | — | — |

#### `QuestionnaireTitleProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QuestionnaireProgressProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `variant` | `QuestionnaireProgressVariant` | `ring` | `ring` is an arc that sweeps round as the reader advances — how far through the set they are, without saying how many questions there are. It is the only one that holds its size and its meaning at any length, which is why it is the default. `pips` is a bar per question, filled up to the one being asked and widened on it. `numbers` counts them out instead, which is what you want when the reader will be sent back to a particular question. `count` is the plain `Question 2 of 5`. `pips` and `numbers` fall back to `count` past eight questions, where neither is countable at a glance any more. `ring` never does. |
| `children` | `ReactNode \| ((state: QuestionnaireProgressState) => ReactNode)` | — | Replace the indicator entirely. Given a function, it is called with the position — for a bar, a row of dots, or a percentage. |

#### `QuestionnaireItemProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `name` | `string` | **required** | Unique name — the key this question's answer is stored under. |
| `required` | `boolean` | — | Blocks the way forward until it has an answer. |
| `multiple` | `boolean` | — | Accepts more than one answer, so its answer is an array. |
| `disabled` | `boolean` | — | Left out of the count and never navigated to. |
| `invalid` | `boolean` | — | Mark the question at fault from a validator of your own. |
| `onStatusChange` | `(status: QuestionnaireItemStatus) => void` | — | Called whenever this question moves between unanswered, answered and skipped. |
| `children` | `ReactNode` | — | — |

#### `QuestionnaireQuestionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QuestionnaireDescriptionProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QuestionnaireChoicesProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QuestionnaireChoiceProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | **required** | The value recorded when this answer is picked. |
| `label` | `string` | — | The answer itself. |
| `description` | `string` | — | A line under the label, for an answer that needs explaining. |
| `disabled` | `boolean` | — | — |
| `children` | `ReactNode` | — | — |

#### `QuestionnaireInputProps`

Extends `Omit<InputProps, 'value' \| 'onChangeText' \| 'errorMessage'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `QuestionnaireErrorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Replace the default message. |

#### `QuestionnaireFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `QuestionnaireActionProps`

Extends `Omit<ButtonProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode \| ((state: QuestionnaireActionState) => ReactNode)` | — | Replace the label. Given a function, it is called with the question's state. |

### Example — One answer at a time

The default shape: a required question, an optional one, and a footer that shows only the actions that apply to the question on screen.

```tsx
const questions = [
  { name: 'direction', required: true },
  { name: 'detail' },
] as const;

function Prototype() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  return (
    <Questionnaire items={questions} onAnswersChange={setAnswers} onSubmit={save}>
      <Questionnaire.Title>Prototype</Questionnaire.Title>
      <Questionnaire.Progress />

      <Questionnaire.Item name="direction" required>
        <Questionnaire.Question>What should we build next?</Questionnaire.Question>
        <Questionnaire.Description>Choose the direction you want to see first.</Questionnaire.Description>
        <Questionnaire.Choices>
          <Questionnaire.Choice
            value="delegation"
            label="Delegation"
            description="Show how work moves to a specialist."
          />
          <Questionnaire.Choice value="prompts" label="Question prompts" />
          <Questionnaire.Choice value="both" label="Both together" />
        </Questionnaire.Choices>
        <Questionnaire.Error />
      </Questionnaire.Item>

      <Questionnaire.Item name="detail">
        <Questionnaire.Question>How much detail?</Questionnaire.Question>
        <Questionnaire.Description>Skip this one if you have not decided.</Questionnaire.Description>
        <Questionnaire.Choices>
          <Questionnaire.Choice value="focused" label="Focused" />
          <Questionnaire.Choice value="complete" label="The complete flow" />
        </Questionnaire.Choices>
      </Questionnaire.Item>

      <Questionnaire.Footer>
        <Questionnaire.Back />
        <Questionnaire.Spacer />
            <Questionnaire.Next />
        <Questionnaire.Submit />
      </Questionnaire.Footer>
    </Questionnaire>
  );
}
```

### Notes

Answers come back as a record keyed by question name: a string for a single-answer question, an array of strings for a `multiple` one. That is the whole contract — `onAnswersChange` fires on every change and `onSubmit` fires once, with the same shape.

A **required** question is the only thing that blocks the way forward. An optional one never does, so `Questionnaire.Skip` does not unblock anything: it *records* that the question was deliberately left out, moving its status from `unanswered` to `skipped` so your app can tell the two apart through `onStatusChange`. Making an optional question demand an explicit skip would trap anyone who did not render the button, and a question that cannot be ignored is not optional.

`Questionnaire.Next` and `Questionnaire.Submit` **dim while a required question is unanswered, but stay pressable**. A disabled button says no without saying why, and on a question whose answers have scrolled out of view that is the whole of the feedback; pressing this one puts the reason under the question instead. The dimming is what stops it promising something it will not do — the look says not yet, the press says why not. Pass `disabled` if you would rather it were inert.

Pass `items` whenever a question is conditional. Only the active question is mounted, so a question that has not been reached cannot report that it exists — and without the full set there is no total to count against and no way to leave a question out. `items` also decides the order; without it, the order of the `Questionnaire.Item` children does.

A **freeform answer lands under the same name** as the fixed ones, because it is another answer to the same question rather than a separate field. `Questionnaire.Input` shows whatever the question is answered with that none of its own choices offers, which is what makes picking a choice empty the field and typing clear the choice.

`shortcuts` badges each answer with a letter or a number, skipping disabled ones so they do not take a letter out of the sequence. The badge is an affordance, not a binding: React Native surfaces hardware key events only to a focused text field, so nothing here can listen for the key itself.

Placing an unframed questionnaire in a container with chrome of its own means checking the corners: `BottomSheet` puts its close button in the top-right, which is where `Questionnaire.Progress` sits, so pass `showClose={false}` there. A sheet is also short, and `variant="pips"` lies flat along the strip where the ring stands up off it.

The surrounding `Frame` is drawn by the component: the panel the question is written on floats in a recessed band, with the title and the progress on the strip above it and the footer's actions as equal pills in the band below. Pass `frame={false}` to drop it — for a questionnaire in a `BottomSheet`, a `Dialog`, or a card that already draws its own boundary. With the frame off the questionnaire keeps only its vertical rhythm, because the container it was placed in is already holding it off the edges.

---

Full page, with every example: https://panelui.dev/docs/components/questionnaire
