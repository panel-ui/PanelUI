/**
 * Questionnaire — one question at a time, with progress, validation and a way
 * back.
 *
 * Unlike `Steps`, which reflects a flow the app owns, Questionnaire *owns* the
 * flow: it holds the answers, decides which question is current, gates the way
 * forward on the current one being answered, and reports the whole set back
 * when it is done. The caller supplies the questions and does something with
 * the answers; everything between those two points belongs here.
 *
 * ```tsx
 * <Questionnaire items={items} onSubmit={(answers) => save(answers)}>
 *   <Questionnaire.Title>Project setup</Questionnaire.Title>
 *   <Questionnaire.Progress />
 *   <Questionnaire.Item name="direction" required>
 *     <Questionnaire.Question>What should we build next?</Questionnaire.Question>
 *     <Questionnaire.Description>Choose one, or write your own.</Questionnaire.Description>
 *     <Questionnaire.Choices>
 *       <Questionnaire.Choice value="delegation" label="Delegation" />
 *       <Questionnaire.Choice value="prompts" label="Question prompts" />
 *       <Questionnaire.Input placeholder="Type another answer…" />
 *     </Questionnaire.Choices>
 *     <Questionnaire.Error />
 *   </Questionnaire.Item>
 *   <Questionnaire.Footer>
 *     <Questionnaire.Back />
 *     <Questionnaire.Next />
 *     <Questionnaire.Submit />
 *   </Questionnaire.Footer>
 * </Questionnaire>
 * ```
 *
 * ## Why it draws its own Frame
 *
 * A survey is a widget, not a paragraph: it wants a boundary, a title strip and
 * a footer that stays put while the middle changes. That is exactly `Frame`, so
 * the root renders one rather than leaving every caller to assemble the same
 * shell. `Frame.Panel`'s `overflow-hidden` also does the clipping the sliding
 * question needs, for free. Pass `frame={false}` to drop it — for a
 * questionnaire inside a `BottomSheet` or a card that already draws a border.
 *
 * It is the `inset` variant, so the panel the question is written on floats in
 * a recessed band rather than sitting flush in a tray, and the actions go in
 * the band rather than in a section under the question. That separation is the
 * point: the question changes and the row under it does not, and a row drawn
 * on the band is visibly not part of the card that keeps being replaced.
 *
 * The band shapes its actions into equal pills, which is why
 * `Questionnaire.Spacer` is dropped on the way in — see `bandActions`.
 *
 * ## Why the root reads its children instead of collecting registrations
 *
 * Only the active question is mounted, so an unmounted one cannot report that
 * it exists — and without knowing the full set there is no total to count
 * against, no "is this the last one", and no way to disable a question the
 * user has not reached. So the root inspects its children once per render and
 * reads `name`, `required`, `multiple` and `disabled` straight off the
 * elements. React elements carry their props before anything renders them,
 * which makes the whole set knowable without mounting any of it.
 *
 * That same pass sorts the parts into the shell: the title and progress go to
 * the header strip above the panel, the footer's actions to the band around
 * it, and everything else is a question.
 *
 * ## Answers are one record, the way a form would submit them
 *
 * `answers[name]` is a string for a single-answer question and an array for a
 * `multiple` one. A freeform answer lands under the same name — it is another
 * answer to the same question, not a separate field — which is why the text
 * input shows whatever value does not match one of the question's own choices.
 * Picking a choice and typing therefore replace each other, without either one
 * having to know the other exists.
 *
 * ## What blocks the way forward
 *
 * A required question blocks until it has an answer. An optional one never
 * blocks. `Questionnaire.Skip` does not unblock anything, then — it *records*
 * that the question was deliberately left out, moving its status from
 * `unanswered` to `skipped` so the app can tell the two apart. Making an
 * optional question demand an explicit skip would trap anyone who did not
 * render the Skip button, and a question that cannot be ignored is not
 * optional.
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  View,
  type LayoutChangeEvent,
  type TextInput,
  type ViewProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeOut,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '../../icons';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Button, type ButtonProps } from '../button';
import { Frame } from '../frame';
import { Input, type InputProps } from '../input';

/** How long the body takes to settle into the next question's height. */
const HEIGHT_DURATION = 240;

/** How long the arriving question takes to slide and fade in. */
const ENTER_DURATION = 220;

/**
 * How long the leaving one takes to fade out — shorter, so it is gone before
 * the arriving one is fully in and the two are never both legible.
 */
const EXIT_DURATION = 140;

/** How long a progress pip takes to fill once its question has been reached. */
const PIP_DURATION = 260;

/**
 * The progress ring: its diameter, and the weight of the arc drawn round it.
 *
 * Sized against the title beside it rather than against the strip it sits on.
 * A ring the height of a line of text reads as the trailing half of a pair;
 * one much larger reads as the header's subject, which it is not.
 */
const RING_SIZE = 22;
const RING_STROKE = 2.5;

/** How far across the body a swipe has to travel before it commits. */
const SWIPE_FRACTION = 0.25;

/** Where the sliding question starts from and exits to, as a fraction of width. */
const SLIDE_FRACTION = 0.35;

const EASE = Easing.out(Easing.cubic);

/** What `Questionnaire.Error` says when the caller gives it no message. */
const DEFAULT_ERROR = 'Choose an answer to continue.';

const questionnaireVariants = tv({
  slots: {
    body: 'overflow-hidden',
    // Absolute, so the question measures its own height rather than being
    // clamped by the animated box above it — and so the question leaving and
    // the one arriving overlap instead of stacking during the transition.
    slide: 'absolute inset-x-0 top-0',
    pane: 'gap-4',
    choices: 'gap-2.5',
    footer: 'flex-row items-center gap-2',
    error: 'text-sm text-destructive',
  },
  variants: {
    /**
     * With the frame off, only the vertical rhythm is the questionnaire's —
     * the container it was placed in is already holding it off the edges, and
     * insetting it again would inset it twice.
     */
    framed: {
      true: { pane: 'p-4', footer: 'p-3' },
      false: { pane: 'py-4', footer: 'pt-3' },
    },
  },
  defaultVariants: {
    framed: true,
  },
});

const choiceVariants = tv({
  slots: {
    row: 'w-full flex-row items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3',
    /*
     * `mt-px` against a `leading-snug` first line: the indicator is centred on
     * the label's cap height rather than on its line box, which is where the
     * eye reads the two as being on the same line.
     */
    indicator:
      'mt-px h-5 w-5 shrink-0 items-center justify-center border border-input bg-background',
    label: 'text-base font-medium leading-snug text-foreground',
    description: 'text-sm leading-snug text-muted-foreground',
    shortcut:
      'mt-px h-5 min-w-[22px] shrink-0 items-center justify-center rounded-md border border-border bg-muted px-1',
    shortcutLabel: 'text-[11px] font-medium tabular-nums text-muted-foreground',
  },
  variants: {
    /** A disc for one-of, a rounded square for many-of — the usual grammar. */
    multiple: {
      true: { indicator: 'rounded-md' },
      false: { indicator: 'rounded-full' },
    },
    selected: {
      true: {
        row: 'border-primary bg-accent',
        // The badge follows the row rather than staying grey against a filled
        // surface, where it would read as the one part that did not respond.
        shortcut: 'border-primary/40 bg-primary/10',
        shortcutLabel: 'text-primary',
      },
    },
    disabled: {
      true: { row: 'opacity-50' },
    },
    /** The question failed validation, so every answer in it reads as at fault. */
    invalid: {
      true: { row: 'border-destructive' },
    },
  },
  defaultVariants: {
    multiple: false,
  },
});

/**
 * How many questions can be drawn as pips before the count is the clearer
 * thing. Past this they stop being countable at a glance and become a texture.
 */
const MAX_PIPS = 8;

/** Where a question stands: never touched, answered, or deliberately left out. */
export type QuestionnaireItemStatus = 'unanswered' | 'answered' | 'skipped';

/** Which key each answer is badged with. */
export type QuestionnaireShortcutMode = 'letters' | 'numbers';

/** Every answer given so far, keyed by question name. */
export type QuestionnaireAnswers = Record<string, string | string[]>;

/**
 * A question, described rather than rendered. Pass these as `items` so the
 * questionnaire knows its full set before any of it mounts — which is what
 * makes a conditional question countable and a total meaningful.
 */
export interface QuestionnaireItemDefinition {
  /** Unique name — the key this question's answer is stored under. */
  name: string;
  /** Blocks the way forward until it has an answer. */
  required?: boolean;
  /** Accepts more than one answer, so its answer is an array. */
  multiple?: boolean;
  /** Left out of the count and never navigated to. */
  disabled?: boolean;
}

/** The whole set, as everything downstream sees it. */
interface ResolvedItem extends QuestionnaireItemDefinition {
  element: ReactElement<QuestionnaireItemProps>;
  onStatusChange?: (status: QuestionnaireItemStatus) => void;
}

interface QuestionnaireContextValue {
  /** One-based position of the active question among the enabled ones. */
  current: number;
  /** How many questions are enabled. */
  total: number;
  first: boolean;
  last: boolean;
  activeName: string | null;
  activeItem: ResolvedItem | null;
  answers: QuestionnaireAnswers;
  statusOf: (name: string) => QuestionnaireItemStatus;
  invalid: ReadonlySet<string>;
  setAnswer: (name: string, value: string | string[] | undefined) => void;
  toggleAnswer: (name: string, value: string, multiple: boolean) => void;
  goNext: () => void;
  goBack: () => void;
  skip: () => void;
  submit: () => void;
  shortcuts: QuestionnaireShortcutMode | null;
  /** Whether the root drew the frame, which decides who owns the insets. */
  framed: boolean;
  /** The active question is required and has no answer, so the way on is shut. */
  blocked: boolean;
}

const QuestionnaireContext = createContext<QuestionnaireContextValue | null>(null);

function useQuestionnaire(component: string): QuestionnaireContextValue {
  const context = useContext(QuestionnaireContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Questionnaire>`);
  }
  return context;
}

interface QuestionnaireItemContextValue {
  name: string;
  required: boolean;
  multiple: boolean;
  invalid: boolean;
  /** Every fixed value this question offers — what tells a typed answer apart. */
  choiceValues: ReadonlySet<string>;
}

const QuestionnaireItemContext = createContext<QuestionnaireItemContextValue | null>(null);

function useQuestionnaireItem(component: string): QuestionnaireItemContextValue {
  const context = useContext(QuestionnaireItemContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Questionnaire.Item>`);
  }
  return context;
}

/** The shortcut `Questionnaire.Choices` hands the choice it wraps. */
const ShortcutContext = createContext<string | null>(null);

/** True when the question has an answer of some kind. */
function isAnswered(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * The footer's actions, on their way into the band.
 *
 * `Frame.Footer` shapes its *direct* children into the band's pills, so the
 * row itself has to be unwrapped — handed the `Questionnaire.Footer` element
 * whole it would be the wrapper that came out a pill, with the buttons
 * untouched inside it.
 *
 * The spacer goes at the same time. It exists to push the actions apart in a
 * row that lays them out at their own widths; in a band where every action is
 * already a share of the row it would take a share of its own, and the buttons
 * would come out narrower the more carefully the caller had spaced them.
 *
 * The band's own rule is equal widths, and it is the wrong one here. A row of
 * equal pills says these are equal decisions; Back and Skip are ways off the
 * path and Next is the path, so they are sized to their labels and the primary
 * action takes what is left. Equal thirds also truncate it — "Continue" does
 * not fit in a third of the band, and the button that carries the flow is the
 * worst one to lose the end of.
 *
 * `flex-none` and nothing else on those two: the button's own padding is what
 * a label needs either side of it, and anything added here comes off the
 * primary action, which has the longest label and the least room to lose.
 *
 * The primary action goes up one size instead — `lg`, not the default. It is
 * the only thing on the band anybody is aiming for: the whole widget is one
 * decision repeated, and this is the button that takes the reader to the next
 * one, so it carries a larger label and a taller box than the way back beside
 * it. One size and no more; `xl` is for a button that is the whole of a
 * screen, and this one shares its row. The band's fixed height comes off with
 * it, or the taller box would be clamped back to the row's.
 */
function bandActions(footer: ReactNode): ReactNode {
  if (!isValidElement<QuestionnaireFooterProps>(footer)) return footer;
  return Children.toArray(footer.props.children).flatMap((child) => {
    if (!isValidElement<QuestionnaireActionProps>(child)) return [child];
    if (child.type === QuestionnaireSpacer) return [];

    // Merged after the band's own classes rather than before, so what is set
    // here is what survives.
    if (child.type === QuestionnaireBack || child.type === QuestionnaireSkip) {
      return [cloneElement(child, { className: cn('flex-none', child.props.className) })];
    }

    return [
      cloneElement(child, {
        // A caller who asked for a size meant it.
        size: child.props.size ?? 'lg',
        className: cn('h-auto', child.props.className),
      }),
    ];
  });
}

/** The letter or number an answer at this position is badged with. */
function shortcutAt(mode: QuestionnaireShortcutMode, index: number): string | null {
  if (mode === 'numbers') return index < 9 ? String(index + 1) : null;
  return index < 26 ? String.fromCharCode(65 + index) : null;
}

export interface QuestionnaireProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * The full set of questions, in order. Optional: without it the order and
   * the totals come from the `Questionnaire.Item` children instead. Pass it
   * when a question is conditional, since a question the user has not reached
   * still has to be counted — or not counted, if it no longer applies.
   */
  items?: readonly QuestionnaireItemDefinition[];
  /** Controlled active question, by name. */
  item?: string;
  /** Which question to open on. Defaults to the first enabled one. */
  defaultItem?: string;
  /** Called with the name of the question being moved to. */
  onItemChange?: (name: string) => void;
  /** Controlled answers. */
  answers?: QuestionnaireAnswers;
  /** Answers to start with — for resuming a part-finished questionnaire. */
  defaultAnswers?: QuestionnaireAnswers;
  /** Called with the whole set every time any answer changes. */
  onAnswersChange?: (answers: QuestionnaireAnswers) => void;
  /** Called with every answer once the last question validates. */
  onSubmit?: (answers: QuestionnaireAnswers) => void;
  /**
   * Badge every answer with a letter (`A`, `B`, `C`) or a number (`1`, `2`,
   * `3`). Disabled answers are skipped rather than taking a badge with them.
   *
   * The badge is an affordance, not a binding: React Native surfaces hardware
   * key events only to a focused text field, so nothing here can listen for
   * the key itself.
   */
  shortcuts?: QuestionnaireShortcutMode;
  /**
   * Let a horizontal drag move between questions. Going forward is gated on
   * the same answer the button is, so a swipe off an unanswered required
   * question springs back and shows its error.
   */
  swipeable?: boolean;
  /**
   * Draw the surrounding `Frame`. Turn it off to place the questionnaire in a
   * sheet, a dialog or a card that already draws its own boundary.
   */
  frame?: boolean;
  children?: ReactNode;
}

function QuestionnaireRoot({
  className,
  items,
  item: itemProp,
  defaultItem,
  onItemChange,
  answers: answersProp,
  defaultAnswers,
  onAnswersChange,
  onSubmit,
  shortcuts,
  swipeable = true,
  frame = true,
  children,
  ...props
}: QuestionnaireProps) {
  /*
   * One pass over the children does two jobs: it sorts the parts into the
   * shell's three regions, and it reads the questions' props off the elements
   * so the set is known without mounting any of it.
   */
  const { titleNode, progressNode, footerNode, elements } = useMemo(() => {
    let title: ReactNode = null;
    let progress: ReactNode = null;
    let footer: ReactNode = null;
    const found: ReactElement<QuestionnaireItemProps>[] = [];

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === QuestionnaireTitle) title = child;
      else if (child.type === QuestionnaireProgress) progress = child;
      else if (child.type === QuestionnaireFooter) footer = child;
      else if (child.type === QuestionnaireItem) {
        found.push(child as ReactElement<QuestionnaireItemProps>);
      }
    });

    return { titleNode: title, progressNode: progress, footerNode: footer, elements: found };
  }, [children]);

  /*
   * `items` decides the order when it is given, because a question that has
   * not rendered still has to hold its place in the count. A question's own
   * props win over the definition wherever both say something, so a
   * conditional `disabled` can be computed at the point it is rendered.
   */
  const resolved = useMemo<ResolvedItem[]>(() => {
    const byName = new Map(elements.map((element) => [element.props.name, element]));

    const merge = (
      definition: QuestionnaireItemDefinition,
      element: ReactElement<QuestionnaireItemProps> | undefined
    ): ResolvedItem | null => {
      if (!element) return null;
      const p = element.props;
      return {
        name: definition.name,
        required: p.required ?? definition.required,
        multiple: p.multiple ?? definition.multiple,
        disabled: p.disabled ?? definition.disabled,
        onStatusChange: p.onStatusChange,
        element,
      };
    };

    if (items?.length) {
      return items
        .map((definition) => merge(definition, byName.get(definition.name)))
        .filter((entry): entry is ResolvedItem => entry !== null);
    }

    return elements.map((element) => ({
      name: element.props.name,
      required: element.props.required,
      multiple: element.props.multiple,
      disabled: element.props.disabled,
      onStatusChange: element.props.onStatusChange,
      element,
    }));
  }, [items, elements]);

  /** The ones that count: disabled questions are neither shown nor tallied. */
  const enabled = useMemo(() => resolved.filter((entry) => !entry.disabled), [resolved]);

  const [internalItem, setInternalItem] = useState<string | null>(defaultItem ?? null);
  const [internalAnswers, setInternalAnswers] = useState<QuestionnaireAnswers>(
    () => defaultAnswers ?? {}
  );
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set());
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(() => new Set());

  const isItemControlled = itemProp !== undefined;
  const isAnswersControlled = answersProp !== undefined;
  const answers = isAnswersControlled ? answersProp : internalAnswers;

  /*
   * Falling back to the first enabled question rather than storing it means a
   * questionnaire whose first question becomes disabled moves off it by
   * itself, instead of sitting on a question it has been told not to show.
   */
  const requested = isItemControlled ? itemProp : internalItem;
  const activeIndex = Math.max(
    0,
    enabled.findIndex((entry) => entry.name === requested)
  );
  const activeItem = enabled[activeIndex] ?? null;
  const activeName = activeItem?.name ?? null;

  const total = enabled.length;
  const current = total === 0 ? 0 : activeIndex + 1;
  const first = activeIndex === 0;
  const last = total === 0 || activeIndex === total - 1;

  const statusOf = useCallback(
    (name: string): QuestionnaireItemStatus => {
      if (isAnswered(answers[name])) return 'answered';
      if (skipped.has(name)) return 'skipped';
      return 'unanswered';
    },
    [answers, skipped]
  );

  /*
   * Reported from here rather than from the question itself: only the active
   * question is mounted, and skipping one is immediately followed by leaving
   * it, so an effect inside it would be racing its own unmount.
   */
  const emitStatus = useCallback(
    (name: string, status: QuestionnaireItemStatus) => {
      resolved.find((entry) => entry.name === name)?.onStatusChange?.(status);
    },
    [resolved]
  );

  const commitAnswers = useCallback(
    (next: QuestionnaireAnswers) => {
      if (!isAnswersControlled) setInternalAnswers(next);
      onAnswersChange?.(next);
    },
    [isAnswersControlled, onAnswersChange]
  );

  const setAnswer = useCallback(
    (name: string, value: string | string[] | undefined) => {
      const next = { ...answers };
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        delete next[name];
      } else {
        next[name] = value;
      }

      commitAnswers(next);

      // Answering clears both a recorded skip and a failed validation: the
      // reason for either has just stopped being true.
      setSkipped((previous) => {
        if (!previous.has(name)) return previous;
        const copy = new Set(previous);
        copy.delete(name);
        return copy;
      });
      setInvalid((previous) => {
        if (!previous.has(name)) return previous;
        const copy = new Set(previous);
        copy.delete(name);
        return copy;
      });

      emitStatus(name, isAnswered(next[name]) ? 'answered' : 'unanswered');
    },
    [answers, commitAnswers, emitStatus]
  );

  const toggleAnswer = useCallback(
    (name: string, value: string, multiple: boolean) => {
      if (!multiple) {
        // Pressing the selected answer again clears it, which is the only way
        // to undo an answer to an optional question without a Skip button.
        setAnswer(name, answers[name] === value ? undefined : value);
        return;
      }

      const currentValue = answers[name];
      const list = Array.isArray(currentValue) ? currentValue : [];
      setAnswer(
        name,
        list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
      );
    },
    [answers, setAnswer]
  );

  const moveTo = useCallback(
    (index: number) => {
      const target = enabled[index];
      if (!target) return;
      if (!isItemControlled) setInternalItem(target.name);
      onItemChange?.(target.name);
    },
    [enabled, isItemControlled, onItemChange]
  );

  /** A required question is the only thing that blocks. */
  const validate = useCallback(
    (entry: ResolvedItem | null): boolean => {
      if (!entry || !entry.required) return true;
      if (isAnswered(answers[entry.name])) return true;
      setInvalid((previous) => new Set(previous).add(entry.name));
      return false;
    },
    [answers]
  );

  const goNext = useCallback(() => {
    if (!validate(activeItem)) return;
    moveTo(activeIndex + 1);
  }, [validate, activeItem, moveTo, activeIndex]);

  // Going back never validates: the way out of a question you cannot answer
  // must not be the same door you came in by.
  const goBack = useCallback(() => moveTo(activeIndex - 1), [moveTo, activeIndex]);

  const skip = useCallback(() => {
    if (!activeItem || activeItem.required) return;
    setAnswer(activeItem.name, undefined);
    setSkipped((previous) => new Set(previous).add(activeItem.name));
    emitStatus(activeItem.name, 'skipped');
    if (!last) moveTo(activeIndex + 1);
  }, [activeItem, setAnswer, emitStatus, last, moveTo, activeIndex]);

  const submit = useCallback(() => {
    const failed = enabled.filter((entry) => entry.required && !isAnswered(answers[entry.name]));
    if (failed.length > 0) {
      setInvalid((previous) => {
        const copy = new Set(previous);
        failed.forEach((entry) => copy.add(entry.name));
        return copy;
      });
      // Take them to the first question that is missing an answer rather than
      // leaving them on the last one wondering which of the others it was.
      const index = enabled.findIndex((entry) => entry.name === failed[0]!.name);
      if (index !== activeIndex) moveTo(index);
      return;
    }
    onSubmit?.(answers);
  }, [enabled, answers, activeIndex, moveTo, onSubmit]);

  /*
   * Whether the way on is shut, as against whether it has been *tried* — the
   * error under the question needs somebody to have pressed the button, but
   * the button's own look must not, or it would read as ready right up until
   * it refused.
   */
  const blocked = !!activeItem?.required && !isAnswered(answers[activeItem.name]);

  const context = useMemo<QuestionnaireContextValue>(
    () => ({
      current,
      total,
      first,
      last,
      activeName,
      activeItem,
      answers,
      statusOf,
      invalid,
      setAnswer,
      toggleAnswer,
      goNext,
      goBack,
      skip,
      submit,
      shortcuts: shortcuts ?? null,
      framed: frame,
      blocked,
    }),
    [
      current,
      total,
      first,
      last,
      activeName,
      activeItem,
      answers,
      statusOf,
      invalid,
      setAnswer,
      toggleAnswer,
      goNext,
      goBack,
      skip,
      submit,
      shortcuts,
      frame,
      blocked,
    ]
  );

  const body = (
    <QuestionnaireBody
      activeName={activeName}
      activeItem={activeItem}
      activeIndex={activeIndex}
      framed={frame}
      swipeable={swipeable}
      canAdvance={!last}
      canRetreat={!first}
      onNext={goNext}
      onBack={goBack}
    />
  );

  /*
   * A little more room under the strip than the `inset` header takes by
   * default. That default is set for a line of text; the ring is a shape whose
   * stroke reaches the edge of its box, with none of the leading a line of
   * text has, so against the same padding it sits closer to the panel than the
   * title beside it does.
   *
   * With no title, the progress centres rather than staying hard right. Right
   * is where it belongs when it is the trailing half of a pair; on its own at
   * the end of an otherwise empty strip it reads as something left over
   * rather than as the strip's subject.
   */
  const header = (
    <Frame.Header className={cn('pb-3 pt-1.5', !titleNode && 'justify-center')}>
      {titleNode}
      {progressNode ? <Frame.Action>{progressNode}</Frame.Action> : null}
    </Frame.Header>
  );

  return (
    <QuestionnaireContext.Provider value={context}>
      {frame ? (
        /*
         * The panel floats in a recessed band rather than sitting flush in a
         * tray, and the band is where the actions go. A questionnaire is a
         * screen's worth of one decision repeated — answer, then move — and
         * the band draws that row as equal pills clear of the card the
         * question is written on, which is the distinction the old footer
         * section inside the panel did not make.
         */
        <Frame variant="inset" className={className} {...props}>
          {header}
          <Frame.Panel dividers={false}>{body}</Frame.Panel>
          {footerNode ? (
            // Tighter than the band's own gap. That one is set for two or
            // three equal pills; this row is three actions of three different
            // widths, and every point between them comes off the longest label.
            <Frame.Footer className="gap-2">{bandActions(footerNode)}</Frame.Footer>
          ) : null}
        </Frame>
      ) : (
        <View className={cn('w-full', className)} {...props}>
          {titleNode || progressNode ? (
            // The same rule as the framed strip: paired with a title it sits
            // at the trailing edge, alone it centres.
            <View
              className={cn(
                'flex-row items-center gap-3 pb-3',
                titleNode ? 'justify-between' : 'justify-center'
              )}
            >
              {titleNode}
              {progressNode}
            </View>
          ) : null}
          {body}
          {footerNode}
        </View>
      )}
    </QuestionnaireContext.Provider>
  );
}
QuestionnaireRoot.displayName = 'Questionnaire';

interface QuestionnaireBodyProps {
  activeName: string | null;
  activeItem: ResolvedItem | null;
  /** Position of the active question, which is what says which way a move went. */
  activeIndex: number;
  framed: boolean;
  swipeable: boolean;
  canAdvance: boolean;
  canRetreat: boolean;
  onNext: () => void;
  onBack: () => void;
}

/**
 * The middle of the questionnaire: the one mounted question, the height it
 * animates to, and the drag that moves between them.
 */
function QuestionnaireBody({
  activeName,
  activeItem,
  activeIndex,
  framed,
  swipeable,
  canAdvance,
  canRetreat,
  onNext,
  onBack,
}: QuestionnaireBodyProps) {
  const slots = questionnaireVariants({ framed });

  const [width, setWidth] = useState(0);
  // -1 means nothing has been measured yet, so the first question takes its
  // height outright instead of growing into it from nothing.
  const height = useSharedValue(-1);
  const drag = useSharedValue(0);
  const paneRef = useRef<View>(null);

  /*
   * Until the first question has been measured the pane stays in the flow, so
   * the body has a real height from the moment it first lays out. Absolute
   * from the start would measure zero on that first pass — the container's
   * only child would contribute nothing to it — and anything sizing itself to
   * this content would take the zero and keep it. A sheet set to wrap its
   * content is exactly that, and it would open around a question nobody can
   * see. Once the height is known the pane goes absolute, which is what lets
   * the question leaving and the one arriving overlap.
   */
  const [measured, setMeasured] = useState(false);

  /*
   * Which way the question slides in from, worked out from the move itself
   * rather than from whatever triggered it. A button, a swipe and a caller
   * setting `item` directly are all the same move to the reader, and only the
   * change in position says which direction it went.
   *
   * Read during render, not in an effect: the arriving question's animation is
   * fixed when it mounts, and an effect runs after that — which would leave
   * every transition playing the direction of the one before it.
   */
  const previousIndex = useRef(activeIndex);
  const direction: 1 | -1 = activeIndex >= previousIndex.current ? 1 : -1;
  const navigated = useRef(false);

  useEffect(() => {
    if (activeIndex !== previousIndex.current) {
      previousIndex.current = activeIndex;
      navigated.current = true;
    }
  }, [activeIndex]);

  const navigate = useCallback(
    (delta: 1 | -1) => {
      if (delta === 1) onNext();
      else onBack();
    },
    [onNext, onBack]
  );

  useEffect(() => {
    drag.value = 0;
  }, [activeName, drag]);

  // Move the reader onto the question that just arrived, so a screen reader
  // reads the new question rather than leaving focus where the button was.
  useEffect(() => {
    if (!navigated.current) return;
    const node = paneRef.current;
    if (!node) return;
    const tag = findNodeHandle(node);
    if (tag != null) AccessibilityInfo.setAccessibilityFocus(tag);
  }, [activeName]);

  const onPaneLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const next = event.nativeEvent.layout.height;
      if (next <= 0) return;
      if (measured) {
        height.value = withTiming(next, { duration: HEIGHT_DURATION, easing: EASE });
        return;
      }
      // The first measurement is taken outright: there is no previous height
      // to travel from, and animating in from nothing is a question that
      // unfurls on arrival rather than one that is simply there.
      height.value = next;
      setMeasured(true);
    },
    [measured, height]
  );

  const heightStyle = useAnimatedStyle(() =>
    height.value < 0 ? {} : { height: height.value }
  );

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value }],
  }));

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // A vertical scroll must always win: the questionnaire sits in a page
        // that scrolls, and a drag that is even slightly vertical belongs to it.
        .activeOffsetX([-12, 12])
        .failOffsetY([-8, 8])
        .enabled(swipeable && width > 0)
        .onUpdate((event) => {
          const forward = event.translationX < 0;
          if ((forward && !canAdvance) || (!forward && !canRetreat)) {
            // Nowhere to go this way — let it move a little so the drag is
            // acknowledged, then stop.
            drag.value = event.translationX * 0.2;
            return;
          }
          drag.value = event.translationX;
        })
        .onEnd((event) => {
          const threshold = width * SWIPE_FRACTION;
          if (event.translationX < -threshold && canAdvance) {
            runOnJS(navigate)(1);
          } else if (event.translationX > threshold && canRetreat) {
            runOnJS(navigate)(-1);
          }
          // Springs back either way. When the move is taken the question is
          // replaced outright, so this only ever shows on a move that was not.
          drag.value = withSpring(0, { damping: 20, stiffness: 220, mass: 0.6 });
        }),
    [swipeable, width, canAdvance, canRetreat, drag, navigate]
  );

  /*
   * The question arrives from the side it is coming from, over a fraction of
   * the width rather than the whole of it — this is a widget in a page, not a
   * screen, and a slide the full width of it reads as the page moving.
   *
   * Written out rather than assembled from the stock builders because those
   * carry an initial opacity and nothing else: the distance is the part worth
   * controlling here, and none of them lets it be set.
   */
  const offset = width > 0 ? width * SLIDE_FRACTION : 60;
  const entering = useCallback<EntryExitAnimationFunction>(() => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateX: direction * offset }] },
      animations: {
        opacity: withTiming(1, { duration: ENTER_DURATION, easing: EASE }),
        transform: [{ translateX: withTiming(0, { duration: ENTER_DURATION, easing: EASE }) }],
      },
    };
  }, [direction, offset]);

  const exiting = FadeOut.duration(EXIT_DURATION);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={heightStyle}
        className={slots.body()}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {/*
         * Two views, not one: the entering animation drives this one's
         * transform, so the drag needs a view of its own underneath it rather
         * than a second transform on the same style the animation is writing.
         */}
        <Animated.View
          key={activeName ?? '__empty__'}
          entering={measured ? entering : undefined}
          exiting={exiting}
          className={measured ? slots.slide() : 'w-full'}
        >
          <Animated.View style={dragStyle}>
            <View ref={paneRef} onLayout={onPaneLayout} className={slots.pane()}>
              {activeItem?.element ?? null}
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export interface QuestionnaireTitleProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Names the questionnaire as a whole, in the frame's header strip. The
 * current question's own prompt is `Questionnaire.Question`.
 */
function QuestionnaireTitle({ className, children, ...props }: QuestionnaireTitleProps) {
  return (
    <View className={cn('min-w-0 flex-1', className)} {...props}>
      {textChildren(children, (text) => (
        <Text size="sm" muted numberOfLines={1}>
          {text}
        </Text>
      ))}
    </View>
  );
}
QuestionnaireTitle.displayName = 'Questionnaire.Title';

/** What a custom progress indicator is told about where the reader is. */
export interface QuestionnaireProgressState {
  /** One-based position of the active question. */
  current: number;
  /** How many questions are enabled. */
  total: number;
  first: boolean;
  last: boolean;
}

/** How the position is drawn. */
export type QuestionnaireProgressVariant = 'ring' | 'pips' | 'numbers' | 'count';

export interface QuestionnaireProgressProps {
  className?: string;
  /**
   * `ring` is an arc that sweeps round as the reader advances — how far
   * through the set they are, without saying how many questions there are.
   * It is the only one that holds its size and its meaning at any length,
   * which is why it is the default.
   *
   * `pips` is a bar per question, filled up to the one being asked and widened
   * on it. `numbers` counts them out instead, which is what you want when the
   * reader will be sent back to a particular question. `count` is the plain
   * `Question 2 of 5`.
   *
   * `pips` and `numbers` fall back to `count` past eight questions, where
   * neither is countable at a glance any more. `ring` never does.
   */
  variant?: QuestionnaireProgressVariant;
  /**
   * Replace the indicator entirely. Given a function, it is called with the
   * position — for a bar, a row of dots, or a percentage.
   */
  children?: ReactNode | ((state: QuestionnaireProgressState) => ReactNode);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * How far through the set, as an arc.
 *
 * A fraction rather than a count, which is what lets one ring stand for three
 * questions or thirty: the marks that name each question individually stop
 * being countable somewhere around eight, and this never has that problem.
 * What it gives up is any answer to "how many left" — reach for `numbers`
 * where that matters.
 *
 * Drawn with `strokeDasharray` rather than `strokeDashoffset`: a dash the
 * length of the filled arc and a gap the length of the rest leaves exactly one
 * visible stroke, and its length is the only number that has to be animated.
 * The circle is turned back a quarter because a stroke starts at three
 * o'clock, and an arc that begins there reads as a gauge already part-way
 * along.
 */
function ProgressRing({ current, total }: { current: number; total: number }) {
  const reduceMotion = useReducedMotion();
  const tokens = useCSSVariable(['--color-primary', '--color-border']);
  // Narrowed on the way out because `useCSSVariable` resolves to a number for
  // any token that happens to be one.
  const fillColor = typeof tokens[0] === 'string' ? tokens[0] : 'rgb(120,120,255)';
  const trackColor = typeof tokens[1] === 'string' ? tokens[1] : 'rgba(128,128,128,0.2)';

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = RING_SIZE / 2;

  const fraction = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;
  const filled = useSharedValue(fraction);

  useEffect(() => {
    filled.value = reduceMotion
      ? fraction
      : withTiming(fraction, { duration: PIP_DURATION, easing: EASE });
  }, [fraction, reduceMotion, filled]);

  const arc = useAnimatedProps(() => ({
    strokeDasharray: [circumference * filled.value, circumference],
  }));

  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={centre}
        cy={centre}
        r={radius}
        stroke={trackColor}
        strokeWidth={RING_STROKE}
        fill="none"
      />
      <AnimatedCircle
        animatedProps={arc}
        cx={centre}
        cy={centre}
        r={radius}
        stroke={fillColor}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${centre} ${centre})`}
      />
    </Svg>
  );
}

/**
 * One question's worth of the track. Filled once it has been reached, and the
 * one being asked is drawn wider than the rest so the reader's place in the
 * set is legible without counting.
 */
function ProgressPip({ filled, active }: { filled: boolean; active: boolean }) {
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    fill.value = withTiming(filled ? 1 : 0, { duration: PIP_DURATION, easing: EASE });
  }, [filled, fill]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  return (
    <View
      className={cn(
        'h-1 overflow-hidden rounded-full bg-border',
        active ? 'w-5' : 'w-2.5'
      )}
    >
      <Animated.View style={fillStyle} className="h-full w-full rounded-full bg-primary" />
    </View>
  );
}

/**
 * The same position, counted out. A number says which question this is in a
 * way a bar cannot — worth it where the reader is going to be asked to go back
 * to one of them, since a bar gives them nothing to go back *to*.
 */
function ProgressNumber({
  value,
  done,
  active,
}: {
  value: number;
  done: boolean;
  active: boolean;
}) {
  return (
    <View
      className={cn(
        'h-5 w-5 items-center justify-center rounded-full border',
        active
          ? 'border-primary bg-primary'
          : done
            ? 'border-primary/40 bg-primary/10'
            : 'border-border bg-muted'
      )}
    >
      <Text
        className={cn(
          'text-[11px] font-medium tabular-nums',
          active
            ? 'text-primary-foreground'
            : done
              ? 'text-primary'
              : 'text-muted-foreground'
        )}
      >
        {value}
      </Text>
    </View>
  );
}

/** Where the reader is in the set, announced as a progress bar. */
function QuestionnaireProgress({
  className,
  variant = 'ring',
  children,
}: QuestionnaireProgressProps) {
  const { current, total, first, last } = useQuestionnaire('Questionnaire.Progress');
  const label = `Question ${current} of ${total}`;

  /*
   * Marks while they can still be counted, the count itself once they cannot.
   * Twenty of either is a texture rather than a number, and the text says the
   * same thing in less room. The ring is exempt: it never claimed to be
   * countable, so there is nothing for a long set to take away from it.
   */
  const drawable =
    variant !== 'count' && variant !== 'ring' && total > 0 && total <= MAX_PIPS;

  const fallback = variant === 'ring' ? (
    <ProgressRing current={current} total={total} />
  ) : drawable ? (
    <View className={cn('flex-row items-center', variant === 'numbers' ? 'gap-1.5' : 'gap-1')}>
      {Array.from({ length: total }, (_, index) =>
        variant === 'numbers' ? (
          <ProgressNumber
            key={index}
            value={index + 1}
            done={index < current - 1}
            active={index === current - 1}
          />
        ) : (
          <ProgressPip key={index} filled={index < current} active={index === current - 1} />
        )
      )}
    </View>
  ) : (
    <Text size="sm" muted className="tabular-nums">
      {label}
    </Text>
  );

  const content =
    typeof children === 'function' ? children({ current, total, first, last }) : (children ?? fallback);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Questionnaire progress"
      accessibilityValue={{ min: 1, max: Math.max(total, 1), now: current, text: label }}
      className={className}
    >
      {textChildren(content, (text) => (
        <Text size="sm" muted className="tabular-nums">
          {text}
        </Text>
      ))}
    </View>
  );
}
QuestionnaireProgress.displayName = 'Questionnaire.Progress';

export interface QuestionnaireItemProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** Unique name — the key this question's answer is stored under. */
  name: string;
  /** Blocks the way forward until it has an answer. */
  required?: boolean;
  /** Accepts more than one answer, so its answer is an array. */
  multiple?: boolean;
  /** Left out of the count and never navigated to. */
  disabled?: boolean;
  /** Mark the question at fault from a validator of your own. */
  invalid?: boolean;
  /** Called whenever this question moves between unanswered, answered and skipped. */
  onStatusChange?: (status: QuestionnaireItemStatus) => void;
  children?: ReactNode;
}

/**
 * One question. Only the active one is mounted, so anything it holds is built
 * when it is reached and thrown away when it is left.
 */
function QuestionnaireItem({
  className,
  name,
  required,
  multiple,
  invalid: invalidProp,
  children,
  // Read by the root off this element rather than used here.
  disabled: _disabled,
  onStatusChange: _onStatusChange,
  ...props
}: QuestionnaireItemProps) {
  const { invalid: invalidNames } = useQuestionnaire('Questionnaire.Item');

  /*
   * Collected so a typed answer can be told from a chosen one: whatever the
   * question is holding that is not one of these values came from the text
   * field, and that is what puts it back in the field on the way back.
   */
  const choiceValues = useMemo(() => {
    const values = new Set<string>();
    const walk = (node: ReactNode) => {
      Children.forEach(node, (child) => {
        if (!isValidElement(child)) return;
        if (child.type === QuestionnaireChoice) {
          values.add((child.props as QuestionnaireChoiceProps).value);
          return;
        }
        walk((child.props as { children?: ReactNode }).children);
      });
    };
    walk(children);
    return values;
  }, [children]);

  const context = useMemo<QuestionnaireItemContextValue>(
    () => ({
      name,
      required: !!required,
      multiple: !!multiple,
      invalid: !!invalidProp || invalidNames.has(name),
      choiceValues,
    }),
    [name, required, multiple, invalidProp, invalidNames, choiceValues]
  );

  return (
    <QuestionnaireItemContext.Provider value={context}>
      <View
        accessibilityRole={multiple ? undefined : 'radiogroup'}
        className={cn('gap-4', className)}
        {...props}
      >
        {textChildren(children)}
      </View>
    </QuestionnaireItemContext.Provider>
  );
}
QuestionnaireItem.displayName = 'Questionnaire.Item';

export interface QuestionnaireQuestionProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The question being asked. */
function QuestionnaireQuestion({ className, children, ...props }: QuestionnaireQuestionProps) {
  return (
    <View className={className} {...props}>
      {textChildren(children, (text) => (
        // `text-pretty` rather than a hard wrap: a question is a sentence, and
        // the one thing worse than two lines is a second line holding one word.
        <Text size="xl" weight="semibold" className="text-pretty leading-snug">
          {text}
        </Text>
      ))}
    </View>
  );
}
QuestionnaireQuestion.displayName = 'Questionnaire.Question';

export interface QuestionnaireDescriptionProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** A line under the question — what to consider, or that it can be skipped. */
function QuestionnaireDescription({
  className,
  children,
  ...props
}: QuestionnaireDescriptionProps) {
  return (
    // Pulled up against the question it belongs to: the pane's gap is the
    // distance between one part and the next, and these two are one part.
    <View className={cn('-mt-2.5', className)} {...props}>
      {textChildren(children, (text) => (
        <Text size="sm" muted className="leading-snug">
          {text}
        </Text>
      ))}
    </View>
  );
}
QuestionnaireDescription.displayName = 'Questionnaire.Description';

export interface QuestionnaireChoicesProps extends Omit<ViewProps, 'children'> {
  className?: string;
  children?: ReactNode;
}

/**
 * The answers to a question. It hands each choice its shortcut badge, counting
 * only the ones that can be picked so a disabled answer does not take a letter
 * out of the sequence with it.
 */
function QuestionnaireChoices({ className, children, ...props }: QuestionnaireChoicesProps) {
  const { shortcuts } = useQuestionnaire('Questionnaire.Choices');
  const slots = questionnaireVariants();

  const badged = useMemo(() => {
    if (!shortcuts) return children;
    let index = 0;
    return Children.map(children, (child) => {
      if (!isValidElement(child) || child.type !== QuestionnaireChoice) return child;
      if ((child.props as QuestionnaireChoiceProps).disabled) return child;
      const key = shortcutAt(shortcuts, index++);
      if (!key) return child;
      return (
        <ShortcutContext.Provider key={key} value={key}>
          {child}
        </ShortcutContext.Provider>
      );
    });
  }, [children, shortcuts]);

  return (
    <View className={slots.choices({ className })} {...props}>
      {textChildren(badged)}
    </View>
  );
}
QuestionnaireChoices.displayName = 'Questionnaire.Choices';

export interface QuestionnaireChoiceProps {
  className?: string;
  /** The value recorded when this answer is picked. */
  value: string;
  /** The answer itself. */
  label?: string;
  /** A line under the label, for an answer that needs explaining. */
  description?: string;
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * One fixed answer — the whole row is the target, with the indicator reading
 * as confirmation rather than as the thing to aim at.
 */
const QuestionnaireChoice = forwardRef<View, QuestionnaireChoiceProps>(
  ({ className, value, label, description, disabled, children }, ref) => {
    const { answers, toggleAnswer } = useQuestionnaire('Questionnaire.Choice');
    const item = useQuestionnaireItem('Questionnaire.Choice');
    const shortcut = useContext(ShortcutContext);

    const answer = answers[item.name];
    const selected = Array.isArray(answer) ? answer.includes(value) : answer === value;

    const progress = useSharedValue(selected ? 1 : 0);

    useEffect(() => {
      progress.value = selected
        ? withSpring(1, { damping: 15, stiffness: 300, mass: 0.5 })
        : withTiming(0, { duration: 120 });
    }, [selected, progress]);

    const markStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
      transform: [{ scale: progress.value }],
    }));

    const checkColor = useCSSVariable('--color-primary-foreground');
    const slots = choiceVariants({
      multiple: item.multiple,
      selected,
      disabled: !!disabled,
      invalid: item.invalid && !selected,
    });

    const labelled = label ? (
      <Text className={slots.label()}>{label}</Text>
    ) : (
      textChildren(children, (text) => <Text className={slots.label()}>{text}</Text>)
    );

    return (
      <Pressable
        ref={ref}
        accessibilityRole={item.multiple ? 'checkbox' : 'radio'}
        accessibilityState={{
          checked: item.multiple ? selected : undefined,
          selected,
          disabled: !!disabled,
        }}
        accessibilityLabel={label}
        accessibilityHint={description}
        disabled={disabled}
        onPress={() => toggleAnswer(item.name, value, item.multiple)}
        className={slots.row({ className })}
      >
        <View className={cn(slots.indicator(), selected && 'border-primary bg-primary')}>
          <Animated.View style={markStyle}>
            {item.multiple ? (
              <CheckIcon
                size={13}
                color={typeof checkColor === 'string' ? checkColor : '#fff'}
              />
            ) : (
              <View className="h-2 w-2 rounded-full bg-primary-foreground" />
            )}
          </Animated.View>
        </View>
        <View className="min-w-0 flex-1 gap-1">
          {labelled}
          {description ? <Text className={slots.description()}>{description}</Text> : null}
        </View>
        {shortcut ? (
          <View className={slots.shortcut()}>
            <Text className={slots.shortcutLabel()}>{shortcut}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }
);
QuestionnaireChoice.displayName = 'Questionnaire.Choice';

export interface QuestionnaireInputProps
  extends Omit<InputProps, 'value' | 'onChangeText' | 'errorMessage'> {
  className?: string;
}

/**
 * An answer that is not on the list. It holds whatever the question is
 * answered with that none of its own choices offers, so picking a choice
 * empties it and typing clears the choice — one answer to one question, with
 * neither part having to know about the other.
 */
const QuestionnaireInput = forwardRef<TextInput, QuestionnaireInputProps>(
  ({ className, ...props }, ref) => {
    const { answers, setAnswer } = useQuestionnaire('Questionnaire.Input');
    const item = useQuestionnaireItem('Questionnaire.Input');

    const answer = answers[item.name];
    const freeform = useMemo(() => {
      if (Array.isArray(answer)) {
        return answer.find((entry) => !item.choiceValues.has(entry)) ?? '';
      }
      return typeof answer === 'string' && !item.choiceValues.has(answer) ? answer : '';
    }, [answer, item.choiceValues]);

    const onChangeText = useCallback(
      (text: string) => {
        if (!item.multiple) {
          setAnswer(item.name, text);
          return;
        }
        // Replace this question's one typed entry, leaving every picked one alone.
        const list = Array.isArray(answer) ? answer : [];
        const fixed = list.filter((entry) => item.choiceValues.has(entry));
        setAnswer(item.name, text.length > 0 ? [...fixed, text] : fixed);
      },
      [item.multiple, item.name, item.choiceValues, answer, setAnswer]
    );

    return (
      <Input
        ref={ref}
        value={freeform}
        onChangeText={onChangeText}
        className={className}
        {...props}
      />
    );
  }
);
QuestionnaireInput.displayName = 'Questionnaire.Input';

export interface QuestionnaireErrorProps extends ViewProps {
  className?: string;
  /** Replace the default message. */
  children?: ReactNode;
}

/** Why the way forward is closed. Nothing until the question fails to pass. */
function QuestionnaireError({ className, children, ...props }: QuestionnaireErrorProps) {
  const item = useQuestionnaireItem('Questionnaire.Error');
  const slots = questionnaireVariants();

  if (!item.invalid) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={className}
      {...props}
    >
      {textChildren(children ?? DEFAULT_ERROR, (text) => (
        <Text className={slots.error()}>{text}</Text>
      ))}
    </View>
  );
}
QuestionnaireError.displayName = 'Questionnaire.Error';

export interface QuestionnaireFooterProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The action row, in its own section at the foot of the panel. It stays put
 * while the question above it changes, which is what keeps the button under
 * the thumb where it was.
 */
function QuestionnaireFooter({ className, children, ...props }: QuestionnaireFooterProps) {
  const { framed } = useQuestionnaire('Questionnaire.Footer');
  const slots = questionnaireVariants({ framed });
  return (
    <View className={slots.footer({ className })} {...props}>
      {textChildren(children)}
    </View>
  );
}
QuestionnaireFooter.displayName = 'Questionnaire.Footer';

/** What a navigation button is told about the question it is acting on. */
export interface QuestionnaireActionState {
  /** Whether the action applies to the active question at all. */
  visible: boolean;
  /** Where the active question stands. */
  status: QuestionnaireItemStatus;
}

export interface QuestionnaireActionProps extends Omit<ButtonProps, 'children'> {
  /** Replace the label. Given a function, it is called with the question's state. */
  children?: ReactNode | ((state: QuestionnaireActionState) => ReactNode);
}

/**
 * Builds one of the four navigation buttons. They differ only in when they
 * apply, what they do and how they are labelled by default, so they are made
 * rather than written out four times.
 */
interface ActionConfig {
  displayName: string;
  label: string;
  variant: NonNullable<ButtonProps['variant']>;
  /** A chevron on the buttons that move, and nothing on the ones that do not. */
  startContent?: ReactNode;
  endContent?: ReactNode;
  /**
   * Dim this one while the active question is required and unanswered.
   *
   * It stays pressable on purpose. A disabled button says no without saying
   * why, and on a question whose answers have scrolled out of view that is the
   * whole of the feedback; pressing this one puts the reason under the
   * question instead. Dimming is what stops it promising something it will not
   * do — the look says not yet, the press says why not.
   */
  dimWhenBlocked?: boolean;
  use: (context: QuestionnaireContextValue) => { visible: boolean; onPress: () => void };
}

function createAction({
  displayName,
  label: fallbackLabel,
  variant: fallbackVariant,
  startContent,
  endContent,
  dimWhenBlocked,
  use,
}: ActionConfig) {
  function Action({ children, variant, className, ...props }: QuestionnaireActionProps) {
    const context = useQuestionnaire(displayName);
    const { visible, onPress } = use(context);
    const status = context.activeName ? context.statusOf(context.activeName) : 'unanswered';

    // Not rendered at all rather than hidden: React Native has no `inert`, and
    // a button left in the tree is one a screen reader still offers.
    if (!visible) return null;

    const label = typeof children === 'function' ? children({ visible, status }) : children;
    const dimmed = !!dimWhenBlocked && context.blocked;

    return (
      <Button
        variant={variant ?? fallbackVariant}
        startContent={startContent}
        endContent={endContent}
        onPress={onPress}
        // Not `accessibilityState.disabled`: it is not disabled, and saying so
        // would stop a screen reader offering the very press that explains it.
        accessibilityHint={dimmed ? DEFAULT_ERROR : undefined}
        className={cn(dimmed && 'opacity-[0.64]', className)}
        {...props}
      >
        {label ?? fallbackLabel}
      </Button>
    );
  }

  Action.displayName = displayName;
  return Action;
}

/** Back to the previous question. Absent on the first one. */
const QuestionnaireBack = createAction({
  displayName: 'Questionnaire.Back',
  label: 'Back',
  variant: 'ghost',
  startContent: <ChevronLeftIcon size={16} />,
  use: (context) => ({ visible: !context.first, onPress: context.goBack }),
});

/** Records that an optional question was deliberately left out. */
const QuestionnaireSkip = createAction({
  displayName: 'Questionnaire.Skip',
  label: 'Skip',
  variant: 'ghost',
  use: (context) => ({
    visible: !!context.activeItem && !context.activeItem.required,
    onPress: context.skip,
  }),
});

/** On to the next question, if the current one lets go. Absent on the last. */
const QuestionnaireNext = createAction({
  displayName: 'Questionnaire.Next',
  label: 'Continue',
  variant: 'primary',
  endContent: <ChevronRightIcon size={16} />,
  dimWhenBlocked: true,
  use: (context) => ({ visible: !context.last, onPress: context.goNext }),
});

/** Hands over every answer. Only on the last question. */
const QuestionnaireSubmit = createAction({
  displayName: 'Questionnaire.Submit',
  label: 'Submit',
  variant: 'primary',
  dimWhenBlocked: true,
  use: (context) => ({ visible: context.last, onPress: context.submit }),
});

/**
 * A flexible gap for the footer, so the trailing buttons sit against the
 * trailing edge whether or not `Questionnaire.Back` is showing.
 */
function QuestionnaireSpacer({ className, ...props }: ViewProps) {
  return <View className={cn('flex-1', className)} {...props} />;
}
QuestionnaireSpacer.displayName = 'Questionnaire.Spacer';

export const Questionnaire = Object.assign(QuestionnaireRoot, {
  Title: QuestionnaireTitle,
  Progress: QuestionnaireProgress,
  Item: QuestionnaireItem,
  Question: QuestionnaireQuestion,
  Description: QuestionnaireDescription,
  Choices: QuestionnaireChoices,
  Choice: QuestionnaireChoice,
  Input: QuestionnaireInput,
  Error: QuestionnaireError,
  Footer: QuestionnaireFooter,
  Spacer: QuestionnaireSpacer,
  Back: QuestionnaireBack,
  Skip: QuestionnaireSkip,
  Next: QuestionnaireNext,
  Submit: QuestionnaireSubmit,
});
