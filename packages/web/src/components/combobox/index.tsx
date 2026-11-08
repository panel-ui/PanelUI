'use client';

/**
 * Combobox — a text field that filters a list of options as you type.
 *
 * ```tsx
 * <Combobox value={framework} onValueChange={setFramework} clearable>
 *   <Combobox.Item value="expo" label="Expo" />
 *   <Combobox.Item value="next" label="Next.js" />
 * </Combobox>
 * ```
 *
 * ## Where the typing happens
 *
 * A Select is a button that opens a list, and its optional filter lives inside
 * that list once it opens. A Combobox is the field itself: the options appear
 * while you are already typing, which is what you want when the value is
 * something you know the name of — a city, a repository, a tag — rather than
 * something you expect to recognise by scrolling.
 *
 * ## One value or several
 *
 * `mode="multiple"` draws the chosen options as removable chips in front of
 * the input and keeps the list open between picks. The value is an array in
 * that mode and a single string otherwise, so the type follows the mode.
 *
 * ## Filtering is yours to turn off
 *
 * Filtering happens here by default, matching case-insensitively on any part
 * of an option's label. Pass a function to `filter` to match on something
 * else. Pass `filter={false}` when a server is doing the matching: the options
 * are then shown exactly as given, because a second filter over results the
 * field cannot see the query behind would only remove correct answers.
 *
 * ## Values it does not know about
 *
 * `allowCustomValue` lets the typed text become the value when it matches no
 * option, committed on Enter. The list becomes a set of suggestions rather
 * than the set of legal answers, which is what a tag field is.
 *
 * ## Two presentations
 *
 * `overlay` (the default) floats the list above the page, anchored under the
 * field and flipped above it when there is no room below. `inline` expands the
 * list in normal layout flow instead, which is right in a form where nothing
 * should be covered.
 */
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';
import { Spinner } from '../spinner';

const comboboxVariants = tv({
  slots: {
    root: 'w-full',
    field: [
      'group/combobox flex w-full cursor-text flex-wrap items-center gap-2 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs',
      'transition-[border-color,box-shadow] duration-150',
      'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30',
      'has-disabled:cursor-not-allowed has-disabled:opacity-50 dark:bg-input/30',
    ],
    content: 'flex min-w-0 flex-1 flex-wrap items-center gap-1.5',
    input: [
      'h-7 min-w-24 flex-1 bg-transparent text-sm text-foreground outline-none',
      'placeholder:text-muted-foreground/80 selection:bg-primary selection:text-primary-foreground',
      'disabled:cursor-not-allowed',
    ],
    chip: [
      'inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-accent px-2 text-xs font-medium text-accent-foreground outline-none',
      'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background',
      'data-disabled:opacity-50',
    ],
    chipRemove: [
      'relative -me-1 inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none',
      'hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
      '[&_svg]:size-3',
      // A target larger than the mark, without moving the chip.
      "after:absolute after:-inset-1.5 after:content-['']",
    ],
    action: [
      'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none',
      'transition-[background-color,color,scale] duration-150 hover:bg-accent hover:text-foreground active:scale-90',
      'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
      'motion-reduce:transition-none motion-reduce:active:scale-100',
      '[&_svg:not([class*=size-])]:size-4',
    ],
    chevron: 'transition-transform duration-200 motion-reduce:transition-none',
    positioner: 'z-50 outline-none',
    popup: [
      'max-h-[min(20rem,var(--available-height))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none',
      'origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-out',
      'data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
      'motion-reduce:transition-none',
    ],
    inline: 'mt-2 max-h-80 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-sm',
    list: 'max-h-80 scroll-py-1 overflow-y-auto overscroll-contain p-1.5 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
    item: [
      'flex min-h-10 cursor-default items-center gap-2.5 rounded-lg px-3 py-2 outline-none select-none',
      'data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:bg-accent',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ],
    itemStart: 'flex size-5 shrink-0 items-center justify-center [&_svg:not([class*=size-])]:size-4',
    itemContent: 'flex min-w-0 flex-1 flex-col',
    itemLabel: 'truncate text-sm font-medium',
    itemDescription: 'truncate text-xs text-muted-foreground',
    // The box is always there, so an option does not change width as it is chosen.
    indicator: 'flex size-5 shrink-0 items-center justify-center text-foreground [&_svg:not([class*=size-])]:size-4',
    group: 'flex flex-col gap-0.5',
    groupLabel: 'px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground',
    empty: 'px-3 py-6 text-center text-sm text-muted-foreground',
    status: 'flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground',
  },
});

/** How the list is presented. */
export type ComboboxPresentation = 'overlay' | 'inline';

/** Which selection shape a `mode` produces. */
export type ComboboxMode = 'single' | 'multiple';

/** The value shape each mode produces. */
export interface ComboboxSelection {
  single: string | undefined;
  multiple: string[];
}

/** One option, declared as a child of `Combobox`. */
export interface ComboboxItemProps {
  /** Identifies the option; what `value` and `onValueChange` carry. */
  value: string;
  /** What is shown, and what the default filter matches on. */
  label: string;
  /**
   * Shows the option but refuses it. Kept in the list rather than dropped from
   * it, because an option that vanishes reads as one that never existed.
   */
  disabled?: boolean;
  /** Anything to draw before the label — an avatar, a flag, a status dot. */
  start?: ReactNode;
  /** A second line under the label, for what the label alone cannot say. */
  description?: ReactNode;
  /** Extra classes for this option. */
  className?: string;
}

/** A titled run of options. */
export interface ComboboxGroupProps {
  /**
   * Heading over the run of options. Announced as a group label, so a screen
   * reader reaching the group is told what it is before walking into it.
   */
  label?: string;
  /** Extra classes for the group wrapper. */
  className?: string;
  /** Extra classes for the heading. */
  labelClassName?: string;
  children: ReactNode;
}

/**
 * Declarative option. `Combobox` reads it from its children and renders it in
 * whichever surface is presenting; it is never rendered on its own.
 */
function ComboboxItem(_props: ComboboxItemProps): never {
  throw new Error('Combobox.Item must be used within a <Combobox>');
}
ComboboxItem.displayName = 'Combobox.Item';

/**
 * A titled run of options. Presentational only: a grouped Combobox reports the
 * same values a flat one would, and `Combobox.Item` needs to know nothing
 * about being inside one.
 */
function ComboboxGroup(_props: ComboboxGroupProps): never {
  throw new Error('Combobox.Group must be used within a <Combobox>');
}
ComboboxGroup.displayName = 'Combobox.Group';

export interface ComboboxProps<Mode extends ComboboxMode = 'single'>
  extends Omit<ComponentProps<'div'>, 'children' | 'defaultValue' | 'onChange' | 'onInput'> {
  /** One value or several. `multiple` draws the chosen options as chips and keeps the list open. */
  mode?: Mode;
  /** Controlled selection. Its shape follows `mode`. */
  value?: ComboboxSelection[Mode];
  /** Starting selection when uncontrolled. */
  defaultValue?: ComboboxSelection[Mode];
  /** Called with the next selection, whose shape follows `mode`. */
  onValueChange?: (value: ComboboxSelection[Mode]) => void;
  /**
   * Controlled query — the text actually in the field. Pair it with
   * `onInputValueChange` when the options are fetched for it.
   */
  inputValue?: string;
  /** Starting query when uncontrolled. */
  defaultInputValue?: string;
  /** Called with the typed text. */
  onInputValueChange?: (value: string) => void;
  /** What the field says while empty. Default `Search`. */
  placeholder?: string;
  /** Whether the field and its list are unavailable. */
  disabled?: boolean;
  /** Where the options appear. Default `overlay`. */
  presentation?: ComboboxPresentation;
  /**
   * Narrow the options to the query here. `true` matches case-insensitively on
   * any part of an option's label; pass a function to match on something else.
   *
   * Pass `false` when a server is doing the matching: the options you render
   * are then shown exactly as given.
   */
  filter?: boolean | ((option: ComboboxItemProps, query: string) => boolean);
  /**
   * Let the typed text become the value when it matches no option, committed
   * on Enter. Turns the list into a set of suggestions rather than the set of
   * legal answers.
   */
  allowCustomValue?: boolean;
  /** Show a spinner in place of the list. For options still being fetched. */
  loading?: boolean;
  /** Shown in place of the list when nothing matches. Default `No matches`. */
  emptyMessage?: string;
  /** Shown in place of the list while `loading`. Default `Searching`. */
  loadingMessage?: string;
  /** Offer a ✕ that clears the query and the selection. */
  clearable?: boolean;
  /** Open the list as soon as the field takes focus. */
  openOnFocus?: boolean;
  /** Called when the list opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Width of the floating list. `field` matches the field, `content` sizes to
   * the longest option, or pass a pixel value. `overlay` only.
   */
  contentWidth?: 'field' | 'content' | number;
  /** Gap between the field and the floating list, in pixels. Default `8`. */
  offset?: number;
  /** Extra classes for the list surface. */
  listClassName?: string;
  /** Accessible name for the field. */
  accessibilityLabel?: string;
  /** The input's id, so a `<label htmlFor>` can name it. */
  id?: string;
  /** Form field name, so the value is sent with the form. */
  name?: string;
  /** The form the field belongs to. */
  form?: string;
  /** Whether the field must have a value before the form can be sent. */
  required?: boolean;
  /** Where in the document an overlay list is put. Default `document.body`. */
  container?: BaseCombobox.Portal.Props['container'];
  children: ReactNode;
}

interface OptionData {
  value: string;
  label: string;
  disabled?: boolean;
  start?: ReactNode;
  description?: ReactNode;
  className?: string;
}

interface GroupData {
  /** A key for the group; unique within the list. */
  key: string;
  label?: string;
  items: OptionData[];
  className?: string;
  labelClassName?: string;
}

interface ItemModel {
  data: OptionData[] | GroupData[];
  grouped: boolean;
  options: OptionData[];
}

/**
 * Walk the declared children into the flat or grouped shape the primitive
 * filters and renders.
 *
 * Loose options become one unlabelled group when anything on the list is
 * grouped, so the rendering surface has a single shape to handle without
 * changing the order the reader wrote.
 */
function readItems(children: ReactNode): ItemModel {
  const options: OptionData[] = [];
  const groups: GroupData[] = [];
  let loose: OptionData[] = [];
  let grouped = false;

  const flush = () => {
    if (loose.length === 0) return;
    groups.push({ key: `loose-${groups.length}`, items: loose });
    options.push(...loose);
    loose = [];
  };

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;

    if (child.type === ComboboxGroup) {
      const props = child.props as ComboboxGroupProps;
      const items: OptionData[] = [];
      Children.forEach(props.children, (nested) => {
        if (!isValidElement(nested) || nested.type !== ComboboxItem) return;
        items.push((nested.props as ComboboxItemProps) as OptionData);
      });
      if (items.length === 0) return;
      flush();
      grouped = true;
      groups.push({
        key: `group-${index}-${props.label ?? ''}`,
        label: props.label,
        items,
        className: props.className,
        labelClassName: props.labelClassName,
      });
      options.push(...items);
      return;
    }

    if (child.type === ComboboxItem) {
      const option = child.props as ComboboxItemProps as OptionData;
      options.push(option);
      if (grouped) groups.push({ key: `loose-${index}`, items: [option] });
      else loose.push(option);
    }
  });

  if (!grouped) {
    return { data: options, grouped: false, options };
  }

  flush();
  return { data: groups, grouped: true, options };
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ComboboxRoot<Mode extends ComboboxMode = 'single'>(allProps: ComboboxProps<Mode>) {
  const {
    className,
    mode,
    value,
    defaultValue,
    onValueChange,
    inputValue,
    defaultInputValue,
    onInputValueChange,
    placeholder = 'Search',
    disabled = false,
    presentation = 'overlay',
    filter = true,
    allowCustomValue = false,
    loading = false,
    emptyMessage = 'No matches',
    loadingMessage = 'Searching',
    clearable = false,
    openOnFocus = false,
    onOpenChange,
    contentWidth = 'field',
    offset = 8,
    listClassName,
    accessibilityLabel,
    id,
    name,
    form,
    required,
    container,
    children,
    ...props
  } = allProps;

  // An explicit `undefined` is still a controlled value: a parent clearing a
  // single selection sends undefined, and treating that as "uncontrolled"
  // would resurrect the last internal choice.
  const valueControlled = Object.prototype.hasOwnProperty.call(allProps, 'value');
  const inputValueControlled = Object.prototype.hasOwnProperty.call(allProps, 'inputValue');
  const multiple = mode === 'multiple';
  const slots = comboboxVariants();
  const model = useMemo(() => readItems(children), [children]);
  const options = model.options;

  const labelOf = useCallback(
    (candidate: string) => options.find((option) => option.value === candidate)?.label ?? candidate,
    [options]
  );

  const initialSelection = (valueControlled ? value : defaultValue) as
    | string
    | string[]
    | undefined;
  const initialSingle = multiple ? undefined : (initialSelection as string | undefined);

  const [internalValue, setInternalValue] = useState<ComboboxSelection[Mode]>(
    () => (defaultValue ?? (multiple ? [] : undefined)) as ComboboxSelection[Mode]
  );
  const [internalQuery, setInternalQuery] = useState(
    () => defaultInputValue ?? (initialSingle != null ? labelOf(initialSingle) : '')
  );
  const [open, setOpenState] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState<OptionData | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selection = (valueControlled ? value : internalValue) as
    | string
    | string[]
    | undefined;
  const singleValue = multiple ? undefined : (selection as string | undefined);
  const values = useMemo(() => {
    if (selection == null) return [];
    return Array.isArray(selection) ? selection : [selection];
  }, [selection]);

  const query = inputValueControlled ? (inputValue ?? '') : internalQuery;

  const setQuery = useCallback(
    (next: string) => {
      if (!inputValueControlled) setInternalQuery(next);
      onInputValueChange?.(next);
    },
    [inputValueControlled, onInputValueChange]
  );

  const commit = useCallback(
    (next: ComboboxSelection[Mode]) => {
      if (!valueControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [valueControlled, onValueChange]
  );

  const setOpen = useCallback((next: boolean) => setOpenState(next), []);

  // Report a change once, after it has been accepted, rather than from inside
  // a state updater where React may run it twice.
  const reportedOpen = useRef<boolean | null>(null);
  useEffect(() => {
    if (reportedOpen.current === open) return;
    const first = reportedOpen.current === null;
    reportedOpen.current = open;
    if (!first) onOpenChange?.(open);
  }, [open, onOpenChange]);

  // A single-select field shows the chosen option's label when it is not being
  // typed into. Base UI writes it on a pick; an external value change has to be
  // written back here.
  const previousValue = useRef(singleValue);
  useEffect(() => {
    if (previousValue.current === singleValue) return;
    // A value arriving while the reader is typing waits for the blur: writing
    // it now would fight the query. The reference advances only when the
    // update is actually applied, so blur can still see it is pending.
    if (multiple || focused || inputValueControlled) return;
    previousValue.current = singleValue;
    setQuery(singleValue == null ? '' : labelOf(singleValue));
    // `setQuery` is stable per controlled-ness; re-running on every identity
    // change would overwrite the query the caller is controlling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleValue, multiple, focused, inputValueControlled, labelOf]);

  const itemCollection = useMemo(
    () =>
      BaseCombobox.createItems(model.data as OptionData[], {
        getValue: (option: OptionData) => option.value,
        getLabel: (option: OptionData) => option.label,
      }),
    [model]
  );

  const baseFilter = useMemo(() => {
    if (filter === false) return null;
    if (typeof filter === 'function') {
      return (option: OptionData, raw: string) => filter(option, raw.trim());
    }
    return (option: OptionData, raw: string) => {
      const needle = raw.trim().toLowerCase();
      return needle.length === 0 || option.label.toLowerCase().includes(needle);
    };
  }, [filter]);

  const close = useCallback(() => setOpen(false), [setOpen]);

  // Inline has no floating layer to notice an outside press, so the page
  // itself closes it. Escape is the other way out, as it is for a popover.
  useEffect(() => {
    if (presentation !== 'inline' || !open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      close();
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [presentation, open, close]);

  const handleOpenChange = useCallback(
    (next: boolean, details: { reason: string; cancel: () => void }) => {
      // Picking an option in multiple mode adds a chip; it must not close the
      // list, or taking several in a row becomes a reopen per pick. Emptying
      // the query has the same effect on the primitive, and should not close
      // the list either.
      if (
        multiple &&
        !next &&
        (details.reason === 'item-press' || details.reason === 'none' || details.reason === 'input-clear')
      ) {
        details.cancel();
        return;
      }
      setOpen(next);
    },
    [multiple, setOpen]
  );

  const handleInputChange = useCallback(
    (next: string, details: { reason: string }) => {
      if (!inputValueControlled) setInternalQuery(next);
      onInputValueChange?.(next);
      // Typing opens the list; a label written back by a pick does not.
      if (details.reason === 'input-change' && !open) setOpen(true);
    },
    [inputValueControlled, onInputValueChange, open, setOpen]
  );

  const handleValueChange = useCallback(
    (next: unknown, details?: { reason: string }) => {
      if (multiple) {
        commit((Array.isArray(next) ? next : []) as ComboboxSelection[Mode]);
        // Canceling the primitive's close also skips its query cleanup. A pick
        // has done the query's job, so clear it here and keep the list open.
        if (details?.reason === 'item-press') setQuery('');
        return;
      }
      const chosen = (next as string | null) ?? undefined;
      commit(chosen as ComboboxSelection[Mode]);
      if (chosen === undefined) return;
      // A single pick writes its label back and closes the list. An overlay
      // list does that for itself; an inline list, which has no popup to close,
      // has to be told.
      if (presentation === 'inline') setQuery(labelOf(chosen));
      setOpen(false);
      if (details?.reason === 'item-press') inputRef.current?.blur();
    },
    [multiple, commit, presentation, setQuery, labelOf, setOpen]
  );

  const exactMatch = useMemo(
    () => options.find((option) => option.label.toLowerCase() === query.trim().toLowerCase()),
    [options, query]
  );

  const submitCustom = useCallback(() => {
    const typed = query.trim();
    if (!typed) return;

    if (exactMatch && !exactMatch.disabled) {
      if (multiple) {
        if (!values.includes(exactMatch.value)) {
          commit([...values, exactMatch.value] as ComboboxSelection[Mode]);
        }
        setQuery('');
        return;
      }
      commit(exactMatch.value as ComboboxSelection[Mode]);
      setQuery(exactMatch.label);
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!allowCustomValue) return;

    if (multiple) {
      if (!values.includes(typed)) commit([...values, typed] as ComboboxSelection[Mode]);
      setQuery('');
      return;
    }

    commit(typed as ComboboxSelection[Mode]);
    setOpen(false);
    inputRef.current?.blur();
  }, [query, exactMatch, allowCustomValue, multiple, values, commit, setQuery, setOpen]);

  const onInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      if (event.nativeEvent.isComposing) return;
      // With a highlighted suggestion, Enter is the primitive's to take: the
      // reader has pointed at the option they want, not at the typed text.
      // The exception is an exact match in multiple mode, which has to stay
      // open while the value is added to the chips.
      const highlightedExact = multiple && highlighted && exactMatch && highlighted.value === exactMatch.value;
      if (highlighted && !highlightedExact) return;
      if (!exactMatch && !allowCustomValue) return;
      event.preventDefault();
      submitCustom();
    },
    [multiple, highlighted, exactMatch, allowCustomValue, submitCustom]
  );

  const clear = useCallback(() => {
    setQuery('');
    commit((multiple ? [] : undefined) as ComboboxSelection[Mode]);
    setHighlighted(undefined);
    inputRef.current?.focus();
  }, [setQuery, commit, multiple]);

  const hasContent = query.length > 0 || values.length > 0;

  const contentWidthClass =
    contentWidth === 'field'
      ? 'w-(--anchor-width)'
      : contentWidth === 'content'
        ? 'w-max min-w-(--anchor-width) max-w-(--available-width)'
        : 'max-w-(--available-width)';
  const contentWidthStyle =
    typeof contentWidth === 'number' ? { width: contentWidth } : undefined;

  // Kept in the tree while idle, so the live region exists before the text
  // that changes it does.
  const status = (
    <BaseCombobox.Status className={loading ? slots.status() : 'sr-only'}>
      {loading ? (
        <>
          <Spinner size="sm" />
          {loadingMessage}
        </>
      ) : null}
    </BaseCombobox.Status>
  );

  const body = loading ? null : (
    <>
      <BaseCombobox.Empty>
        <div className={slots.empty()}>
          {allowCustomValue && query.trim() && !exactMatch
            ? `Press Enter to add “${query.trim()}”`
            : emptyMessage}
        </div>
      </BaseCombobox.Empty>
      {model.grouped ? (
        <BaseCombobox.List className={slots.list()}>
          {(group: GroupData) => (
            <BaseCombobox.Group key={group.key} items={group.items} className={cn(slots.group(), group.className)}>
              {group.label ? (
                <BaseCombobox.GroupLabel className={cn(slots.groupLabel(), group.labelClassName)}>
                  {group.label}
                </BaseCombobox.GroupLabel>
              ) : null}
              <BaseCombobox.Collection>
                {(option: OptionData) => <Option key={option.value} option={option} slots={slots} />}
              </BaseCombobox.Collection>
            </BaseCombobox.Group>
          )}
        </BaseCombobox.List>
      ) : (
        <BaseCombobox.List className={slots.list()}>
          {(option: OptionData) => <Option key={option.value} option={option} slots={slots} />}
        </BaseCombobox.List>
      )}
    </>
  );

  const input = (
    <BaseCombobox.Input
      ref={inputRef}
      id={id}
      className={slots.input()}
      value={query}
      placeholder={multiple && values.length > 0 ? undefined : placeholder}
      aria-label={accessibilityLabel}
      aria-expanded={open}
      aria-description={
        multiple && values.length > 0
          ? `${values.length} selected. From the start of the input, press Left Arrow to focus the selected options`
          : undefined
      }
      disabled={disabled}
      autoComplete="off"
      autoCapitalize="none"
      autoCorrect="off"
      onFocus={() => {
        setFocused(true);
        if (openOnFocus) setOpen(true);
      }}
      onBlur={() => setFocused(false)}
      onKeyDown={onInputKeyDown}
    />
  );

  const field = (
    <BaseCombobox.InputGroup data-slot="combobox-field" className={slots.field()}>
      <div className={slots.content()}>
        {multiple ? (
          <BaseCombobox.Chips className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5" aria-label={values.length ? 'Selected options' : undefined}>
            {values.map((entry) => (
              <BaseCombobox.Chip key={entry} aria-description="Press Backspace or Delete to remove" className={slots.chip()}>
                {labelOf(entry)}
                <BaseCombobox.ChipRemove aria-label={`Remove ${labelOf(entry)}`} className={slots.chipRemove()}>
                  <XIcon />
                </BaseCombobox.ChipRemove>
              </BaseCombobox.Chip>
            ))}
            {input}
          </BaseCombobox.Chips>
        ) : (
          input
        )}
      </div>

      {clearable && hasContent && !disabled ? (
        <button
          type="button"
          // The overlay hides the rest of the page from assistive technology
          // while it is open. A clear button that can be tabbed to in a hidden
          // region is a reading-order trap, so it stays out of the tab order —
          // as the primitive's own clear does.
          tabIndex={-1}
          aria-label="Clear"
          className={slots.action()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={clear}
        >
          <XIcon />
        </button>
      ) : null}

      {presentation === 'inline' ? (
        <button
          type="button"
          aria-label={open ? 'Hide options' : 'Show options'}
          aria-expanded={open}
          disabled={disabled}
          className={slots.action()}
          onClick={() => {
            if (open) {
              close();
              return;
            }
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <span className={cn(slots.chevron(), open && 'rotate-180')}>
            <ChevronDownIcon />
          </span>
        </button>
      ) : (
        <BaseCombobox.Trigger
          aria-label={open ? 'Hide options' : 'Show options'}
          disabled={disabled}
          className={slots.action()}
          onClick={() => inputRef.current?.focus()}
        >
          <span className={cn(slots.chevron(), open && 'rotate-180')}>
            <ChevronDownIcon />
          </span>
        </BaseCombobox.Trigger>
      )}
    </BaseCombobox.InputGroup>
  );

  if (presentation === 'inline') {
    return (
      <div ref={rootRef} data-slot="combobox" className={cn(slots.root(), className)} {...props}>
        <BaseCombobox.Root
          items={itemCollection}
          value={(multiple ? values : (singleValue ?? null)) as never}
          onValueChange={handleValueChange}
          inputValue={query}
          onInputValueChange={handleInputChange}
          onOpenChange={handleOpenChange}
          onItemHighlighted={(next: string | undefined) => {
            setHighlighted(options.find((option) => option.value === next));
          }}
          filter={baseFilter as never}
          itemToStringLabel={(next: string) => labelOf(next)}
          multiple={multiple as never}
          inline
          open={open}
          openOnInputClick={openOnFocus}
          disabled={disabled}
          required={required}
          name={name}
          form={form}
        >
          {field}
          {open ? (
            <div className={cn(slots.inline(), listClassName)}>
              {status}
              {body}
            </div>
          ) : null}
        </BaseCombobox.Root>
      </div>
    );
  }

  return (
    <div data-slot="combobox" className={cn(slots.root(), className)} {...props}>
      <BaseCombobox.Root
        items={itemCollection}
        value={(multiple ? values : (singleValue ?? null)) as never}
        onValueChange={handleValueChange}
        inputValue={query}
        onInputValueChange={handleInputChange}
        onOpenChange={handleOpenChange}
        onItemHighlighted={(next: string | undefined) => {
          setHighlighted(options.find((option) => option.value === next));
        }}
        filter={baseFilter as never}
        itemToStringLabel={(next: string) => labelOf(next)}
        multiple={multiple as never}
        open={open}
        openOnInputClick={openOnFocus}
        disabled={disabled}
        required={required}
        name={name}
        form={form}
      >
        {field}
        <BaseCombobox.Portal container={container}>
          <BaseCombobox.Positioner side="bottom" align="start" sideOffset={offset} collisionPadding={8} className={slots.positioner()}>
            <BaseCombobox.Popup
              data-slot="combobox-content"
              className={cn(slots.popup(), contentWidthClass, listClassName)}
              style={contentWidthStyle}
            >
              {status}
              {body}
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </BaseCombobox.Root>
    </div>
  );
}
ComboboxRoot.displayName = 'Combobox';

function Option({
  option,
  slots,
}: {
  option: OptionData;
  slots: ReturnType<typeof comboboxVariants>;
}) {
  return (
    <BaseCombobox.Item
      value={option.value}
      disabled={option.disabled}
      className={cn(slots.item(), option.className)}
    >
      {option.start ? (
        <span className={slots.itemStart()} aria-hidden="true">
          {option.start}
        </span>
      ) : null}
      <span className={slots.itemContent()}>
        <span className={slots.itemLabel()}>{option.label}</span>
        {option.description ? <span className={slots.itemDescription()}>{option.description}</span> : null}
      </span>
      <span className={slots.indicator()}>
        <BaseCombobox.ItemIndicator>
          <CheckIcon />
        </BaseCombobox.ItemIndicator>
      </span>
    </BaseCombobox.Item>
  );
}

export const Combobox = Object.assign(ComboboxRoot, {
  Item: ComboboxItem,
  Group: ComboboxGroup,
});

export { ComboboxItem, ComboboxGroup };
