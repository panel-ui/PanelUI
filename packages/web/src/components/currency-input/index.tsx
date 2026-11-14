'use client';

/**
 * CurrencyInput — an amount in the currency it is counted in, in one card.
 *
 * ```tsx
 * <CurrencyInput currencies={CURRENCIES} defaultValue={{ code: 'USD', amount: 250 }}>
 * ```
 *
 * ## One card
 *
 * What the card is, the amount in large figures, the currency it is in, and a
 * quieter line under them. It is the [Exchange](../exchange) card on its own,
 * for the forms that ask for one amount and currency and nothing else: a
 * budget, a price, what was paid.
 *
 * ## The list opens over the card
 *
 * A currency is chosen from a list that takes over the card while it is open,
 * not from a menu hanging off the pill: the list has room for names as well as
 * codes, and nothing else on the control means anything while the choice is
 * being made. Its header is the card's own label, so the list reads as
 * belonging to that field and to no other.
 *
 * ## Room to open
 *
 * The list opens towards whichever side of the container it sits in has room:
 * over the card where it is deep enough, upwards from it where a phone's
 * keyboard has taken the space below. The container is the nearest ancestor
 * that clips — a card, a dialog, a scroll — or the viewport where nothing
 * does, so the rows stop at the edge that would actually cut them off. It
 * measures again while it is open, so a window that changes under it is
 * followed.
 *
 * ## Rates come from nowhere
 *
 * No rate is involved, and none is asked for. Changing the currency changes
 * what the figure means, not the figure itself — the amount is rounded to the
 * new currency's minor unit when it has more digits than that unit holds.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { ScrollArea } from '../scroll-area';
import { parseAmount } from './parse';

/** A theme role for a currency's mark. */
export type CurrencyColor =
  | 'neutral'
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5';

const COLOR_VAR: Record<Exclude<CurrencyColor, 'neutral'>, string> = {
  primary: 'var(--primary)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  'chart-1': 'var(--chart-1)',
  'chart-2': 'var(--chart-2)',
  'chart-3': 'var(--chart-3)',
  'chart-4': 'var(--chart-4)',
  'chart-5': 'var(--chart-5)',
};

export interface CurrencyOption {
  /** The code it is known by, such as `USD`. Unique in the list. */
  code: string;
  /** Its name, shown beside the code in the list: "US dollar". */
  name: string;
  /** Drawn in its mark: `$`, `€`. Defaults to the code's first letter. */
  symbol?: string;
  /** Digits after the point. Defaults to `2`; `0` for a currency with no minor unit. */
  decimals?: number;
  /** The mark's colour, as a theme role. Default `neutral`. */
  color?: CurrencyColor;
}

export interface CurrencyValue {
  /** Code of the currency the amount is counted in. */
  code: string;
  /** The amount typed, or `null` while the field is empty. */
  amount: number | null;
}

const currencyInputVariants = tv({
  slots: {
    root: 'relative w-full max-w-sm text-foreground',
    card: [
      'relative flex flex-col rounded-[22px] bg-card px-5 pb-4 pt-3.5 text-card-foreground',
      'shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.18)] ring-1 ring-foreground/[0.06] dark:ring-foreground/10',
      'focus-within:ring-foreground/15',
    ],
    label: 'text-sm text-muted-foreground',
    row: 'mt-1.5 flex items-center gap-3',
    amount: [
      'w-full min-w-0 flex-1 bg-transparent text-[32px] font-medium leading-10 tracking-tight tabular-nums outline-none',
      'placeholder:text-muted-foreground/50 disabled:cursor-not-allowed',
    ],
    pill: [
      'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-muted pe-3 ps-1.5 text-sm font-semibold outline-none',
      'transition-[background-color,scale] duration-150 hover:bg-foreground/10 active:scale-[0.97]',
      'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
    ],
    mark: 'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold leading-none',
    detail: 'mt-1 truncate text-sm tabular-nums text-muted-foreground',
    // An overlay raised above the card it covers, so it reads as in front of it
    // wherever the card sits: a page, a card, a Frame. Which edge it hangs from
    // is the side with room, decided when it opens.
    list: [
      'absolute inset-x-0 z-10 flex flex-col self-start rounded-[22px] bg-card p-2 text-card-foreground',
      'shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.18)] ring-1 ring-foreground/[0.06] dark:ring-foreground/10',
      'transition-[opacity,scale] duration-200 ease-out data-hidden:pointer-events-none data-hidden:scale-[0.98] data-hidden:opacity-0',
      'motion-reduce:transition-none',
    ],
    listHeader: 'flex items-center justify-between px-3 pb-1 pt-1.5 text-sm text-muted-foreground',
    listClose: [
      'inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none',
      'hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4',
    ],
    listScroll: 'rounded-[14px]',
    listViewport: 'max-h-[min(18rem,var(--currency-input-room,18rem))]',
    listItems: 'flex flex-col',
    item: [
      'flex h-11 shrink-0 cursor-pointer select-none items-center gap-3 rounded-[14px] px-3 text-sm outline-none',
      'transition-colors duration-100 hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.07]',
      'data-selected:bg-foreground/[0.04] motion-reduce:transition-none',
    ],
    itemCode: 'font-semibold',
    itemName: 'min-w-0 flex-1 truncate text-muted-foreground',
    itemCheck: 'size-4 shrink-0 text-foreground',
  },
  variants: {
    /** Which edge the open list hangs from: the side with room. */
    above: {
      false: { list: 'top-0 origin-top' },
      true: { list: 'bottom-0 origin-bottom' },
    },
  },
  defaultVariants: {
    above: false,
  },
});

/** Relative luminance of a resolved CSS colour, read back through a one-pixel canvas. */
function luminanceOf(color: string, context: CanvasRenderingContext2D): number | null {
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#000';
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  if (a === 0) return null;
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r!) + 0.7152 * linear(g!) + 0.0722 * linear(b!);
}

/**
 * Which of the theme's foreground and background reads better on each mark's
 * colour. The roles are light in one theme and dark in the other, so the
 * symbol's ink is measured per colour, and again when the theme changes.
 */
function useMarkInk(probe: { current: HTMLElement | null }, colors: readonly string[]) {
  const [ink, setInk] = useState<Record<string, string>>({});
  const key = colors.join('|');
  useEffect(() => {
    const host = probe.current;
    if (!host || typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const measure = () => {
      const style = getComputedStyle(host);
      const resolve = (value: string) => {
        host.style.color = value;
        return getComputedStyle(host).color;
      };
      const foreground = luminanceOf(resolve('var(--foreground)'), context) ?? 0;
      const background = luminanceOf(resolve('var(--background)'), context) ?? 1;
      const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const next: Record<string, string> = {};
      for (const color of key.split('|')) {
        if (!color) continue;
        const fill = luminanceOf(resolve(color), context);
        next[color] =
          fill === null || contrast(fill, foreground) >= contrast(fill, background)
            ? 'var(--foreground)'
            : 'var(--background)';
      }
      host.style.color = style.color;
      setInk((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      scheme.removeEventListener('change', measure);
    };
  }, [probe, key]);
  return ink;
}

interface CurrencyInputContextValue {
  /** The ink a mark's symbol is drawn in, by its fill. */
  inkOf: (fill: string) => string;
  currencies: readonly CurrencyOption[];
  byCode: ReadonlyMap<string, CurrencyOption>;
  value: Required<CurrencyValue>;
  /** The card's label, which the open list's header shows. */
  label?: ReactNode;
  locale: string;
  disabled: boolean;
  picking: boolean;
  setPicking: (open: boolean) => void;
  setAmount: (amount: number | null) => void;
  choose: (code: string) => void;
  registerCard: (node: HTMLElement | null) => void;
  registerPill: (node: HTMLButtonElement | null) => void;
  /** Which edge the open list hangs from. */
  placement: 'below' | 'above';
  /** The rows' maximum height in pixels, from the room the viewport has. */
  room: number | null;
  /** How far the anchored edge is pulled back inside a viewport the card straddles. */
  shift: number;
}

const CurrencyInputContext = createContext<CurrencyInputContextValue | null>(null);

function useCurrencyInput(component: string): CurrencyInputContextValue {
  const context = useContext(CurrencyInputContext);
  if (!context) throw new Error(`${component} must be used within a <CurrencyInput>`);
  return context;
}

/** Sets `inert` as a property, which every React version passes through. */
const setInert = (node: HTMLElement | null, inert: boolean) => {
  if (node) node.inert = inert;
};

const decimalsOf = (currency: CurrencyOption | undefined) => Math.max(0, Math.min(8, currency?.decimals ?? 2));

/*
 * The open list's own size, and what it leaves of the viewport's.
 *
 * LIST_HEIGHT is the list at its tallest: the header, a viewport of 18rem of
 * rows, the padding and the ring. LIST_CHROME is everything around the rows,
 * which is what comes off the room before the rows' cap is set. LIST_MARGIN
 * keeps a breath of the page visible under the list's edge.
 */
const LIST_HEIGHT = 344;
const LIST_CHROME = 56;
const LIST_ROWS_MIN = 96;
const LIST_MARGIN = 12;

/** Rounds to a currency's minor unit, so the figure held is one that could be paid. */
const roundTo = (amount: number, decimals: number) => {
  const scale = 10 ** decimals;
  return Math.round(amount * scale) / scale;
};

/**
 * The nearest ancestor that clips what it holds, between the card and the
 * viewport: a card, a dialog, a preview frame, a scroll container. The list
 * takes its room from that, not from the viewport, because it is the edge
 * that will actually cut it off.
 */
function clippingAncestorOf(node: HTMLElement): HTMLElement | null {
  let parent = node.parentElement;
  while (parent && parent !== document.documentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent);
    if (overflowX !== 'visible' || overflowY !== 'visible') return parent;
    parent = parent.parentElement;
  }
  return null;
}

/** The disc colour of a currency's mark. */
const fillOf = (currency: CurrencyOption | undefined) =>
  currency?.color && currency.color !== 'neutral' ? COLOR_VAR[currency.color] : 'var(--foreground)';

/** A currency's mark: its symbol in a disc of its colour. */
function CurrencyMark({ currency }: { currency: CurrencyOption | undefined }) {
  const slots = currencyInputVariants();
  const { inkOf } = useCurrencyInput('CurrencyInput');
  const fill = fillOf(currency);
  return (
    <span aria-hidden="true" className={slots.mark()} style={{ background: fill, color: inkOf(fill) }}>
      {currency?.symbol ?? currency?.code.slice(0, 1) ?? '?'}
    </span>
  );
}

export interface CurrencyInputProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** Every currency that can be chosen, in the order the list shows them. */
  currencies: readonly CurrencyOption[];
  /** What the card is, above its amount: "Budget", "You pay". */
  label?: ReactNode;
  /** The currency and the amount, when you hold them. */
  value?: CurrencyValue;
  /** The currency and the amount to start with, when the control holds them. */
  defaultValue?: CurrencyValue;
  /** Called with every change: a figure typed or cleared, a currency chosen. */
  onValueChange?: (value: Required<CurrencyValue>) => void;
  /** Shown in an empty field. Default `0`. */
  placeholder?: string;
  /** The quieter line under the amount: a balance, what the amount covers. */
  detail?: ReactNode;
  /** The locale figures are written in. Default `en-US`. */
  locale?: string;
  /** Shows the figures but takes no input. */
  disabled?: boolean;
}

/** The control: the card and, over it while it is open, the currency list. */
function CurrencyInputRoot({
  currencies,
  value: valueProp,
  defaultValue,
  onValueChange,
  label,
  placeholder = '0',
  detail,
  locale = 'en-US',
  disabled = false,
  className,
  ...props
}: CurrencyInputProps) {
  const slots = currencyInputVariants();
  const first = currencies[0]?.code ?? '';
  const [inner, setInner] = useState<Required<CurrencyValue>>(() => ({
    code: defaultValue?.code ?? first,
    amount: defaultValue?.amount ?? null,
  }));
  const controlled = valueProp !== undefined;
  const value: Required<CurrencyValue> = controlled ? valueProp : inner;

  const latest = useRef({ value, controlled, onValueChange });
  latest.current = { value, controlled, onValueChange };
  const commit = useCallback((next: Required<CurrencyValue>) => {
    if (!latest.current.controlled) setInner(next);
    latest.current.onValueChange?.(next);
  }, []);

  const byCode = useMemo(() => new Map(currencies.map((currency) => [currency.code, currency])), [currencies]);

  const [picking, setPickingState] = useState(false);
  const [placement, setPlacement] = useState<'below' | 'above'>('below');
  const [room, setRoom] = useState<number | null>(null);
  const [shift, setShift] = useState(0);
  const card = useRef<HTMLElement | null>(null);
  const pill = useRef<HTMLButtonElement | null>(null);

  /*
   * How much room the viewport has for the list, and which side of the card
   * holds more of it. Measured when the list opens and again while it stays
   * open, so a window that changes under it — a phone's keyboard, a drag — is
   * followed rather than left behind.
   */
  const measureRoom = useCallback(() => {
    const node = card.current;
    if (!node || typeof window === 'undefined') return;
    const rect = node.getBoundingClientRect();
    const viewHeight = window.visualViewport?.height ?? window.innerHeight;
    /*
     * The window the list has to fit: the nearest clipping ancestor when
     * there is one, never past the viewport itself. Each edge is pulled back
     * inside it, so a card half scrolled out does not anchor the list past
     * the edge with it.
     */
    const clip = clippingAncestorOf(node)?.getBoundingClientRect() ?? null;
    const boundTop = clip ? Math.max(clip.top, 0) : 0;
    const boundBottom = clip ? Math.min(clip.bottom, viewHeight) : viewHeight;
    const top = Math.max(rect.top, boundTop);
    const bottom = Math.min(rect.bottom, boundBottom);
    const below = boundBottom - top - LIST_MARGIN;
    const above = bottom - boundTop - LIST_MARGIN;
    if (below >= LIST_HEIGHT || below >= above) {
      setPlacement('below');
      setRoom(Math.max(LIST_ROWS_MIN, below - LIST_CHROME));
      setShift(Math.max(0, boundTop - rect.top));
    } else {
      setPlacement('above');
      setRoom(Math.max(LIST_ROWS_MIN, above - LIST_CHROME));
      setShift(Math.max(0, rect.bottom - boundBottom));
    }
  }, []);

  const pickingBefore = useRef(picking);
  pickingBefore.current = picking;
  const setPicking = useCallback(
    (open: boolean) => {
      // Measured with the open, so the list never paints first at full height.
      if (open) measureRoom();
      else if (pickingBefore.current) requestAnimationFrame(() => pill.current?.focus());
      setPickingState(open);
    },
    [measureRoom]
  );

  useEffect(() => {
    if (!picking) return;
    const measure = () => measureRoom();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [picking, measureRoom]);

  const setAmount = useCallback((amount: number | null) => commit({ ...latest.current.value, amount }), [commit]);

  const choose = useCallback(
    (code: string) => {
      const current = latest.current.value;
      // The figure means something new now, so it holds only what the new
      // currency's minor unit can: 10.555 yen becomes 11.
      const amount = current.amount === null ? null : roundTo(current.amount, decimalsOf(byCode.get(code)));
      commit({ code, amount });
      setPicking(false);
    },
    [commit, byCode, setPicking]
  );

  const registerCard = useCallback((node: HTMLElement | null) => {
    card.current = node;
  }, []);
  const registerPill = useCallback((node: HTMLButtonElement | null) => {
    pill.current = node;
  }, []);

  const probe = useRef<HTMLSpanElement>(null);
  const fills = useMemo(() => [...new Set(currencies.map((currency) => fillOf(currency)))], [currencies]);
  const ink = useMarkInk(probe, fills);
  const inkOf = useCallback((fill: string) => ink[fill] ?? 'var(--background)', [ink]);

  const context: CurrencyInputContextValue = {
    inkOf,
    currencies,
    byCode,
    value,
    label,
    locale,
    disabled,
    picking,
    setPicking,
    setAmount,
    choose,
    registerCard,
    registerPill,
    placement,
    room,
    shift,
  };

  return (
    <CurrencyInputContext.Provider value={context}>
      <div data-slot="currency-input" role="group" className={slots.root({ className })} {...props}>
        <div
          // Out of the tab order and the reading order while the list covers it.
          ref={(node) => {
            registerCard(node);
            setInert(node, picking);
          }}
          data-slot="currency-input-card"
          className={slots.card()}
          data-hidden={picking ? '' : undefined}
        >
          <CurrencyCardBody label={label} placeholder={placeholder} detail={detail} />
        </div>
        <CurrencyList />
        {/* Resolves the theme's colours for measuring the marks' ink. */}
        <span ref={probe} aria-hidden="true" className="pointer-events-none absolute size-0 overflow-hidden" />
      </div>
    </CurrencyInputContext.Provider>
  );
}
CurrencyInputRoot.displayName = 'CurrencyInput';

/** The card's label, the amount, the currency it is in and the line under them. */
function CurrencyCardBody({
  label,
  placeholder,
  detail,
}: {
  label?: ReactNode;
  placeholder?: string;
  detail?: ReactNode;
}) {
  const slots = currencyInputVariants();
  const { value, byCode, locale, disabled, setAmount, setPicking, picking, registerPill } =
    useCurrencyInput('CurrencyInput');
  const currency = byCode.get(value.code);
  const decimals = decimalsOf(currency);
  const labelId = useId();

  // While a figure is being typed it is shown as typed; formatted once the field is left.
  const [draft, setDraft] = useState<string | null>(null);
  const formatted =
    value.amount === null
      ? ''
      : new Intl.NumberFormat(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
          useGrouping: true,
        }).format(value.amount);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    // Holds back anything that is not a figure, rather than clearing what was typed.
    const typed = text.replace(/,/g, '');
    if (typed !== '' && !/^\d*\.?\d*$/.test(typed)) return;
    const [, fraction = ''] = typed.split('.');
    if (fraction.length > decimals) return;
    setDraft(text);
    setAmount(parseAmount(text));
  };

  return (
    <>
      {label !== undefined ? (
        <span id={labelId} className={slots.label()}>
          {label}
        </span>
      ) : null}
      <div className={slots.row()}>
        <input
          data-slot="currency-input-amount"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={`Amount in ${currency?.name ?? value.code}`}
          aria-labelledby={label !== undefined ? labelId : undefined}
          placeholder={placeholder}
          disabled={disabled}
          value={draft ?? formatted}
          onChange={onChange}
          onFocus={(event) => {
            setDraft(value.amount === null ? '' : String(value.amount));
            const input = event.currentTarget;
            requestAnimationFrame(() => input.select());
          }}
          onBlur={() => setDraft(null)}
          className={slots.amount()}
        />
        <button
          ref={registerPill}
          type="button"
          data-slot="currency-input-currency"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={picking}
          aria-label={`${currency?.name ?? value.code}, change currency`}
          onClick={() => setPicking(true)}
          className={slots.pill()}
        >
          <CurrencyMark currency={currency} />
          {value.code}
        </button>
      </div>
      {detail != null ? (
        <span data-slot="currency-input-detail" className={slots.detail()}>
          {detail}
        </span>
      ) : null}
    </>
  );
}

/** The currency list, over the card while it is open. */
function CurrencyList() {
  const { picking, setPicking, choose, currencies, value, label, placement, room, shift } =
    useCurrencyInput('CurrencyInput');
  const slots = currencyInputVariants({ above: placement === 'above' });
  const listRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const open = picking;
  const selected = value.code;

  // Opens on the chosen currency, so Enter keeps it and the arrows move from it.
  useEffect(() => {
    if (!open) return;
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role=option]') ?? [])];
    const current = items.find((item) => item.dataset.selected !== undefined) ?? items[0];
    current?.scrollIntoView({ block: 'nearest' });
    current?.focus({ preventScroll: true });
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setPicking(false);
      return;
    }
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role=option]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'ArrowDown'
        ? items[Math.min(index + 1, items.length - 1)]
        : event.key === 'ArrowUp'
          ? items[Math.max(index - 1, 0)]
          : event.key === 'Home'
            ? items[0]
            : event.key === 'End'
              ? items[items.length - 1]
              : undefined;
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  return (
    <div
      ref={(node) => setInert(node, !open)}
      data-slot="currency-input-list"
      className={slots.list()}
      data-hidden={open ? undefined : ''}
      style={
        {
          '--currency-input-room': `${room ?? 288}px`,
          // Pulled back inside the viewport when the card it covers straddles the edge.
          ...(placement === 'above' ? { bottom: shift } : { top: shift }),
        } as unknown as CSSProperties
      }
      onKeyDown={onKeyDown}
    >
      <div className={slots.listHeader()}>
        {/* The card's own label, so the list says which field it is choosing for. */}
        <span id={headingId}>{label ?? 'Currency'}</span>
        <button type="button" aria-label="Close" className={slots.listClose()} onClick={() => setPicking(false)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* A drawn bar over the rows rather than the browser's, with the rows faded where they run on. */}
      <ScrollArea fade className={slots.listScroll()} viewportClassName={slots.listViewport()}>
        <div ref={listRef} role="listbox" aria-labelledby={headingId} className={slots.listItems()}>
          {currencies.map((currency) => {
            const chosen = currency.code === selected;
            return (
              <div
                key={currency.code}
                role="option"
                aria-selected={chosen}
                tabIndex={chosen ? 0 : -1}
                data-selected={chosen ? '' : undefined}
                className={slots.item()}
                onClick={() => open && choose(currency.code)}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && open) {
                    event.preventDefault();
                    choose(currency.code);
                  }
                }}
              >
                <CurrencyMark currency={currency} />
                <span className={slots.itemCode()}>{currency.code}</span>
                <span className={slots.itemName()}>{currency.name}</span>
                {chosen ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={slots.itemCheck()}
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export { parseAmount };
export const CurrencyInput = CurrencyInputRoot;
