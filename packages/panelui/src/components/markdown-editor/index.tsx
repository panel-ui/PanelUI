/**
 * MarkdownEditor — a field for writing markdown, and a way to see it rendered.
 *
 * ```tsx
 * const [draft, setDraft] = useState('');
 *
 * <MarkdownEditor value={draft} onValueChange={setDraft} rows={12} />
 * ```
 *
 * ## Writing and reading are two modes, not two panes
 *
 * Side by side is how this is done on a desktop, and it does not survive the
 * trip to a phone: two columns of a phone's width are two columns too narrow to
 * read, and the keyboard covers the bottom half of the screen exactly when the
 * writer is using it. So there is one pane and a switch — write, or read what
 * you wrote. The toolbar carries the switch, because the toolbar is the one
 * thing on screen in both modes.
 *
 * ## The toolbar edits the selection
 *
 * Every button here is a function of the text and where the caret is in it, and
 * the answer that matters is not which characters get inserted but where the
 * caret lands afterwards. Bolding a selected phrase leaves it selected, so it
 * can be italicised next; bolding nothing puts the caret between the new
 * markers, where the writing is about to go; and pressing the same button again
 * takes the markers off. Those rules live in `markdown-transforms.ts` as pure
 * functions over `(text, selection)`, away from anything to do with a field.
 *
 * ## Why it renders through Response
 *
 * The preview is `Response`, the same reader that renders a model's answer, so
 * markdown means the same thing everywhere in the library and there is one
 * parser to be right rather than two to keep in step. It renders through
 * `Typography`, `CodeBlock` and `Table`, which is to say through the app's own
 * type and colours — a preview that looked like a document viewer would be
 * showing the writer something they are not going to ship.
 *
 * Nothing here reaches for a platform markdown renderer. `Text` in SwiftUI can
 * parse markdown and Jetpack Compose's cannot, so a platform-backed editor
 * would render on one of the two and be a plain string on the other.
 *
 * Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
import {
  Fragment,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  View,
  type NativeSyntheticEvent,
  type TextInput,
  type ViewProps,
} from 'react-native';
import { tv } from 'tailwind-variants';
import {
  BoldIcon,
  CodeIcon,
  EyeIcon,
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PencilIcon,
  QuoteIcon,
} from '../../icons';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Button } from '../button';
import { ButtonGroup } from '../button-group';
import { Response } from '../response';
import { Textarea, type TextareaProps } from '../textarea';
import {
  continueList,
  hasFence,
  hasLinePrefix,
  hasOrderedList,
  hasWrap,
  insertImage,
  insertLink,
  toggleFence,
  toggleLinePrefix,
  toggleOrderedList,
  toggleWrap,
  type EditResult,
  type EditorSelection,
} from './markdown-transforms';
import type { SelectionChangeEvent, TextInputRef, ViewRef } from '../../primitives/refs';

export type { EditorSelection, EditResult } from './markdown-transforms';

/** Which pane the editor is showing. */
export type MarkdownEditorMode = 'write' | 'preview';

/** A formatting action the toolbar can offer. */
export type MarkdownEditorAction =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'quote'
  | 'code'
  | 'bulletList'
  | 'orderedList'
  | 'link'
  | 'image';

/** The actions a toolbar shows when it is not told which to show. */
const DEFAULT_ACTIONS: MarkdownEditorAction[] = [
  'bold',
  'italic',
  'heading',
  'bulletList',
  'orderedList',
  'quote',
  'code',
  'link',
];

/**
 * The same actions in the capsule, grouped.
 *
 * Eight rather than nine: the capsule is a fixed row of targets with hairlines
 * between its groups, and `quote` is the one a writer reaches for least. It is
 * still available — pass `actions` and it appears in whatever grouping the
 * families below produce.
 */
const DEFAULT_PILL_ACTIONS: MarkdownEditorAction[] = [
  'bold',
  'italic',
  'heading',
  'link',
  'image',
  'orderedList',
  'bulletList',
  'code',
];

/**
 * Which family each action belongs to, which is what the capsule's hairlines
 * separate: what the words look like, what is being put into the document, and
 * what shape the block is.
 */
const FAMILY: Record<MarkdownEditorAction, 'inline' | 'insert' | 'block'> = {
  bold: 'inline',
  italic: 'inline',
  heading: 'inline',
  link: 'insert',
  image: 'insert',
  orderedList: 'insert',
  bulletList: 'insert',
  code: 'block',
  quote: 'block',
};

/**
 * What each action does, what it is called, and what it looks like.
 *
 * One table rather than a switch in the toolbar and another in the context:
 * adding an action should be adding a row here, and nowhere else.
 */
const ACTIONS: Record<
  MarkdownEditorAction,
  {
    label: string;
    icon: (size: number) => ReactNode;
    apply: (text: string, selection: EditorSelection) => EditResult;
    /**
     * Whether this action is already in effect where the caret is.
     *
     * The toolbar marks those buttons, which is what makes "pressing twice
     * undoes it" visible rather than something the writer has to discover. An
     * action that only ever inserts — a link, an image — has no such state and
     * says so by leaving this out.
     */
    isActive?: (text: string, selection: EditorSelection) => boolean;
  }
> = {
  bold: {
    label: 'Bold',
    icon: (size) => <BoldIcon size={size} />,
    apply: (text, selection) => toggleWrap(text, selection, '**'),
    isActive: (text, selection) => hasWrap(text, selection, '**'),
  },
  italic: {
    label: 'Italic',
    icon: (size) => <ItalicIcon size={size} />,
    apply: (text, selection) => toggleWrap(text, selection, '_'),
    isActive: (text, selection) => hasWrap(text, selection, '_'),
  },
  heading: {
    label: 'Heading',
    icon: (size) => <HeadingIcon size={size} />,
    apply: (text, selection) => toggleLinePrefix(text, selection, '## '),
    isActive: (text, selection) => hasLinePrefix(text, selection, '## '),
  },
  quote: {
    label: 'Quote',
    icon: (size) => <QuoteIcon size={size} />,
    apply: (text, selection) => toggleLinePrefix(text, selection, '> '),
    isActive: (text, selection) => hasLinePrefix(text, selection, '> '),
  },
  code: {
    label: 'Code block',
    icon: (size) => <CodeIcon size={size} />,
    apply: toggleFence,
    isActive: hasFence,
  },
  bulletList: {
    label: 'Bulleted list',
    icon: (size) => <ListIcon size={size} />,
    apply: (text, selection) => toggleLinePrefix(text, selection, '- '),
    isActive: (text, selection) => hasLinePrefix(text, selection, '- '),
  },
  orderedList: {
    label: 'Numbered list',
    icon: (size) => <ListOrderedIcon size={size} />,
    apply: toggleOrderedList,
    isActive: hasOrderedList,
  },
  link: {
    label: 'Link',
    icon: (size) => <LinkIcon size={size} />,
    apply: insertLink,
  },
  image: {
    label: 'Image',
    icon: (size) => <ImageIcon size={size} />,
    apply: insertImage,
  },
};

const markdownEditorVariants = tv({
  slots: {
    root: 'w-full gap-2',
    toolbar: 'flex-row items-center justify-between gap-2',
    /**
     * The capsule holding the formatting buttons in the `pill` toolbar.
     *
     * `shrink` and `overflow-hidden` are load-bearing. Eight 36pt targets, two
     * hairlines and the round button beside them come to more than a phone is
     * wide, and a row that cannot shrink does not wrap — it runs off the edge
     * of the screen taking the last two actions with it. The capsule gives up
     * width instead, and scrolls whatever no longer fits.
     */
    capsule:
      'min-w-0 shrink flex-row items-center overflow-hidden rounded-full border border-input bg-popover px-1.5 shadow-lg',
    /** One hairline between two groups of them. */
    divider: 'mx-1 h-5 w-px bg-border',
    /** The round button outside the capsule, which switches the pane. */
    escape:
      'h-11 w-11 shrink-0 items-center justify-center rounded-full border border-input bg-popover shadow-lg',
    // The preview stands in the field's place, so it takes the field's shape.
    // A rendered draft that sat on the page with no edge around it would not
    // read as the same object the writing was in.
    preview: 'w-full rounded-xl border border-input bg-popover px-3 py-2.5',
    empty: 'py-6 text-center',
  },
  variants: {
    /**
     * How the toolbar is drawn.
     *
     * `bar` is the row: formatting on one side, the write/preview switch on the
     * other, and room between them for a word count or a submit. `pill` is the
     * floating capsule — icon-only, grouped by hairlines, with the pane switch
     * as a round button beside it. The capsule has no room for anything else,
     * so a toolbar with children wants the bar.
     */
    variant: {
      bar: {},
      pill: { toolbar: 'justify-center gap-2' },
    },
  },
  defaultVariants: { variant: 'bar' },
});

export type MarkdownEditorToolbarVariant = 'bar' | 'pill';

interface MarkdownEditorContextValue {
  value: string;
  mode: MarkdownEditorMode;
  setMode: (mode: MarkdownEditorMode) => void;
  /** Runs a transform against the live text and selection. */
  run: (action: MarkdownEditorAction) => void;
  /**
   * Which actions are already in effect where the caret is. Recomputed when
   * the caret moves rather than on every keystroke — the toolbar is the only
   * thing that reads it, and it has eight buttons.
   */
  active: ReadonlySet<MarkdownEditorAction>;
  /** What the field should be showing as selected, once, after an edit. */
  pending: EditorSelection | undefined;
  setSelection: (selection: EditorSelection) => void;
  clearPending: () => void;
  onChangeText: (next: string) => void;
  /** Registers the field, so the root's ref can focus it. */
  registerField: (field: TextInputRef | null) => void;
  disabled: boolean;
}

const MarkdownEditorContext = createContext<MarkdownEditorContextValue | null>(null);

function useMarkdownEditor(part: string): MarkdownEditorContextValue {
  const ctx = useContext(MarkdownEditorContext);
  if (!ctx) throw new Error(`${part} must be used inside <MarkdownEditor>.`);
  return ctx;
}

/**
 * What a `ref` on the editor gives you.
 *
 * The same transforms the toolbar runs, so a caller drawing their own controls
 * — a keyboard accessory, a context menu, a single Bold button somewhere else
 * on the screen — does not have to reimplement any of them. Every one applies
 * to the live selection and leaves the caret where the toolbar would.
 */
export interface MarkdownEditorHandle {
  /** The container, for measuring and for anything a `View` ref is good for. */
  readonly view: ViewRef | null;
  /** Runs one of the toolbar's actions against the current selection. */
  apply: (action: MarkdownEditorAction) => void;
  /** Which actions are already in effect where the caret is. */
  getActive: () => MarkdownEditorAction[];
  /** Where the caret is, or what is selected. */
  getSelection: () => EditorSelection;
  /** Moves the caret, or selects a range. */
  setSelection: (selection: EditorSelection) => void;
  /** Puts the caret in the field. Switches to the writing pane if it is not up. */
  focus: () => void;
  blur: () => void;
  /** Switches pane. */
  setMode: (mode: MarkdownEditorMode) => void;
}

export interface MarkdownEditorProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** Controlled text. Leave unset and pass `defaultValue` to run uncontrolled. */
  value?: string;
  /** Starting text when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Controlled pane. */
  mode?: MarkdownEditorMode;
  /** Starting pane when uncontrolled. */
  defaultMode?: MarkdownEditorMode;
  onModeChange?: (mode: MarkdownEditorMode) => void;
  /**
   * Stop the field being edited and the formatting actions being pressed. The
   * switch between the panes stays live: a draft nobody may edit is still a
   * draft somebody may want to read rendered.
   */
  disabled?: boolean;
  /**
   * The parts, in the order they should stack. Left out, the editor draws its
   * toolbar, its field and its preview in that order — which is the whole
   * component, and the reason it usually needs no children.
   */
  children?: ReactNode;
  /** Forwarded to the field when the editor draws its own. */
  placeholder?: string;
  /** Height of the field, in lines. Forwarded to the field the editor draws. */
  rows?: number;
  /**
   * Lift the editor above the keyboard. Forwarded to the field the editor
   * draws, and off by default because it changes which component renders the
   * container — so it cannot be toggled at runtime without remounting the
   * field and dropping focus.
   */
  avoidKeyboard?: boolean;
  /**
   * Continue a list when Return is pressed inside one, and end it when Return
   * is pressed on an item with nothing in it. On by default: a list that stops
   * numbering itself after the first item is a list the writer finishes by
   * hand.
   */
  continueLists?: boolean;
}

const MarkdownEditorRoot = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  (
    {
      className,
      value: valueProp,
      defaultValue = '',
      onValueChange,
      mode: modeProp,
      defaultMode = 'write',
      onModeChange,
      disabled = false,
      children,
      placeholder,
      rows,
      avoidKeyboard,
      continueLists = true,
      ...props
    },
    ref
  ) => {
    const slots = markdownEditorVariants();
    const viewRef = useRef<ViewRef>(null);
    const fieldRef = useRef<TextInputRef | null>(null);

    const [internalValue, setInternalValue] = useState(defaultValue);
    const value = valueProp ?? internalValue;

    const [internalMode, setInternalMode] = useState<MarkdownEditorMode>(defaultMode);
    const mode = modeProp ?? internalMode;

    /*
     * The live selection is a ref rather than state.
     *
     * It changes on every caret move — every keystroke, every tap in the text —
     * and nothing on screen depends on it. Holding it in state would re-render
     * the field, and therefore the preview under it, once per character typed.
     */
    const selectionRef = useRef<EditorSelection>({ start: 0, end: 0 });

    /*
     * What the field should show as selected after a toolbar edit, held for
     * exactly one render.
     *
     * A `selection` prop that stays set is a field the writer cannot move the
     * caret in — every tap would be pulled back to wherever the last edit put
     * it. So it is set once, applied, and cleared by the very selection change
     * it causes.
     */
    const [pending, setPending] = useState<EditorSelection | undefined>(undefined);

    const valueRef = useRef(value);
    valueRef.current = value;

    const commit = useCallback(
      (next: string) => {
        if (valueProp === undefined) setInternalValue(next);
        onValueChange?.(next);
      },
      [valueProp, onValueChange]
    );

    const setMode = useCallback(
      (next: MarkdownEditorMode) => {
        if (modeProp === undefined) setInternalMode(next);
        onModeChange?.(next);
      },
      [modeProp, onModeChange]
    );

    /*
     * Which actions are already in effect, held in state because the toolbar
     * draws from it.
     *
     * Recomputed when the caret moves or the text changes through an edit, not
     * on every keystroke: eight predicates over the whole document on every
     * character typed is work nobody asked for, and typing a letter cannot
     * change what is applied at the caret. Toggling a marker can, which is why
     * `run` recomputes it too.
     */
    const [active, setActive] = useState<ReadonlySet<MarkdownEditorAction>>(
      () => new Set()
    );

    const readActive = useCallback((text: string, selection: EditorSelection) => {
      const next = new Set<MarkdownEditorAction>();
      for (const key of Object.keys(ACTIONS) as MarkdownEditorAction[]) {
        if (ACTIONS[key].isActive?.(text, selection)) next.add(key);
      }
      setActive((current) =>
        current.size === next.size && [...next].every((key) => current.has(key))
          ? current
          : next
      );
    }, []);

    const run = useCallback(
      (action: MarkdownEditorAction) => {
        const result = ACTIONS[action].apply(valueRef.current, selectionRef.current);
        // Kept locally too: the parent may be slow to hand the new text back,
        // and the next press must not be computed against the old string.
        valueRef.current = result.text;
        selectionRef.current = result.selection;
        commit(result.text);
        setPending(result.selection);
        readActive(result.text, result.selection);
      },
      [commit, readActive]
    );

    /*
     * A list continues itself when Return lands inside one.
     *
     * Read off the text change rather than off `onKeyPress`, because a key
     * event here cannot be prevented — the field applies the newline whatever
     * the handler does, so acting on the key would insert the marker *and* a
     * second line break. Watching the change instead means the newline is
     * already in the string, and what happens is a rewrite of it: the marker
     * goes in behind it, or, on an item with nothing in it, the marker comes
     * off and the list ends.
     *
     * One inserted character only. A paste that happens to contain a newline
     * is not somebody pressing Return.
     */
    const applyChange = useCallback(
      (next: string) => {
        const previous = valueRef.current;

        if (continueLists && next.length === previous.length + 1) {
          let at = 0;
          while (at < previous.length && previous[at] === next[at]) at += 1;

          if (next[at] === '\n') {
            const result = continueList(previous, { start: at, end: at });
            if (result) {
              valueRef.current = result.text;
              selectionRef.current = result.selection;
              commit(result.text);
              setPending(result.selection);
              readActive(result.text, result.selection);
              return;
            }
          }
        }

        valueRef.current = next;
        commit(next);
      },
      [continueLists, commit, readActive]
    );

    const registerField = useCallback((field: TextInputRef | null) => {
      fieldRef.current = field;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        get view() {
          return viewRef.current;
        },
        apply: run,
        getActive: () => [...active],
        getSelection: () => ({ ...selectionRef.current }),
        setSelection: (selection) => {
          selectionRef.current = selection;
          setPending(selection);
          readActive(valueRef.current, selection);
        },
        focus: () => {
          // The field is unmounted while the preview is up, so focusing it has
          // to bring it back first — otherwise this is a silent no-op that
          // looks like a broken ref.
          setMode('write');
          fieldRef.current?.focus();
        },
        blur: () => fieldRef.current?.blur(),
        setMode,
      }),
      [run, active, readActive, setMode]
    );

    const context = useMemo<MarkdownEditorContextValue>(
      () => ({
        value,
        mode,
        setMode,
        run,
        active,
        pending,
        setSelection: (selection) => {
          selectionRef.current = selection;
          readActive(valueRef.current, selection);
        },
        clearPending: () => setPending(undefined),
        onChangeText: applyChange,
        registerField,
        disabled,
      }),
      [value, mode, setMode, run, active, pending, applyChange, readActive, registerField, disabled]
    );

    return (
      <MarkdownEditorContext.Provider value={context}>
        <View ref={viewRef} className={slots.root({ className })} {...props}>
          {children ?? (
            <>
              <MarkdownEditorToolbar />
              <MarkdownEditorInput
                placeholder={placeholder}
                rows={rows}
                avoidKeyboard={avoidKeyboard}
              />
              <MarkdownEditorPreview />
            </>
          )}
        </View>
      </MarkdownEditorContext.Provider>
    );
  }
);

MarkdownEditorRoot.displayName = 'MarkdownEditor';

/* -------------------------------------------------------------------------- *
 * Toolbar
 * -------------------------------------------------------------------------- */

export interface MarkdownEditorToolbarProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * How the toolbar is drawn. `bar` is the full-width row, with room on it for
   * a word count or a submit. `pill` is the floating capsule: icon-only,
   * grouped by hairlines, with the pane switch as a round button beside it.
   */
  variant?: MarkdownEditorToolbarVariant;
  /**
   * Which formatting actions to offer, in the order given. The capsule groups
   * whatever it is given by family — what the words look like, what is being
   * put into the document, what shape the block is — and draws a hairline
   * where the family changes.
   */
  actions?: MarkdownEditorAction[];
  /**
   * Show the write/preview switch. On by default — a preview nobody can reach
   * is a pane that does not exist.
   */
  showModeSwitch?: boolean;
  /**
   * Anything else to put on the row: a word count, a save state, a submit.
   * The capsule has no room for these, so a toolbar with children wants `bar`.
   */
  children?: ReactNode;
}

/**
 * The formatting actions, and the switch between writing and reading.
 *
 * The formatting run is hidden rather than disabled while previewing. Its
 * buttons act on a selection, and in the preview there is no selection for them
 * to act on — a row of controls that are present but inert is a row that has to
 * be tried before it can be understood.
 *
 * An action already in effect where the caret is draws as pressed. Every button
 * here is a toggle, and a toggle that looks the same in both states is a toggle
 * nobody discovers is one.
 */
const MarkdownEditorToolbar = forwardRef<ViewRef, MarkdownEditorToolbarProps>(
  (
    {
      className,
      variant = 'bar',
      actions,
      showModeSwitch = true,
      children,
      ...props
    },
    ref
  ) => {
    const { mode, setMode, run, active, disabled } = useMarkdownEditor(
      'MarkdownEditor.Toolbar'
    );
    const slots = markdownEditorVariants({ variant });
    const pill = variant === 'pill';
    const shown = actions ?? (pill ? DEFAULT_PILL_ACTIONS : DEFAULT_ACTIONS);

    const button = (action: MarkdownEditorAction, size: number) => (
      <Button
        key={action}
        accessibilityLabel={ACTIONS[action].label}
        accessibilityState={{ selected: active.has(action) }}
        variant={active.has(action) ? 'secondary' : 'ghost'}
        disabled={disabled}
        onPress={() => run(action)}
        className={pill ? 'h-9 w-9 rounded-full px-0' : 'px-2'}
      >
        {ACTIONS[action].icon(size)}
      </Button>
    );

    if (pill) {
      return (
        <View ref={ref} className={slots.toolbar({ className })} {...props}>
          {mode === 'write' ? (
            <View className={slots.capsule()}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerClassName="flex-row items-center"
              >
                {shown.map((action, index) => (
                  <Fragment key={action}>
                    {/* A hairline wherever the family changes, and nowhere
                        else: a divider between every pair is eight dividers,
                        which is a row of eight separate things rather than
                        three groups. */}
                    {index > 0 && FAMILY[action] !== FAMILY[shown[index - 1]!] ? (
                      <View className={slots.divider()} />
                    ) : null}
                    {button(action, 18)}
                  </Fragment>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {showModeSwitch ? (
            /* Outside the capsule, and round rather than a segment of it. The
               capsule is what the writing is done with; this is the way out of
               it, and a control that leaves somewhere should not look like one
               of the things you do while you are there. */
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'write' ? 'Preview' : 'Write'}
              accessibilityState={{ selected: mode === 'preview' }}
              className={slots.escape()}
              onPress={() => setMode(mode === 'write' ? 'preview' : 'write')}
            >
              {mode === 'write' ? <EyeIcon size={18} /> : <PencilIcon size={18} />}
            </Pressable>
          ) : null}
        </View>
      );
    }

    return (
      <View ref={ref} className={slots.toolbar({ className })} {...props}>
        {mode === 'write' ? (
          <ButtonGroup variant="ghost" size="sm" className="shrink">
            {shown.map((action) => button(action, 16))}
          </ButtonGroup>
        ) : (
          <View className="shrink" />
        )}

        <View className="flex-row items-center gap-2">
          {children}
          {showModeSwitch ? (
            <ButtonGroup size="sm">
              <Button
                variant={mode === 'write' ? 'secondary' : 'ghost'}
                startContent={<PencilIcon size={14} />}
                onPress={() => setMode('write')}
              >
                Write
              </Button>
              <Button
                variant={mode === 'preview' ? 'secondary' : 'ghost'}
                startContent={<EyeIcon size={14} />}
                onPress={() => setMode('preview')}
              >
                Preview
              </Button>
            </ButtonGroup>
          ) : null}
        </View>
      </View>
    );
  }
);

MarkdownEditorToolbar.displayName = 'MarkdownEditor.Toolbar';

/* -------------------------------------------------------------------------- *
 * Input
 * -------------------------------------------------------------------------- */

export interface MarkdownEditorInputProps
  extends Omit<TextareaProps, 'value' | 'onChangeText' | 'defaultValue'> {
  className?: string;
}

/**
 * The field the markdown is written in — a `Textarea`, tracking its selection.
 *
 * Renders nothing while the preview is up. Unmounted rather than hidden: a
 * field kept alive behind the preview keeps the keyboard up with it.
 */
const MarkdownEditorInput = forwardRef<TextInputRef, MarkdownEditorInputProps>(
  ({ className, rows = 8, ...props }, ref) => {
    const {
      value,
      mode,
      pending,
      setSelection,
      clearPending,
      onChangeText,
      registerField,
      disabled,
    } = useMarkdownEditor('MarkdownEditor.Input');

    /*
     * The field is registered so the editor's own ref can focus it, and
     * forwarded so a caller's ref still works. Both, rather than either.
     */
    const attach = useCallback(
      (field: TextInputRef | null) => {
        registerField(field);
        if (typeof ref === 'function') ref(field);
        else if (ref) ref.current = field;
      },
      [ref, registerField]
    );

    /*
     * The forced selection is cleared only once it has actually arrived.
     *
     * Clearing on the first selection change of any kind was the bug: the new
     * `value` landing produces one of its own, and it fires first — so the
     * caret was released before it had been put anywhere, and ended up at the
     * end of the document instead of between the markers just inserted.
     */
    const handleSelectionChange = useCallback(
      (event: SelectionChangeEvent) => {
        const { selection } = event.nativeEvent;
        setSelection(selection);
        if (
          pending &&
          selection.start === pending.start &&
          selection.end === pending.end
        ) {
          clearPending();
        }
      },
      [setSelection, clearPending, pending]
    );

    if (mode !== 'write') return null;

    return (
      <Textarea
        ref={attach}
        value={value}
        onChangeText={onChangeText}
        selection={pending}
        onSelectionChange={handleSelectionChange}
        disabled={disabled}
        rows={rows}
        autoCapitalize="none"
        autoCorrect={false}
        // A markdown source is code as much as it is prose: an editor that
        // capitalises the word after a fence, or rewrites a dash into an
        // en dash, is an editor that changes what the document renders as.
        className={cn('font-mono', className)}
        {...props}
      />
    );
  }
);

MarkdownEditorInput.displayName = 'MarkdownEditor.Input';

/* -------------------------------------------------------------------------- *
 * Preview
 * -------------------------------------------------------------------------- */

export interface MarkdownEditorPreviewProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** What to show when there is nothing written yet. */
  emptyText?: string;
}

/**
 * The draft, rendered.
 *
 * Renders nothing while the field is up, which is what makes the two one pane
 * rather than two.
 */
const MarkdownEditorPreview = forwardRef<ViewRef, MarkdownEditorPreviewProps>(
  ({ className, emptyText = 'Nothing to preview yet.', ...props }, ref) => {
    const { value, mode } = useMarkdownEditor('MarkdownEditor.Preview');
    const slots = markdownEditorVariants();

    if (mode !== 'preview') return null;

    return (
      <View ref={ref} className={slots.preview({ className })} {...props}>
        {value.trim() ? (
          <Response>{value}</Response>
        ) : (
          <Text size="sm" muted className={slots.empty()}>
            {emptyText}
          </Text>
        )}
      </View>
    );
  }
);

MarkdownEditorPreview.displayName = 'MarkdownEditor.Preview';

export const MarkdownEditor = Object.assign(MarkdownEditorRoot, {
  Toolbar: MarkdownEditorToolbar,
  Input: MarkdownEditorInput,
  Preview: MarkdownEditorPreview,
});
