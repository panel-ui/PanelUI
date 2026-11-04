'use client';

/**
 * ModelPicker — chooses the model a message goes to.
 *
 * ```tsx
 * <ModelPicker items={models} providers={providers} defaultValue="claude-sonnet" hotkey="alt+m">
 *   <ModelPicker.Trigger />
 *   <ModelPicker.Content />
 * </ModelPicker>
 * ```
 *
 * ## A select that can be searched
 *
 * It behaves like a select: the trigger shows the chosen model, pressing it
 * opens a list, and choosing one closes it. The list opens with the search
 * field focused, because with more than a handful of models typing a few
 * letters is quicker than reading. Typing searches every model, whatever
 * filter is on.
 *
 * ## Keys
 *
 * The arrow keys move through the list and Enter chooses. ⌥1 to ⌥9 (Alt on
 * other systems) choose the row with that number, and ⌥S stars the
 * highlighted one. The numbers are on ⌥ because the browser keeps ⌘1 to ⌘9,
 * and Ctrl, for its tabs. `hotkey` opens it from anywhere on the page; opened
 * from the keyboard it appears at once, without growing, since a shortcut is
 * for being quick.
 *
 * ## Five layouts
 *
 * `rail` puts the providers in a column of icons beside the list, with
 * starred models first. `list` is one list under provider headings, with the
 * context size at the end of each row. `cards` shows each model as a card
 * with what it is good at, under a row of provider filters. `compare` sets
 * speed, intelligence and price side by side as small meters. `detail` keeps
 * a pane beside the list describing the highlighted model.
 *
 * ## Icons
 *
 * Each provider takes an `icon`, and a model shows its provider's unless it
 * has one of its own. Nothing is drawn by the component, so a provider's
 * mark is whatever the app has the right to show.
 */
import { Autocomplete } from '@base-ui/react/autocomplete';
import { Popover } from '@base-ui/react/popover';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { Tooltip } from '../tooltip';

export type ModelPickerVariant = 'rail' | 'list' | 'cards' | 'compare' | 'detail';

export interface ModelPickerProvider {
  /** The provider's id, which each model's `provider` refers to. */
  value: string;
  /** Its name, as the list and the rail's tooltips write it. */
  label: string;
  /** Its mark. Drawn at 16px, or 20px in the rail. */
  icon?: ReactNode;
  /** A mark on its rail icon: `new` for a model just added, `limited` for one that is rate-limited. */
  status?: 'new' | 'limited';
}

export interface ModelPickerItem {
  /** The model's id: what `value` and `onValueChange` carry. */
  value: string;
  /** Its name. */
  label: string;
  /** The `value` of the provider it comes from. */
  provider: string;
  /** Its own icon, in place of its provider's. */
  icon?: ReactNode;
  /** What it is good for, in a sentence. Shown by `cards` and `detail`. */
  description?: string;
  /** A short flag after its name, such as `New` or `Beta`. */
  badge?: ReactNode;
  /** Whether it can be chosen. A disabled model stays in the list, greyed out, with its `note`. */
  disabled?: boolean;
  /** Why it is disabled, or anything else to say in its second line: `Rate-limited until 14:00`. */
  note?: ReactNode;
  /** How many tokens it reads at once. Shown by `list`, `compare` and `detail`. */
  contextWindow?: number;
  /** From 1 to 5. */
  speed?: number;
  /** From 1 to 5. */
  intelligence?: number;
  /** From 1, cheapest, to 4. */
  price?: number;
  /** What it is good at, as chips: `Code`, `Vision`, `Long context`. */
  tags?: readonly string[];
}

const pickerVariants = tv({
  slots: {
    trigger: [
      'group/model-trigger inline-flex h-8 min-w-0 cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 text-[0.8125rem] font-medium text-foreground outline-none',
      'transition-[background-color,scale] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100',
      'focus-visible:ring-[3px] focus-visible:ring-ring/30 data-popup-open:bg-accent',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ],
    triggerIcon: 'flex size-4 shrink-0 items-center justify-center [&_svg]:size-4',
    triggerLabel: 'truncate',
    chevron:
      'size-3.5 text-muted-foreground transition-transform duration-200 group-data-popup-open/model-trigger:rotate-180 motion-reduce:transition-none',
    positioner: 'z-50 outline-none',
    popup: [
      '@container flex max-h-[min(30rem,var(--available-height))] max-w-[calc(100vw-1rem)] origin-(--transform-origin) overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-xl shadow-black/10 outline-none',
      'transition-[opacity,scale] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
      'data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.96] data-ending-style:opacity-0',
      'data-instant:transition-none motion-reduce:transition-none',
    ],
    rail: 'flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-e bg-muted/40 py-2 [scrollbar-width:none]',
    railButton: [
      'relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground outline-none',
      'transition-[background-color,color,scale] duration-150 hover:bg-accent hover:text-foreground active:scale-95',
      'focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs',
      '[&_svg]:size-5',
    ],
    // The bar that marks the chosen filter, on the rail's edge beside it.
    railMark: 'absolute -end-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-info',
    railStatus: 'absolute end-1 top-1 flex size-2.5 items-center justify-center rounded-full ring-2 ring-muted',
    railSeparator: 'my-1 h-px w-6 shrink-0 bg-border',
    main: 'flex min-w-0 flex-1 flex-col',
    searchRow: 'p-2 pb-1',
    search: [
      'flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm',
      'transition-[border-color,box-shadow] duration-150 focus-within:border-info focus-within:ring-[3px] focus-within:ring-info/20 dark:bg-input/30',
      '[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground',
    ],
    searchInput: 'h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/80',
    list: 'min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 pt-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] scroll-py-1.5',
    groupLabel: 'flex items-center gap-2 px-2.5 pb-1 pt-3 text-xs font-medium text-muted-foreground first:pt-1.5 [&_svg]:size-3.5',
    item: [
      'group/model relative flex cursor-default select-none items-center gap-3 rounded-xl px-2.5 outline-none',
      'data-highlighted:bg-accent data-disabled:opacity-50',
      'scroll-my-1.5',
    ],
    itemIcon: 'flex size-4 shrink-0 items-center justify-center [&_svg]:size-4',
    itemBody: 'flex min-w-0 flex-1 flex-col',
    itemName: 'flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground',
    itemNameText: 'truncate',
    itemMeta: 'flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5',
    itemEnd: 'ms-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums',
    badge: 'inline-flex h-[1.125rem] shrink-0 items-center rounded-md bg-info/12 px-1.5 text-[0.6875rem] font-medium text-info',
    check: 'size-4 text-foreground',
    star: [
      'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60',
      'transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-75 motion-reduce:active:scale-100',
      'data-on:text-warning [&_svg]:size-4',
    ],
    kbd: 'inline-flex h-5 min-w-5 items-center justify-center rounded-md border bg-muted/60 px-1 font-sans text-[0.6875rem] font-medium text-muted-foreground',
    empty: 'px-3 py-8 text-center text-sm text-muted-foreground',
    chips: 'flex gap-1.5 overflow-x-auto px-2 pb-2 [scrollbar-width:none]',
    chip: [
      'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium text-muted-foreground outline-none',
      'transition-[background-color,color,border-color] duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/30',
      'aria-pressed:border-foreground/20 aria-pressed:bg-foreground aria-pressed:text-background [&_svg]:size-3.5',
    ],
    cardRow: 'grid grid-cols-2 gap-1.5',
    card: [
      'flex min-w-0 cursor-default select-none flex-col gap-2 rounded-xl border bg-background p-3 outline-none dark:bg-input/20',
      'transition-[border-color,background-color] duration-150 data-highlighted:border-foreground/25 data-highlighted:bg-accent',
      'data-selected:border-info data-selected:ring-1 data-selected:ring-info data-disabled:opacity-50',
    ],
    cardHead: 'flex items-center gap-2 [&_svg]:size-4',
    cardText: 'line-clamp-2 text-xs leading-4 text-muted-foreground',
    tags: 'mt-auto flex flex-wrap gap-1',
    tag: 'inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-[0.6875rem] text-muted-foreground',
    tableHead: 'flex items-center gap-3 border-b px-4 pb-2 pt-1 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground',
    column: 'w-12 shrink-0 text-start @[30rem]:w-16',
    // Price is the column left out when the list is narrow.
    priceColumn: 'hidden w-16 shrink-0 text-start @[30rem]:block',
    meter: 'flex w-12 shrink-0 items-center gap-[2px] @[30rem]:w-16 @[30rem]:gap-[3px]',
    meterCell: 'h-2.5 flex-1 rounded-[2px] bg-muted-foreground/20 data-on:bg-foreground/80',
    price: 'w-16 shrink-0 font-medium tracking-wider',
    priceCell: 'hidden @[30rem]:block',
    pane: 'hidden w-64 shrink-0 flex-col gap-4 border-s bg-muted/30 p-4 @[34rem]:flex',
    paneIcon: 'flex size-10 items-center justify-center rounded-xl border bg-background [&_svg]:size-5',
    paneTitle: 'text-base font-semibold text-foreground',
    paneText: 'text-[0.8125rem] leading-5 text-muted-foreground',
    stats: 'flex flex-col gap-2.5 text-[0.8125rem]',
    stat: 'flex items-center justify-between gap-3',
    statLabel: 'text-muted-foreground',
    footer: 'mt-auto flex items-center gap-3 text-xs text-muted-foreground',
  },
  variants: {
    variant: {
      rail: { popup: 'min-h-[18rem] w-[25rem]', item: 'min-h-14 py-2' },
      list: { popup: 'w-[21rem]', item: 'h-9' },
      cards: {
        popup: 'w-[34rem]',
        list: 'flex flex-col gap-1.5 p-2 pt-0',
        // On a narrow card the badge drops under the name rather than splitting it.
        itemName: 'flex-wrap gap-y-1',
        itemNameText: 'overflow-visible whitespace-normal',
      },
      compare: { popup: 'w-[33rem]', item: 'h-11' },
      detail: { popup: 'min-h-[22rem] w-[38rem]', item: 'h-9' },
    },
    appearance: {
      ghost: { trigger: 'text-muted-foreground hover:bg-accent hover:text-foreground data-popup-open:text-foreground' },
      outline: { trigger: 'border bg-background shadow-xs hover:bg-accent dark:bg-input/30' },
    },
  },
  defaultVariants: { variant: 'rail', appearance: 'ghost' },
});

/* -------------------------------------------------------------------------- */
/* Keys                                                                       */
/* -------------------------------------------------------------------------- */

function isApple() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

interface Hotkey {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

function parseHotkey(text: string): Hotkey {
  const parts = text.toLowerCase().split('+').map((part) => part.trim());
  return {
    key: parts[parts.length - 1] ?? '',
    mod: parts.includes('mod') || parts.includes('meta') || parts.includes('cmd') || parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
  };
}

/** Each key of a hotkey as it is written on a key cap, in the order a Mac writes them. */
function hotkeyCaps(hotkey: Hotkey): string[] {
  const apple = isApple();
  const caps: string[] = [];
  if (hotkey.alt) caps.push(apple ? '⌥' : 'Alt');
  if (hotkey.shift) caps.push(apple ? '⇧' : 'Shift');
  if (hotkey.mod) caps.push(apple ? '⌘' : 'Ctrl');
  caps.push(hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key);
  return caps;
}

const modOf = (event: { metaKey: boolean; ctrlKey: boolean }) => (isApple() ? event.metaKey : event.ctrlKey);

/**
 * Whether an event is the given key. Letters and digits are matched by where
 * they are on the keyboard, because with ⌥ held a Mac reports the character
 * the key types instead (⌥M is `µ`).
 */
function isKey(event: { key: string; code: string }, key: string) {
  if (/^[a-z]$/.test(key)) return event.code === `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return event.code === `Digit${key}`;
  return event.key.toLowerCase() === key;
}

/** The number a row's shortcut is pressed with: ⌥1 on a Mac, Alt+1 elsewhere. ⌘1 and Ctrl+1 belong to the browser's tabs. */
const rowCap = (number: number) => (isApple() ? `⌥${number}` : `Alt+${number}`);

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

const STAR = 'M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 5.11a.56.56 0 0 0 .48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.39a.56.56 0 0 1-.84.61l-4.73-2.89a.56.56 0 0 0-.58 0l-4.73 2.89a.56.56 0 0 1-.84-.61l1.28-5.39a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .48-.35l2.13-5.11Z';

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
      <path d={STAR} />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

interface PickerContextValue {
  items: readonly ModelPickerItem[];
  providers: ReadonlyMap<string, ModelPickerProvider>;
  providerList: readonly ModelPickerProvider[];
  value: string | null;
  choose: (value: string) => void;
  favorites: ReadonlySet<string>;
  toggleFavorite: (value: string) => void;
  variant: ModelPickerVariant;
  hotkey: Hotkey | null;
  instant: boolean;
  open: boolean;
  label: string;
}

const PickerContext = createContext<PickerContextValue | null>(null);

function usePicker(part: string) {
  const picker = useContext(PickerContext);
  if (!picker) throw new Error(`${part} must be used inside <ModelPicker>.`);
  return picker;
}

export interface ModelPickerProps {
  /** The models to choose from, in the order they are listed. */
  items: readonly ModelPickerItem[];
  /** The providers the models come from, in the order the rail and the headings show them. */
  providers: readonly ModelPickerProvider[];
  /** The chosen model, when the caller holds it. */
  value?: string | null;
  /** The model chosen to begin with, when the caller does not hold it. */
  defaultValue?: string | null;
  /** Called with the model's `value` when another is chosen. */
  onValueChange?: (value: string) => void;
  /** The starred models, when the caller holds them. */
  favorites?: readonly string[];
  /** The models starred to begin with. */
  defaultFavorites?: readonly string[];
  /** Called with every starred model when one is starred or unstarred. */
  onFavoritesChange?: (favorites: string[]) => void;
  /** The layout of the list: `rail`, `list`, `cards`, `compare` or `detail`. Default `rail`. */
  variant?: ModelPickerVariant;
  /**
   * Keys that open it from anywhere on the page, such as `alt+m`. `mod` is ⌘ on a Mac and Ctrl elsewhere.
   * Avoid keys the browser keeps for itself, such as ⌘1 to ⌘9, ⌘T and ⌘⇧M, which a page never receives.
   */
  hotkey?: string;
  /** Whether the list is open, when the caller holds it. */
  open?: boolean;
  /** Whether the list is open to begin with. */
  defaultOpen?: boolean;
  /** Called when the list opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** What a screen reader calls the trigger and the list. Default `Model`. */
  label?: string;
  children?: ReactNode;
}

/** Holds the models, the chosen one and the starred ones. */
function ModelPickerRoot({
  items,
  providers,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  favorites: favoritesProp,
  defaultFavorites = [],
  onFavoritesChange,
  variant = 'rail',
  hotkey: hotkeyText,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  label = 'Model',
  children,
}: ModelPickerProps) {
  const [ownValue, setOwnValue] = useState<string | null>(defaultValue);
  const [ownFavorites, setOwnFavorites] = useState<readonly string[]>(defaultFavorites);
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const [instant, setInstant] = useState(false);
  const value = valueProp !== undefined ? valueProp : ownValue;
  const favoriteList = favoritesProp ?? ownFavorites;
  const open = openProp ?? ownOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwnOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange]
  );

  const hotkey = useMemo(() => (hotkeyText ? parseHotkey(hotkeyText) : null), [hotkeyText]);

  useEffect(() => {
    if (!hotkey) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (!isKey(event, hotkey!.key)) return;
      if (hotkey!.mod !== modOf(event) || hotkey!.shift !== event.shiftKey || hotkey!.alt !== event.altKey) return;
      event.preventDefault();
      // Opened from the keyboard: no growing in.
      setInstant(true);
      setOpen(!open);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkey, open, setOpen]);

  const context = useMemo<PickerContextValue>(() => {
    const favorites = new Set(favoriteList);
    return {
      items,
      providers: new Map(providers.map((provider) => [provider.value, provider])),
      providerList: providers,
      value,
      choose(next) {
        if (valueProp === undefined) setOwnValue(next);
        onValueChange?.(next);
        setOpen(false);
      },
      favorites,
      toggleFavorite(model) {
        const next = favorites.has(model) ? favoriteList.filter((entry) => entry !== model) : [...favoriteList, model];
        if (favoritesProp === undefined) setOwnFavorites(next);
        onFavoritesChange?.(next);
      },
      variant,
      hotkey,
      instant,
      open,
      label,
    };
  }, [items, providers, value, valueProp, onValueChange, setOpen, favoriteList, favoritesProp, onFavoritesChange, variant, hotkey, instant, open, label]);

  return (
    <PickerContext.Provider value={context}>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setInstant(false);
          setOpen(next);
        }}
      >
        {children}
      </Popover.Root>
    </PickerContext.Provider>
  );
}
ModelPickerRoot.displayName = 'ModelPicker';

/* -------------------------------------------------------------------------- */
/* Trigger                                                                    */
/* -------------------------------------------------------------------------- */

export interface ModelPickerTriggerProps extends Omit<Popover.Trigger.Props, 'children'> {
  /** `ghost` has no box until hovered, for a composer's footer. `outline` has an edge, for a toolbar. Default `ghost`. */
  appearance?: 'ghost' | 'outline';
  /** What it says before a model is chosen. Default `Choose a model`. */
  placeholder?: ReactNode;
  className?: string;
}

/** The button that opens the list, showing the chosen model's icon and name. */
function ModelPickerTrigger({ appearance, placeholder = 'Choose a model', className, ...props }: ModelPickerTriggerProps) {
  const picker = usePicker('ModelPicker.Trigger');
  const slots = pickerVariants({ appearance });
  const chosen = picker.items.find((item) => item.value === picker.value);
  const icon = chosen ? (chosen.icon ?? picker.providers.get(chosen.provider)?.icon) : null;
  const button = (
    <Popover.Trigger
      data-slot="model-picker-trigger"
      aria-label={`${picker.label}: ${chosen?.label ?? 'none chosen'}`}
      className={slots.trigger({ className })}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className={slots.triggerIcon()}>
          {icon}
        </span>
      ) : null}
      <span className={slots.triggerLabel()}>{chosen?.label ?? placeholder}</span>
      <ChevronIcon className={slots.chevron()} />
    </Popover.Trigger>
  );
  if (!picker.hotkey) return button;
  // With a hotkey, the trigger's tooltip says what it is.
  return (
    <Tooltip.Provider>
      <Tooltip>
        <Tooltip.Trigger render={button} />
        <Tooltip.Content variant="shortcut">
          Switch model
          <Tooltip.Shortcut keys={hotkeyCaps(picker.hotkey)} />
        </Tooltip.Content>
      </Tooltip>
    </Tooltip.Provider>
  );
}
ModelPickerTrigger.displayName = 'ModelPicker.Trigger';

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

type Filter = 'favorites' | 'all' | string;

interface Group {
  value: string;
  label: string;
  icon?: ReactNode;
  items: ModelPickerItem[];
}

function matches(item: ModelPickerItem, provider: ModelPickerProvider | undefined, query: string) {
  const text = `${item.label} ${provider?.label ?? ''} ${item.description ?? ''} ${(item.tags ?? []).join(' ')}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

function chunk<T>(list: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < list.length; index += size) rows.push(list.slice(index, index + size));
  return rows;
}

const compactTokens = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/* -------------------------------------------------------------------------- */
/* Rows                                                                       */
/* -------------------------------------------------------------------------- */

interface RowContextValue {
  picker: PickerContextValue;
  slots: ReturnType<typeof pickerVariants>;
  ordered: readonly ModelPickerItem[];
}

/** What every row needs from the list it is in, so the rows can live at module scope and keep their state. */
const RowContext = createContext<RowContextValue | null>(null);

function useRow() {
  return useContext(RowContext)!;
}

const iconOf = (picker: PickerContextValue, item: ModelPickerItem) => item.icon ?? picker.providers.get(item.provider)?.icon;

function Star({ item }: { item: ModelPickerItem }) {
  const { picker, slots } = useRow();
  const on = picker.favorites.has(item.value);
  return (
    // Pressed with a pointer only; ⌥S stars the highlighted row from the
    // keyboard, since a button inside an option cannot be reached by Tab.
    <span
      aria-hidden="true"
      data-on={on ? '' : undefined}
      className={slots.star()}
      onPointerDown={(event) => event.preventDefault()}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        picker.toggleFavorite(item.value);
      }}
    >
      <StarIcon filled={on} />
    </span>
  );
}

function End({ item, showNumber = true }: { item: ModelPickerItem; showNumber?: boolean }) {
  const { picker, slots, ordered } = useRow();
  const index = ordered.indexOf(item);
  const number = index >= 0 && index < 9 ? index + 1 : null;
  return (
    <span className={slots.itemEnd()}>
      {item.value === picker.value ? <CheckIcon className={slots.check()} /> : null}
      {showNumber && number ? <kbd className={slots.kbd()}>{rowCap(number)}</kbd> : null}
    </span>
  );
}

function Name({ item }: { item: ModelPickerItem }) {
  const { slots } = useRow();
  return (
    <span className={slots.itemName()}>
      <span className={slots.itemNameText()}>{item.label}</span>
      {item.badge ? <span className={slots.badge()}>{item.badge}</span> : null}
    </span>
  );
}

function Meta({ item }: { item: ModelPickerItem }) {
  const { picker, slots } = useRow();
  const provider = picker.providers.get(item.provider);
  if (item.note) {
    return (
      <span className={slots.itemMeta()}>
        {item.disabled ? <ClockIcon /> : null}
        <span className="truncate">{item.note}</span>
      </span>
    );
  }
  return (
    <span className={slots.itemMeta()}>
      {provider?.icon ? (
        <span aria-hidden="true" className="flex [&_svg]:size-3.5">
          {provider.icon}
        </span>
      ) : null}
      <span className="truncate">{provider?.label}</span>
    </span>
  );
}

function Meter({ value = 0, max = 5, label }: { value?: number; max?: number; label: string }) {
  const { slots } = useRow();
  return (
    <span role="img" aria-label={`${label} ${value} of ${max}`} className={slots.meter()}>
      {Array.from({ length: max }, (_, index) => (
        <span key={index} data-on={index < value ? '' : undefined} className={slots.meterCell()} />
      ))}
    </span>
  );
}

function Price({ value = 0 }: { value?: number }) {
  const { slots } = useRow();
  return (
    <span role="img" aria-label={`Price ${value} of 4`} className={slots.price()}>
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} className={index < value ? 'text-foreground' : 'text-muted-foreground/35'}>
          $
        </span>
      ))}
    </span>
  );
}

function ItemFrame({ item, children }: { item: ModelPickerItem; children: ReactNode }) {
  const { picker, slots } = useRow();
  return (
    <Autocomplete.Item
      value={item}
      disabled={item.disabled}
      data-slot="model-picker-item"
      data-selected={item.value === picker.value ? '' : undefined}
      className={slots.item()}
      onClick={() => picker.choose(item.value)}
    >
      {children}
    </Autocomplete.Item>
  );
}

function Row({ item }: { item: ModelPickerItem }) {
  const { picker, slots } = useRow();
  const { variant } = picker;
  const icon = iconOf(picker, item);
  if (variant === 'rail') {
    return (
      <ItemFrame item={item}>
        <Star item={item} />
        <span className={slots.itemBody()}>
          <Name item={item} />
          <Meta item={item} />
        </span>
        <End item={item} />
      </ItemFrame>
    );
  }
  if (variant === 'compare') {
    return (
      <ItemFrame item={item}>
        <span aria-hidden="true" className={slots.itemIcon()}>
          {icon}
        </span>
        <span className={slots.itemBody()}>
          <Name item={item} />
        </span>
        <Meter value={item.speed} label="Speed" />
        <Meter value={item.intelligence} label="Intelligence" />
        <span className={slots.priceCell()}>
          <Price value={item.price} />
        </span>
        <span className="flex w-4 justify-end">
          {item.value === picker.value ? <CheckIcon className={slots.check()} /> : null}
        </span>
      </ItemFrame>
    );
  }
  // list and detail: one line.
  return (
    <ItemFrame item={item}>
      <span aria-hidden="true" className={slots.itemIcon()}>
        {icon}
      </span>
      <span className={slots.itemBody()}>
        <Name item={item} />
      </span>
      {variant === 'list' && item.contextWindow ? (
        <span className="text-xs text-muted-foreground tabular-nums">{compactTokens.format(item.contextWindow)}</span>
      ) : null}
      <End item={item} showNumber={variant === 'list'} />
    </ItemFrame>
  );
}

function Card({ item }: { item: ModelPickerItem }) {
  const { picker, slots } = useRow();
  return (
    <Autocomplete.Item
      value={item}
      disabled={item.disabled}
      data-slot="model-picker-item"
      data-selected={item.value === picker.value ? '' : undefined}
      className={slots.card()}
      onClick={() => picker.choose(item.value)}
    >
      <span className={slots.cardHead()}>
        <span aria-hidden="true" className="flex">
          {iconOf(picker, item)}
        </span>
        <Name item={item} />
        <span className="ms-auto flex items-center gap-1">
          {item.value === picker.value ? <CheckIcon className={slots.check()} /> : null}
          <Star item={item} />
        </span>
      </span>
      {item.note || item.description ? <span className={slots.cardText()}>{item.note ?? item.description}</span> : null}
      {item.tags?.length ? <Tags tags={item.tags} /> : null}
    </Autocomplete.Item>
  );
}

function Tags({ tags }: { tags: readonly string[] }) {
  const { slots } = useRow();
  return (
    <span className={slots.tags()}>
      {tags.map((tag) => (
        <span key={tag} className={slots.tag()}>
          {tag}
        </span>
      ))}
    </span>
  );
}

/** The pane beside the `detail` list: the highlighted model, or the chosen one. */
function Pane({ item }: { item: ModelPickerItem }) {
  const { picker, slots } = useRow();
  return (
    <aside aria-live="polite" className={slots.pane()}>
      <span aria-hidden="true" className={slots.paneIcon()}>
        {iconOf(picker, item)}
      </span>
      <div className="flex flex-col gap-1">
        <span className={slots.paneTitle()}>{item.label}</span>
        <span className={slots.paneText()}>{item.note ?? item.description ?? picker.providers.get(item.provider)?.label}</span>
      </div>
      <div className={slots.stats()}>
        {item.contextWindow ? (
          <div className={slots.stat()}>
            <span className={slots.statLabel()}>Context</span>
            <span className="tabular-nums">{compactTokens.format(item.contextWindow)} tokens</span>
          </div>
        ) : null}
        {item.speed ? (
          <div className={slots.stat()}>
            <span className={slots.statLabel()}>Speed</span>
            <Meter value={item.speed} label="Speed" />
          </div>
        ) : null}
        {item.intelligence ? (
          <div className={slots.stat()}>
            <span className={slots.statLabel()}>Intelligence</span>
            <Meter value={item.intelligence} label="Intelligence" />
          </div>
        ) : null}
        {item.price ? (
          <div className={slots.stat()}>
            <span className={slots.statLabel()}>Price</span>
            <Price value={item.price} />
          </div>
        ) : null}
      </div>
      {item.tags?.length ? <Tags tags={item.tags} /> : null}
      <div className={slots.footer()}>
        <kbd className={slots.kbd()}>↵</kbd>
        {item.value === picker.value ? 'In use' : 'Use this model'}
      </div>
    </aside>
  );
}

export interface ModelPickerContentProps extends Omit<Popover.Popup.Props, 'children'> {
  /** Which side of the trigger it opens on. Default `bottom`. */
  side?: Popover.Positioner.Props['side'];
  /** How it lines up with the trigger along that side. Default `start`. */
  align?: Popover.Positioner.Props['align'];
  /** The gap between the trigger and the list, in pixels. Default `8`. */
  sideOffset?: number;
  /** What the search field says while empty. Default `Search models…`. */
  placeholder?: string;
  /** What the list says when nothing matches. Default `No models match`. */
  emptyText?: ReactNode;
  /** Where in the document it is put. Default `document.body`. */
  container?: Popover.Portal.Props['container'];
  className?: string;
}

/** The list, in the layout the root's `variant` names. */
function ModelPickerContent({
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  placeholder = 'Search models…',
  emptyText = 'No models match',
  container,
  className,
  ...props
}: ModelPickerContentProps) {
  const picker = usePicker('ModelPicker.Content');
  const { variant } = picker;
  const slots = pickerVariants({ variant });
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const firstFilter = (): Filter =>
    variant === 'rail' ? (picker.favorites.size > 0 ? 'favorites' : (picker.providerList[0]?.value ?? 'all')) : 'all';
  const [filter, setFilter] = useState<Filter>(firstFilter);
  const [highlighted, setHighlighted] = useState<ModelPickerItem | undefined>(undefined);

  // Each opening starts afresh: no search left over from the last one.
  useEffect(() => {
    if (!picker.open) return;
    setQuery('');
    setFilter(firstFilter());
    setHighlighted(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker.open]);

  // Searching looks through every model, whatever the filter.
  const visible = useMemo(() => {
    if (query.trim()) return picker.items.filter((item) => matches(item, picker.providers.get(item.provider), query));
    if (filter === 'favorites') return picker.items.filter((item) => picker.favorites.has(item.value));
    if (filter === 'all') return [...picker.items];
    return picker.items.filter((item) => item.provider === filter);
    // The favourites are read when the filter changes, not as they are starred,
    // so starring a row does not pull it out from under the pointer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter, picker.items, picker.providers]);

  const groups = useMemo<Group[]>(() => {
    if (variant !== 'list') return [];
    const result: Group[] = [];
    const starred = query.trim() ? [] : visible.filter((item) => picker.favorites.has(item.value));
    if (starred.length > 0) result.push({ value: 'favorites', label: 'Starred', icon: <StarIcon filled />, items: starred });
    for (const provider of picker.providerList) {
      const own = visible.filter((item) => item.provider === provider.value && !starred.includes(item));
      if (own.length > 0) result.push({ value: provider.value, label: provider.label, icon: provider.icon, items: own });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, visible, query, picker.providerList]);

  // The order the rows are shown in, which ⌘1 to ⌘9 count along.
  const ordered = variant === 'list' ? groups.flatMap((group) => group.items) : visible;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const digit = /^Digit([1-9])$/.exec(event.code);
    if (digit && event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      const item = ordered[Number(digit[1]) - 1];
      event.preventDefault();
      if (item && !item.disabled) picker.choose(item.value);
      return;
    }
    if (event.altKey && !event.metaKey && !event.ctrlKey && isKey(event, 's') && highlighted) {
      event.preventDefault();
      picker.toggleFavorite(highlighted.value);
    }
  }

  const list =
    variant === 'list' ? (
      <Autocomplete.List className={slots.list()}>
        {(group: Group) => (
          <Autocomplete.Group key={group.value} items={group.items}>
            <Autocomplete.GroupLabel className={slots.groupLabel()}>
              <span aria-hidden="true" className="flex">
                {group.icon}
              </span>
              {group.label}
            </Autocomplete.GroupLabel>
            <Autocomplete.Collection>{(item: ModelPickerItem) => <Row key={item.value} item={item} />}</Autocomplete.Collection>
          </Autocomplete.Group>
        )}
      </Autocomplete.List>
    ) : variant === 'cards' ? (
      <Autocomplete.List className={slots.list()}>
        {chunk(visible, 2).map((row, index) => (
          <Autocomplete.Row key={index} className={slots.cardRow()}>
            {row.map((item) => (
              <Card key={item.value} item={item} />
            ))}
          </Autocomplete.Row>
        ))}
      </Autocomplete.List>
    ) : (
      <Autocomplete.List className={slots.list()}>{(item: ModelPickerItem) => <Row key={item.value} item={item} />}</Autocomplete.List>
    );

  const source = (variant === 'list' ? groups : visible) as unknown as ModelPickerItem[];
  const shown = highlighted ?? picker.items.find((item) => item.value === picker.value);

  return (
    <Popover.Portal container={container}>
      <Popover.Positioner side={side} align={align} sideOffset={sideOffset} collisionPadding={8} className={slots.positioner()}>
        <Popover.Popup
          data-slot="model-picker-content"
          data-variant={variant}
          data-instant={picker.instant ? '' : undefined}
          aria-label={`Choose a ${picker.label.toLowerCase()}`}
          initialFocus={input}
          className={slots.popup({ className })}
          onKeyDown={onKeyDown}
          {...props}
        >
          <Autocomplete.Root
            inline
            open
            // Grouped for `list`, flat for the rest; the two shapes are one prop.
            items={source}
            filteredItems={source}
            grid={variant === 'cards'}
            filter={null}
            itemToStringValue={(item: ModelPickerItem) => item.label}
            value={query}
            onValueChange={(next, details) => {
              if (details.reason !== 'item-press') setQuery(next);
            }}
            onItemHighlighted={(item) => setHighlighted(item as ModelPickerItem | undefined)}
            autoHighlight="always"
            keepHighlight
          >
            <RowContext.Provider value={{ picker, slots, ordered }}>
            {variant === 'rail' ? (
              <div role="toolbar" aria-orientation="vertical" aria-label="Filter by provider" className={slots.rail()}>
                <Tooltip.Provider>
                  <RailButton label="Starred" on={filter === 'favorites' && !query} onPress={() => setFilter('favorites')}>
                    <StarIcon filled />
                  </RailButton>
                  <span aria-hidden="true" className={slots.railSeparator()} />
                  {picker.providerList.map((provider) => (
                    <RailButton
                      key={provider.value}
                      label={provider.label}
                      status={provider.status}
                      on={filter === provider.value && !query}
                      onPress={() => setFilter(provider.value)}
                    >
                      {provider.icon}
                    </RailButton>
                  ))}
                </Tooltip.Provider>
              </div>
            ) : null}

            <div className={slots.main()}>
              <div className={slots.searchRow()}>
                <Autocomplete.InputGroup className={slots.search()}>
                  <SearchIcon />
                  <Autocomplete.Input
                    ref={input}
                    aria-label={`Search ${picker.label.toLowerCase()}s`}
                    placeholder={placeholder}
                    className={slots.searchInput()}
                  />
                </Autocomplete.InputGroup>
              </div>
              {variant === 'cards' ? (
                <div role="toolbar" aria-label="Filter by provider" className={slots.chips()}>
                  {[{ value: 'all', label: 'All', icon: null as ReactNode }, ...picker.providerList].map((provider) => (
                    <button
                      key={provider.value}
                      type="button"
                      aria-pressed={filter === provider.value && !query}
                      className={slots.chip()}
                      onClick={() => setFilter(provider.value)}
                    >
                      {provider.icon ? <span aria-hidden="true" className="flex">{provider.icon}</span> : null}
                      {provider.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {variant === 'compare' ? (
                <div aria-hidden="true" className={slots.tableHead()}>
                  <span className="flex-1">Model</span>
                  <span className={slots.column()}>Speed</span>
                  <span className={slots.column()}>Smarts</span>
                  <span className={slots.priceColumn()}>Price</span>
                  <span className="w-4" />
                </div>
              ) : null}
              {/* Always in the tree, so the padding goes on what it holds while the list is empty. */}
              <Autocomplete.Empty>
                <div className={slots.empty()}>{emptyText}</div>
              </Autocomplete.Empty>
              {list}
            </div>

            {variant === 'detail' && shown ? <Pane item={shown} /> : null}
            </RowContext.Provider>
          </Autocomplete.Root>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}
ModelPickerContent.displayName = 'ModelPicker.Content';

function RailButton({
  label,
  status,
  on,
  onPress,
  children,
}: {
  label: string;
  status?: ModelPickerProvider['status'];
  on: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const slots = pickerVariants();
  return (
    <Tooltip>
      <Tooltip.Trigger
        render={<button type="button" aria-pressed={on} aria-label={label} className={slots.railButton()} onClick={onPress} />}
      >
        {children}
        {on ? <span aria-hidden="true" className={slots.railMark()} /> : null}
        {status === 'new' ? <span aria-hidden="true" className={slots.railStatus({ className: 'bg-info' })} /> : null}
        {status === 'limited' ? (
          <span aria-hidden="true" className={slots.railStatus({ className: 'bg-muted text-muted-foreground [&_svg]:size-2.5' })}>
            <ClockIcon />
          </span>
        ) : null}
      </Tooltip.Trigger>
      <Tooltip.Content side="right">
        {label}
        {status === 'new' ? ' · New' : status === 'limited' ? ' · Rate-limited' : ''}
      </Tooltip.Content>
    </Tooltip>
  );
}

export const ModelPicker = Object.assign(ModelPickerRoot, {
  Trigger: ModelPickerTrigger,
  Content: ModelPickerContent,
});

export { ModelPickerTrigger, ModelPickerContent };
