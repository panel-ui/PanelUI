'use client';

/**
 * Command — a launcher: type to find an app, a page or an action, and run it with Enter.
 *
 * ```tsx
 * <Command.Dialog hotkey="mod+k">
 *   <Command>
 *     <Command.Input placeholder="Search for pages and actions…" />
 *     <Command.List>
 *       <Command.Group heading="Pages">
 *         <Command.Item icon={<BookIcon />} kind="Page" onSelect={() => go('/docs')}>
 *           Documentation
 *         </Command.Item>
 *       </Command.Group>
 *     </Command.List>
 *     <Command.Footer>
 *       <Command.FooterAction keys={['↵']}>Open</Command.FooterAction>
 *     </Command.Footer>
 *   </Command>
 * </Command.Dialog>
 * ```
 *
 * ## Typing filters, Enter runs
 *
 * Items are written as children, and each hides itself when it does not
 * match what is typed: every word has to appear in its title, `subtitle`,
 * `kind` or `keywords`, in any order. A group with nothing left in it hides
 * too, and `Command.Empty` shows when nothing at all is left. The first match
 * is highlighted, so typing a few letters and pressing Enter runs it.
 *
 * ## It opens at once
 *
 * A launcher is opened many times a day, mostly from its hotkey, so opened
 * from the keyboard it appears in place, with no animation to wait for.
 * Opened with a pointer, it fades in over 150ms.
 *
 * ## Five layouts
 *
 * `spotlight` is the large launcher: a tall field, roomy rows with app icons
 * and the kind of each at its end, and a bar of actions at the foot.
 * `compact` is a dense palette for an editor, with each item's shortcut at
 * its end. `grid` lays the items out as tiles that the arrow keys move
 * across. `split` keeps a preview of the highlighted item beside the list.
 * `inline` sits in the page as a card rather than over it.
 */
import { Autocomplete } from '@base-ui/react/autocomplete';
import { Dialog } from '@base-ui/react/dialog';
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { Spinner } from '../spinner';

export type CommandVariant = 'spotlight' | 'compact' | 'grid' | 'split' | 'inline';

const commandVariants = tv({
  slots: {
    // A size container, so the split layout can leave its preview out when narrow.
    root: 'group/command @container relative flex min-h-0 w-full flex-col overflow-hidden text-popover-foreground',
    inputRow: 'flex shrink-0 items-center gap-3 border-b',
    inputIcon: 'flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-full',
    input: 'h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/75',
    prefix: [
      'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-muted px-2 text-[0.8125rem] font-medium text-foreground',
      '[&_svg]:size-3.5',
    ],
    inputAction: [
      'inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg ps-2.5 pe-1 text-sm text-muted-foreground outline-none',
      'transition-[background-color,color,scale] duration-150 hover:bg-accent hover:text-foreground active:scale-[0.97]',
      'focus-visible:ring-[3px] focus-visible:ring-ring/30',
    ],
    body: 'flex min-h-0 flex-1',
    list: [
      'min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
    ],
    group: '[&:not(:has([data-slot=command-item]))]:hidden',
    groupLabel: 'select-none text-xs font-medium text-muted-foreground',
    item: [
      'group/item relative flex cursor-default select-none items-center outline-none',
      'data-highlighted:bg-accent data-disabled:opacity-45',
    ],
    itemIcon: 'flex shrink-0 items-center justify-center [&>svg]:size-full',
    itemTitle: 'truncate text-foreground',
    // On a narrow launcher the subtitle gives its room to the title.
    itemSubtitle: 'hidden truncate text-muted-foreground @[30rem]:block',
    itemEnd: 'ms-auto flex shrink-0 items-center gap-2 ps-3 text-muted-foreground [&>span>svg]:size-4',
    badge:
      'inline-flex h-5 items-center rounded-md bg-info/12 px-1.5 text-[0.6875rem] font-medium text-info',
    keys: 'flex items-center gap-1',
    key: [
      'inline-flex h-5 min-w-5 items-center justify-center rounded-md border bg-muted/50 px-1 font-sans text-[0.6875rem] font-medium leading-none text-muted-foreground',
    ],
    empty: 'flex flex-col items-center justify-center gap-1 px-4 py-10 text-center text-sm text-muted-foreground',
    loading: 'flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground',
    separator: 'mx-3 my-1.5 h-px shrink-0 bg-border',
    footer: 'flex shrink-0 items-center gap-1 border-t',
    footerLead: 'me-auto flex min-w-0 items-center gap-2 text-[0.8125rem] text-muted-foreground [&_svg]:size-4',
    // Where the actions sit: inline in most layouts, a floating pill in `spotlight`.
    footerBar: 'flex items-center gap-1',
    footerButton: [
      'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none',
      'transition-[background-color,color,scale] duration-150 hover:bg-accent hover:text-foreground active:scale-[0.96]',
      'focus-visible:ring-[3px] focus-visible:ring-ring/30 data-popup-open:bg-accent [&_svg]:size-4',
    ],
    footerAction: [
      'inline-flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-lg ps-2.5 pe-1 text-[0.8125rem] font-medium text-foreground outline-none',
      'transition-[background-color,scale] duration-150 hover:bg-accent active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/30',
      'data-popup-open:bg-accent',
    ],
    footerDivider: 'mx-1 h-4 w-px bg-border',
    pane: 'hidden w-[45%] shrink-0 flex-col overflow-y-auto border-s bg-muted/30 @[36rem]:flex',
    gridRow: 'grid gap-1',
    backdrop: [
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]',
      'transition-opacity duration-150 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0',
      'in-data-instant:transition-none motion-reduce:transition-none',
    ],
    viewport: 'fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]',
    popup: [
      '@container flex max-h-[min(34rem,78vh)] w-full flex-col overflow-hidden rounded-2xl border bg-popover shadow-2xl shadow-black/25 outline-none',
      'data-[variant=spotlight]:rounded-[1.375rem]',
      'transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
      'data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0',
      // Opened from the keyboard: no animation at all.
      'data-instant:transition-none motion-reduce:transition-none',
    ],
  },
  variants: {
    variant: {
      spotlight: {
        root: 'rounded-[1.375rem]',
        // One sheet: no rule between the field and the list.
        inputRow: 'h-[4.25rem] border-b-0 px-6',
        inputIcon: 'size-6',
        input: 'text-xl placeholder:text-muted-foreground/60',
        list: [
          'scroll-py-2 px-2 pb-2',
          // With a footer, the last rows run on under its floating pill and fade out.
          'group-has-[[data-slot=command-footer]]/command:pb-20',
          'group-has-[[data-slot=command-footer]]/command:[mask-image:linear-gradient(to_bottom,black_calc(100%-6rem),transparent_calc(100%-1.5rem))]',
        ],
        group: 'not-first:mt-1',
        groupLabel: 'px-3 pb-1 pt-2 text-[0.8125rem]',
        item: 'h-[2.375rem] gap-3 rounded-[0.625rem] px-3 text-[0.9375rem]',
        itemIcon: 'size-[1.375rem] [&>*]:rounded-[0.4rem]',
        itemSubtitle: 'text-[0.9375rem]',
        itemEnd: 'text-[0.9375rem] @max-[30rem]:[&>[data-slot=command-keys]]:hidden',
        key: 'h-6 min-w-6 rounded-[0.4rem] border-foreground/15 bg-transparent text-[0.75rem] text-foreground/75',
        inputAction: 'h-9 gap-2.5 ps-3 pe-1.5 text-[0.9375rem] hover:bg-accent/70',
        footer: 'pointer-events-none absolute inset-x-3 bottom-3 border-t-0',
        footerLead: 'pointer-events-auto',
        footerBar: 'pointer-events-auto h-11 gap-0.5 rounded-full border bg-popover px-1.5 shadow-lg shadow-black/20',
        // On a narrow launcher the pill keeps the labels and drops the key caps, so it fits.
        footerAction: 'h-8 rounded-full ps-3.5 pe-1.5 text-[0.9375rem] @max-[30rem]:px-3 @max-[30rem]:[&>[data-slot=command-keys]]:hidden',
        footerButton: 'pointer-events-auto size-11 rounded-full border bg-popover shadow-lg shadow-black/20 [&_svg]:size-[1.125rem]',
        footerDivider: 'mx-1.5 h-5',
      },
      compact: {
        inputRow: 'h-11 px-3.5',
        inputIcon: 'size-4',
        input: 'text-sm',
        list: 'scroll-py-1 p-1',
        group: 'not-first:mt-1',
        groupLabel: 'px-2.5 pb-1 pt-2 text-[0.6875rem]',
        item: 'h-8 gap-2.5 rounded-lg px-2.5 text-[0.8125rem]',
        itemIcon: 'size-4 text-muted-foreground group-data-highlighted/item:text-foreground',
        itemSubtitle: 'text-xs',
        itemEnd: 'text-xs',
        footer: 'h-9 px-2 text-xs',
      },
      grid: {
        inputRow: 'h-14 px-4',
        inputIcon: 'size-5',
        input: 'text-base',
        list: 'scroll-py-2 p-2',
        group: 'not-first:mt-3',
        groupLabel: 'px-2 pb-2 pt-1',
        item: 'h-24 flex-col justify-center gap-2 rounded-xl px-1.5 text-center text-xs',
        itemIcon: 'size-9 [&>*]:rounded-lg',
        itemTitle: 'w-full',
        itemSubtitle: 'hidden',
        itemEnd: 'hidden',
        footer: 'h-11 bg-muted/30 px-3',
      },
      split: {
        inputRow: 'h-14 px-4',
        inputIcon: 'size-5',
        input: 'text-base',
        list: 'scroll-py-1.5 p-1.5',
        group: 'not-first:mt-2',
        groupLabel: 'px-2.5 pb-1 pt-2',
        item: 'h-10 gap-3 rounded-lg px-2.5 text-sm data-highlighted:bg-accent',
        itemIcon: 'size-5 [&>*]:rounded-md',
        itemSubtitle: 'hidden',
        itemEnd: 'text-xs',
        footer: 'h-11 bg-muted/30 px-3',
      },
      inline: {
        root: 'rounded-2xl border bg-card shadow-xs',
        inputRow: 'h-12 px-4',
        inputIcon: 'size-4',
        input: 'text-sm',
        list: 'max-h-80 scroll-py-1.5 p-1.5',
        group: 'not-first:mt-1.5',
        groupLabel: 'px-2.5 pb-1 pt-2',
        item: 'min-h-12 gap-3 rounded-xl px-2.5 py-2 text-sm',
        itemIcon: 'size-8 rounded-lg border bg-background [&_svg]:size-4',
        itemSubtitle: 'text-xs',
        itemEnd: 'text-xs',
        footer: 'h-10 px-3 text-xs',
      },
    },
  },
  defaultVariants: { variant: 'spotlight' },
});

const DIALOG_WIDTH: Record<CommandVariant, string> = {
  spotlight: 'max-w-[47rem]',
  compact: 'max-w-[34rem]',
  grid: 'max-w-[40rem]',
  split: 'max-w-[50rem]',
  inline: 'max-w-[40rem]',
};

/* -------------------------------------------------------------------------- */
/* Matching                                                                   */
/* -------------------------------------------------------------------------- */

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

/** Every word typed has to appear somewhere in what the item says about itself. */
function matches(query: string, haystack: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack.toLowerCase();
  return words.every((word) => text.includes(word));
}

function haystackOf(props: CommandItemProps) {
  return [props.textValue ?? textOf(props.children), textOf(props.subtitle), textOf(props.kind), ...(props.keywords ?? [])].join(' ');
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

interface Registered {
  title: ReactNode;
}

interface CommandContextValue {
  variant: CommandVariant;
  slots: ReturnType<typeof commandVariants>;
  search: string;
  filtering: boolean;
  columns: number;
  highlighted: string | undefined;
  register: (value: string, data: Registered) => () => void;
  count: number;
  close: () => void;
}

const CommandContext = createContext<CommandContextValue | null>(null);

function useCommand(part: string) {
  const command = useContext(CommandContext);
  if (!command) throw new Error(`${part} must be used inside <Command>.`);
  return command;
}

/** Set by `Command.Dialog`, so a chosen item can close it. */
const DialogContext = createContext<{ close: () => void; variant: CommandVariant | null; setVariant: (variant: CommandVariant) => void } | null>(
  null
);

export interface CommandProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  /** The layout: `spotlight`, `compact`, `grid`, `split` or `inline`. Default `spotlight`. */
  variant?: CommandVariant;
  /** What is typed in the field, when the caller holds it. */
  search?: string;
  /** Called with the text in the field as it changes. */
  onSearchChange?: (search: string) => void;
  /** Whether items hide when they do not match. Turn it off for results already filtered elsewhere, such as by a server. Default `true`. */
  filter?: boolean;
  /** Tiles to a row, for the `grid` layout. Default `5`. */
  columns?: number;
  /** What a screen reader calls the list. Default `Commands`. */
  label?: string;
}

/** The launcher: a field, the list it filters and an optional footer. Put it in a `Command.Dialog`, or in the page. */
function CommandRoot({
  variant = 'spotlight',
  search: searchProp,
  onSearchChange,
  filter = true,
  columns = 5,
  label = 'Commands',
  className,
  children,
  ...props
}: CommandProps) {
  const dialog = useContext(DialogContext);
  const [ownSearch, setOwnSearch] = useState('');
  const search = searchProp ?? ownSearch;
  const [highlighted, setHighlighted] = useState<string | undefined>(undefined);
  const registry = useRef(new Map<string, Registered>());
  const [count, setCount] = useState(0);
  const slots = commandVariants({ variant });

  // The dialog sizes itself to the layout.
  const setDialogVariant = dialog?.setVariant;
  useEffect(() => {
    setDialogVariant?.(variant);
  }, [setDialogVariant, variant]);

  const register = useCallback((value: string, data: Registered) => {
    registry.current.set(value, data);
    setCount(registry.current.size);
    return () => {
      registry.current.delete(value);
      setCount(registry.current.size);
    };
  }, []);

  const setSearch = (next: string) => {
    if (searchProp === undefined) setOwnSearch(next);
    onSearchChange?.(next);
  };

  const context = useMemo<CommandContextValue>(
    () => ({
      variant,
      slots,
      search,
      filtering: filter,
      columns,
      highlighted,
      register,
      count,
      close: dialog?.close ?? (() => {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, search, filter, columns, highlighted, register, count, dialog?.close]
  );

  return (
    <CommandContext.Provider value={context}>
      <Autocomplete.Root
        inline
        open
        filter={null}
        grid={variant === 'grid'}
        value={search}
        onValueChange={(next, details) => {
          if (details.reason !== 'item-press') setSearch(next);
        }}
        onItemHighlighted={(value) => setHighlighted(typeof value === 'string' ? value : undefined)}
        autoHighlight="always"
        keepHighlight
        itemToStringValue={(value: string) => value}
      >
        <div
          data-slot="command"
          data-variant={variant}
          aria-label={label}
          className={slots.root({
            // Outside a dialog it draws the panel itself, so it can sit in the page.
            className: [
              !dialog && variant !== 'inline' ? 'border bg-popover shadow-xl shadow-black/10' : '',
              !dialog && variant !== 'inline' && variant !== 'spotlight' ? 'rounded-2xl' : '',
              className,
            ],
          })}
          {...props}
        >
          {children}
        </div>
      </Autocomplete.Root>
    </CommandContext.Provider>
  );
}
CommandRoot.displayName = 'Command';

/* -------------------------------------------------------------------------- */
/* Field                                                                      */
/* -------------------------------------------------------------------------- */

function SearchGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export interface CommandInputProps extends Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'prefix'> {
  /** What sits before the field. Default a magnifying glass; pass `null` for none. */
  icon?: ReactNode;
  /** A chip before the text, such as the page a nested list is on. */
  prefix?: ReactNode;
  /** Something at the end of the field, such as a `Command.InputAction`. */
  children?: ReactNode;
  className?: string;
}

/** The field. It has focus while the launcher is open, and the arrow keys and Enter work from it. */
function CommandInput({ icon, prefix, children, className, placeholder = 'Search…', ...props }: CommandInputProps) {
  const { slots } = useCommand('Command.Input');
  return (
    <Autocomplete.InputGroup data-slot="command-input" className={slots.inputRow()}>
      {icon === null ? null : (
        <span aria-hidden="true" className={slots.inputIcon()}>
          {icon ?? <SearchGlyph />}
        </span>
      )}
      {prefix ? (
        <span data-slot="command-prefix" className={slots.prefix()}>
          {prefix}
        </span>
      ) : null}
      <Autocomplete.Input
        aria-label={typeof placeholder === 'string' ? placeholder : 'Search'}
        placeholder={placeholder}
        className={slots.input({ className })}
        {...(props as Autocomplete.Input.Props)}
      />
      {children}
    </Autocomplete.InputGroup>
  );
}
CommandInput.displayName = 'Command.Input';

export interface CommandKeysProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The keys, each drawn as a key cap: `['⌘', 'K']`. */
  keys: readonly string[];
}

/** Keys drawn as key caps. It only shows them; handle the keys where the action lives. */
function CommandKeys({ keys, className, ...props }: CommandKeysProps) {
  const { slots } = useCommand('Command.Keys');
  return (
    <span data-slot="command-keys" className={slots.keys({ className })} {...props}>
      {keys.map((key, index) => (
        <kbd key={`${key}-${index}`} className={slots.key()}>
          {key}
        </kbd>
      ))}
    </span>
  );
}
CommandKeys.displayName = 'Command.Keys';

export interface CommandInputActionProps extends ComponentProps<'button'> {
  /** The keys that do the same, drawn after the label. */
  keys?: readonly string[];
}

/** A button at the end of the field, such as switching the field to asking an assistant. */
function CommandInputAction({ keys, className, children, type = 'button', ...props }: CommandInputActionProps) {
  const { slots } = useCommand('Command.InputAction');
  return (
    <button type={type} data-slot="command-input-action" className={slots.inputAction({ className })} {...props}>
      {children}
      {keys ? <CommandKeys keys={keys} /> : null}
    </button>
  );
}
CommandInputAction.displayName = 'Command.InputAction';

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export interface CommandListProps extends ComponentProps<'div'> {}

/** The results, scrolling inside the launcher. In the `split` layout the preview of the highlighted item sits beside it. */
function CommandList({ className, children, ...props }: CommandListProps) {
  const command = useCommand('Command.List');
  const list = (
    <Autocomplete.List data-slot="command-list" className={command.slots.list({ className })} {...props}>
      {children}
    </Autocomplete.List>
  );
  if (command.variant !== 'split') return list;
  return (
    <div className={command.slots.body()}>
      {list}
      <CommandPreviewPane />
    </div>
  );
}
CommandList.displayName = 'Command.List';

/** Reads the preview of the highlighted item from the registry. */
function CommandPreviewPane() {
  const command = useCommand('Command.List');
  return (
    <aside aria-live="polite" data-slot="command-preview" className={command.slots.pane()}>
      <PreviewOf value={command.highlighted} />
    </aside>
  );
}

const PreviewContext = createContext<Map<string, ReactNode>>(new Map());

function PreviewOf({ value }: { value: string | undefined }) {
  const previews = useContext(PreviewContext);
  return value ? (previews.get(value) ?? null) : null;
}

export interface CommandGroupProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** The group's heading. */
  heading?: ReactNode;
}

/** Items under a heading. It hides when none of its items match. */
function CommandGroup({ heading, className, children, ...props }: CommandGroupProps) {
  const command = useCommand('Command.Group');
  const { slots } = command;

  let content: ReactNode = children;
  if (command.variant === 'grid') {
    // Tiles go in rows so the arrow keys can move up and down as well as
    // across. The rows are cut from the items that match, so a filtered grid
    // closes up instead of leaving holes.
    const items = Children.toArray(children).filter(
      (child): child is ReactElement<CommandItemProps> =>
        isValidElement<CommandItemProps>(child) &&
        (!command.filtering || child.props.forceMount === true || matches(command.search, haystackOf(child.props)))
    );
    const rows: ReactElement<CommandItemProps>[][] = [];
    for (let index = 0; index < items.length; index += command.columns) rows.push(items.slice(index, index + command.columns));
    content = rows.map((row, index) => (
      <Autocomplete.Row
        key={index}
        className={slots.gridRow()}
        style={{ gridTemplateColumns: `repeat(${command.columns}, minmax(0, 1fr))` }}
      >
        {row}
      </Autocomplete.Row>
    ));
  }

  return (
    <Autocomplete.Group data-slot="command-group" className={slots.group({ className })} {...props}>
      {heading ? <Autocomplete.GroupLabel className={slots.groupLabel()}>{heading}</Autocomplete.GroupLabel> : null}
      {content}
    </Autocomplete.Group>
  );
}
CommandGroup.displayName = 'Command.Group';

export interface CommandItemProps extends Omit<ComponentProps<'div'>, 'onSelect' | 'title'> {
  /** What identifies it. Default its text. Two items must not share one. */
  value?: string;
  /** The text it is matched against, when its children are not plain text. */
  textValue?: string;
  /** More words it should be found by: `['settings', 'preferences']`. */
  keywords?: readonly string[];
  /** An icon or an app's picture before the title. */
  icon?: ReactNode;
  /** Quieter words after the title: the app it belongs to, a handle. */
  subtitle?: ReactNode;
  /** What kind of thing it is, at the end of the row: `Command`, `Application`. */
  kind?: ReactNode;
  /** A short flag before the kind, such as `Pro`. */
  badge?: ReactNode;
  /** Keys that run it, drawn at the end of the row. */
  shortcut?: readonly string[];
  /** What the `split` layout shows beside the list while it is highlighted. */
  preview?: ReactNode;
  /** Called when it is pressed, or Enter is pressed while it is highlighted. */
  onSelect?: () => void;
  /** Whether choosing it closes the dialog it is in. Default `true`. */
  closeOnSelect?: boolean;
  /** Whether it shows whatever is typed. Use it for an item such as "Search the web for …". */
  forceMount?: boolean;
  /** Whether it can be chosen. */
  disabled?: boolean;
}

/** One result. It hides itself when it does not match what is typed. */
function CommandItem(props: CommandItemProps) {
  const {
    value: valueProp,
    textValue,
    keywords,
    icon,
    subtitle,
    kind,
    badge,
    shortcut,
    preview,
    onSelect,
    closeOnSelect = true,
    forceMount = false,
    disabled,
    className,
    children,
    ...rest
  } = props;
  const command = useCommand('Command.Item');
  const previews = useContext(PreviewContext);
  const { slots } = command;
  const value = valueProp ?? textValue ?? textOf(children);
  const shown = forceMount || !command.filtering || matches(command.search, haystackOf(props));

  const { register } = command;
  useEffect(() => {
    if (!shown) return;
    if (preview !== undefined) previews.set(value, preview);
    const unregister = register(value, { title: children });
    return () => {
      previews.delete(value);
      unregister();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, value, register]);

  useEffect(() => {
    if (shown && preview !== undefined) previews.set(value, preview);
  }, [shown, preview, previews, value]);

  if (!shown) return null;

  const end = kind || badge || shortcut;
  return (
    <Autocomplete.Item
      value={value}
      disabled={disabled}
      data-slot="command-item"
      className={slots.item({ className })}
      onClick={() => {
        onSelect?.();
        if (closeOnSelect) command.close();
      }}
      {...(rest as Autocomplete.Item.Props)}
    >
      {icon ? (
        <span aria-hidden="true" className={slots.itemIcon()}>
          {icon}
        </span>
      ) : null}
      <span className={slots.itemTitle()}>{children}</span>
      {subtitle ? <span className={slots.itemSubtitle()}>{subtitle}</span> : null}
      {end ? (
        <span className={slots.itemEnd()}>
          {badge ? <span className={slots.badge()}>{badge}</span> : null}
          {kind ? <span>{kind}</span> : null}
          {shortcut ? <CommandKeys keys={shortcut} /> : null}
        </span>
      ) : null}
    </Autocomplete.Item>
  );
}
CommandItem.displayName = 'Command.Item';

export interface CommandEmptyProps extends ComponentProps<'div'> {}

/** Shown when nothing matches what is typed. */
function CommandEmpty({ className, children = 'No results', ...props }: CommandEmptyProps) {
  const command = useCommand('Command.Empty');
  if (command.count > 0) return null;
  return (
    <div role="status" data-slot="command-empty" className={command.slots.empty({ className })} {...props}>
      {children}
    </div>
  );
}
CommandEmpty.displayName = 'Command.Empty';

export interface CommandLoadingProps extends ComponentProps<'div'> {}

/** A spinner and a line, for results still on their way. */
function CommandLoading({ className, children = 'Searching…', ...props }: CommandLoadingProps) {
  const { slots } = useCommand('Command.Loading');
  return (
    <div data-slot="command-loading" className={slots.loading({ className })} {...props}>
      <Spinner size="sm" label={typeof children === 'string' ? children : 'Loading'} />
      {children}
    </div>
  );
}
CommandLoading.displayName = 'Command.Loading';

export interface CommandSeparatorProps extends ComponentProps<'div'> {}

/** A rule between groups. */
function CommandSeparator({ className, ...props }: CommandSeparatorProps) {
  const { slots } = useCommand('Command.Separator');
  return <div role="separator" data-slot="command-separator" className={slots.separator({ className })} {...props} />;
}
CommandSeparator.displayName = 'Command.Separator';

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

export interface CommandFooterProps extends ComponentProps<'div'> {
  /** What sits at the start of the bar: where the launcher is, or a hint. */
  lead?: ReactNode;
}

/** The bar at the foot of the launcher, with its actions at the end. */
function CommandFooter({ lead, className, children, ...props }: CommandFooterProps) {
  const { slots } = useCommand('Command.Footer');
  return (
    <div data-slot="command-footer" className={slots.footer({ className })} {...props}>
      <span className={slots.footerLead()}>{lead}</span>
      {children ? <span className={slots.footerBar()}>{children}</span> : null}
    </div>
  );
}
CommandFooter.displayName = 'Command.Footer';

export interface CommandFooterActionProps extends ComponentProps<'button'> {
  /** The keys that do the same, drawn after the label. */
  keys?: readonly string[];
}

/** An action in the footer, with its keys after its label. The first is usually what Enter does. */
function CommandFooterAction({ keys, className, children, type = 'button', ...props }: CommandFooterActionProps) {
  const { slots } = useCommand('Command.FooterAction');
  return (
    <button type={type} data-slot="command-footer-action" className={slots.footerAction({ className })} {...props}>
      {children}
      {keys ? <CommandKeys keys={keys} /> : null}
    </button>
  );
}
CommandFooterAction.displayName = 'Command.FooterAction';

export interface CommandFooterButtonProps extends ComponentProps<'button'> {
  /** What a screen reader calls it, since it shows only an icon. */
  'aria-label': string;
}

/** An icon button for the footer's start, such as one that opens a menu of settings. Round and floating in `spotlight`. */
function CommandFooterButton({ className, type = 'button', ...props }: CommandFooterButtonProps) {
  const { slots } = useCommand('Command.FooterButton');
  return <button type={type} data-slot="command-footer-button" className={slots.footerButton({ className })} {...props} />;
}
CommandFooterButton.displayName = 'Command.FooterButton';

/** A thin rule between two footer actions. */
function CommandFooterDivider() {
  const { slots } = useCommand('Command.FooterDivider');
  return <span aria-hidden="true" className={slots.footerDivider()} />;
}
CommandFooterDivider.displayName = 'Command.FooterDivider';

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

function isApple() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

function hotkeyMatches(event: globalThis.KeyboardEvent, hotkey: string) {
  const parts = hotkey.toLowerCase().split('+').map((part) => part.trim());
  const key = parts[parts.length - 1] ?? '';
  const mod = parts.includes('mod');
  const pressedMod = isApple() ? event.metaKey : event.ctrlKey;
  const code = /^[a-z]$/.test(key) ? `Key${key.toUpperCase()}` : /^[0-9]$/.test(key) ? `Digit${key}` : null;
  const keyMatches = code ? event.code === code : event.key.toLowerCase() === key;
  return keyMatches && mod === pressedMod && parts.includes('shift') === event.shiftKey && parts.includes('alt') === event.altKey;
}

export interface CommandDialogProps {
  /** Whether it is open, when the caller holds it. */
  open?: boolean;
  /** Whether it is open to begin with. */
  defaultOpen?: boolean;
  /** Called when it opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Keys that open and close it from anywhere on the page. `mod` is ⌘ on a Mac and Ctrl elsewhere. Default `mod+k`; `null` for none. */
  hotkey?: string | null;
  /** A button that opens it, such as a search field in a header. */
  trigger?: ReactElement;
  /** What a screen reader calls the dialog. Default `Command menu`. */
  label?: string;
  /** Put a `Command` in it. */
  children?: ReactNode;
  /** Classes for the panel. */
  className?: string;
}

/** Opens a `Command` in a panel over the page, from its hotkey or its trigger. Choosing an item closes it. */
function CommandDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  hotkey = 'mod+k',
  trigger,
  label = 'Command menu',
  children,
  className,
}: CommandDialogProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const [instant, setInstant] = useState(false);
  const [variant, setVariant] = useState<CommandVariant | null>(null);
  const open = openProp ?? ownOpen;
  const slots = commandVariants();

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwnOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange]
  );

  useEffect(() => {
    if (!hotkey) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (!hotkeyMatches(event, hotkey!)) return;
      event.preventDefault();
      setInstant(true);
      setOpen(!open);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkey, open, setOpen]);

  const dialog = useMemo(() => ({ close: () => setOpen(false), variant, setVariant }), [setOpen, variant]);

  return (
    <DialogContext.Provider value={dialog}>
      <Dialog.Root
        open={open}
        onOpenChange={(next, details) => {
          // Escape is a key too: a launcher closed from the keyboard goes at once.
          setInstant(details.reason === 'escape-key');
          setOpen(next);
        }}
      >
        {trigger ? <Dialog.Trigger render={trigger} onClick={() => setInstant(false)} /> : null}
        <Dialog.Portal>
          <div data-instant={instant ? '' : undefined} className="contents">
            <Dialog.Backdrop className={slots.backdrop()} />
            <Dialog.Viewport className={slots.viewport()}>
              <Dialog.Popup
                aria-label={label}
                data-slot="command-dialog"
                data-variant={variant ?? 'spotlight'}
                data-instant={instant ? '' : undefined}
                className={slots.popup({ className: [DIALOG_WIDTH[variant ?? 'spotlight'], className] })}
              >
                {children}
              </Dialog.Popup>
            </Dialog.Viewport>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </DialogContext.Provider>
  );
}
CommandDialog.displayName = 'Command.Dialog';

/* -------------------------------------------------------------------------- */
/* Previews                                                                   */
/* -------------------------------------------------------------------------- */

/** Holds what each item previews, for the `split` layout. One per `Command`. */
function PreviewStore({ children }: { children: ReactNode }) {
  const [store] = useState(() => new Map<string, ReactNode>());
  return <PreviewContext.Provider value={store}>{children}</PreviewContext.Provider>;
}

function CommandWithPreviews(props: CommandProps) {
  return (
    <PreviewStore>
      <CommandRoot {...props} />
    </PreviewStore>
  );
}
CommandWithPreviews.displayName = 'Command';

export const Command = Object.assign(CommandWithPreviews, {
  Dialog: CommandDialog,
  Input: CommandInput,
  InputAction: CommandInputAction,
  List: CommandList,
  Group: CommandGroup,
  Item: CommandItem,
  Empty: CommandEmpty,
  Loading: CommandLoading,
  Separator: CommandSeparator,
  Footer: CommandFooter,
  FooterAction: CommandFooterAction,
  FooterButton: CommandFooterButton,
  FooterDivider: CommandFooterDivider,
  Keys: CommandKeys,
});

export {
  CommandDialog,
  CommandInput,
  CommandInputAction,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandLoading,
  CommandSeparator,
  CommandFooter,
  CommandFooterAction,
  CommandFooterButton,
  CommandFooterDivider,
  CommandKeys,
};
