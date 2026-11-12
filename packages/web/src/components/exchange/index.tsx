'use client';

/**
 * Exchange — an amount in one currency and what it comes to in another, with
 * the two sides swapped by one press.
 *
 * ```tsx
 * <Exchange currencies={CURRENCIES} rates={RATES} defaultValue={{ from: 'USD', to: 'EUR', amount: 100 }}>
 *   <Exchange.Field side="from" label="You send" />
 *   <Exchange.Swap />
 *   <Exchange.Field side="to" label="They receive" />
 * </Exchange>
 * ```
 *
 * ## Two cards and a seam
 *
 * Each side is a card of its own: what it is, the amount in large figures, the
 * currency it is in, and the rate in a quieter line under it. The swap button
 * sits on the seam between them, so it reads as belonging to both. Pressing it
 * exchanges the cards themselves, figures and all, rather than rewriting the
 * numbers in place, so the reader can see that nothing was recalculated.
 *
 * ## Either side can be typed in
 *
 * The amount belongs to the side it was typed in, and the other side follows
 * from the rate. Typing in the lower card makes it the fixed one, which is how
 * "I need exactly 500 euros there" is asked.
 *
 * ## The list opens in place
 *
 * A currency is chosen from a list that takes over the whole control, not from
 * a menu hanging off the pill: the list has room for names as well as codes,
 * and nothing else on the control means anything while the choice is being
 * made. Choosing the currency already on the other side swaps the two.
 *
 * ## Rates come from you
 *
 * It fetches nothing. Pass `rates`, units of each currency to one unit of any
 * common base, or `convert` for a rule of your own, such as a fee.
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
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { ScrollArea } from '../scroll-area';
import { parseAmount } from './parse';

/** Which of the two cards: what is paid, or what it comes to. */
export type ExchangeSide = 'from' | 'to';

/** A theme role for a currency's mark. */
export type ExchangeColor =
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

const COLOR_VAR: Record<Exclude<ExchangeColor, 'neutral'>, string> = {
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

export interface ExchangeCurrency {
  /** The code it is known by, such as `USD`. Unique in the list. */
  code: string;
  /** Its name, shown beside the code in the list: "US dollar". */
  name: string;
  /** Drawn in its mark: `$`, `€`. Defaults to the code's first letter. */
  symbol?: string;
  /** Digits after the point. Defaults to `2`; `0` for a currency with no minor unit. */
  decimals?: number;
  /** The mark's colour, as a theme role. Default `neutral`. */
  color?: ExchangeColor;
}

export interface ExchangeValue {
  /** Code of the currency paid. */
  from: string;
  /** Code of the currency it comes to. */
  to: string;
  /** The amount typed, or `null` while the field is empty. */
  amount: number | null;
  /** Which card the amount belongs to. The other is worked out from it. Default `from`. */
  side?: ExchangeSide;
}

const exchangeVariants = tv({
  slots: {
    // A zero minimum, so the amount field's own width never pushes the cards wider than the space they are given.
    root: 'relative grid w-full max-w-sm grid-cols-[minmax(0,1fr)] text-foreground',
    stack: [
      'col-start-1 row-start-1 flex flex-col gap-1 transition-[opacity,scale] duration-200 ease-out',
      'data-hidden:pointer-events-none data-hidden:scale-[0.98] data-hidden:opacity-0 motion-reduce:transition-none',
    ],
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
    rate: 'mt-1 truncate text-sm tabular-nums text-muted-foreground',
    // An opaque chip raised off the seam, so it reads on a page, a card or a
    // Frame alike: no ring in the page's colour that shows as a halo elsewhere.
    swap: [
      'relative z-10 -my-[20px] inline-flex size-10 cursor-pointer items-center justify-center self-center rounded-full',
      'bg-[color-mix(in_oklab,var(--card),var(--foreground)_7%)] text-foreground outline-none',
      'shadow-[0_1px_2px_rgb(0_0_0/0.12),0_4px_12px_-4px_rgb(0_0_0/0.25)] ring-1 ring-foreground/10',
      'transition-[background-color,scale] duration-150 hover:bg-[color-mix(in_oklab,var(--card),var(--foreground)_12%)] active:scale-95',
      'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none [&_svg]:size-[18px]',
    ],
    swapIcon: 'transition-transform duration-300 ease-[cubic-bezier(0.3,1.3,0.4,1)] motion-reduce:transition-none',
    list: [
      'col-start-1 row-start-1 flex flex-col self-start rounded-[22px] bg-card p-2 text-card-foreground',
      'shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.18)] ring-1 ring-foreground/[0.06] dark:ring-foreground/10',
      'origin-top transition-[opacity,scale] duration-200 ease-out data-hidden:pointer-events-none data-hidden:scale-[0.98] data-hidden:opacity-0',
      'motion-reduce:transition-none',
    ],
    listHeader: 'flex items-center justify-between px-3 pb-1 pt-1.5 text-sm text-muted-foreground',
    listClose: [
      'inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none',
      'hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4',
    ],
    listScroll: 'rounded-[14px]',
    listViewport: 'max-h-72',
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

interface ExchangeContextValue {
  /** The ink a mark's symbol is drawn in, by its fill. */
  inkOf: (fill: string) => string;
  currencies: readonly ExchangeCurrency[];
  byCode: ReadonlyMap<string, ExchangeCurrency>;
  value: Required<ExchangeValue>;
  /** The amount on each side, worked out from the one typed. */
  amounts: Record<ExchangeSide, number | null>;
  /** Units of `to` per unit of `from`, and back, or `null` without a rate. */
  rate: Record<ExchangeSide, number | null>;
  locale: string;
  disabled: boolean;
  picking: ExchangeSide | null;
  setPicking: (side: ExchangeSide | null) => void;
  setAmount: (side: ExchangeSide, amount: number | null) => void;
  choose: (side: ExchangeSide, code: string) => void;
  swap: () => void;
  /** How many times the sides have been swapped, for the arrow's turn. */
  turns: number;
  register: (side: ExchangeSide, node: HTMLElement | null) => void;
  registerPill: (side: ExchangeSide, node: HTMLButtonElement | null) => void;
}

const ExchangeContext = createContext<ExchangeContextValue | null>(null);

function useExchange(component: string): ExchangeContextValue {
  const context = useContext(ExchangeContext);
  if (!context) throw new Error(`${component} must be used within an <Exchange>`);
  return context;
}

/** Sets `inert` as a property, which every React version passes through. */
const setInert = (node: HTMLElement | null, inert: boolean) => {
  if (node) node.inert = inert;
};

const decimalsOf = (currency: ExchangeCurrency | undefined) => Math.max(0, Math.min(8, currency?.decimals ?? 2));

/** Rounds to a currency's minor unit, so a figure carried across a swap is one that could be paid. */
const roundTo = (amount: number, decimals: number) => {
  const scale = 10 ** decimals;
  return Math.round(amount * scale) / scale;
};

/** A rate with four significant figures, so a small one is not rounded to nothing. */
const formatRate = (rate: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 }).format(rate);

export interface ExchangeProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** Every currency that can be chosen, in the order the list shows them. */
  currencies: readonly ExchangeCurrency[];
  /**
   * How many units of each currency one unit of a common base is worth, keyed
   * by code: `{ USD: 1, EUR: 0.92, JPY: 151.4 }`. Any base works, since only
   * the ratio between two entries is used.
   */
  rates?: Readonly<Record<string, number>>;
  /**
   * Works out an amount in another currency, in place of `rates`: for a fee, a
   * spread, or a rate you fetch per pair. Return `NaN` when there is no rate.
   */
  convert?: (amount: number, from: string, to: string) => number;
  /** The currencies and the amount, when you hold them. */
  value?: ExchangeValue;
  /** The currencies and the amount to start with, when the control holds them. */
  defaultValue?: ExchangeValue;
  /** Called with every change: a figure typed, a currency chosen, a swap. */
  onValueChange?: (value: Required<ExchangeValue>) => void;
  /** The locale figures are written in. Default `en-US`. */
  locale?: string;
  /** Shows the figures but takes no input. */
  disabled?: boolean;
  children?: ReactNode;
}

/** The control: both cards, the swap between them, and the list that opens over them. */
function ExchangeRoot({
  currencies,
  rates,
  convert,
  value: valueProp,
  defaultValue,
  onValueChange,
  locale = 'en-US',
  disabled = false,
  className,
  children,
  ...props
}: ExchangeProps) {
  const slots = exchangeVariants();
  const first = currencies[0]?.code ?? '';
  const second = currencies[1]?.code ?? first;
  const [inner, setInner] = useState<Required<ExchangeValue>>(() => ({
    from: defaultValue?.from ?? first,
    to: defaultValue?.to ?? second,
    amount: defaultValue?.amount ?? null,
    side: defaultValue?.side ?? 'from',
  }));
  const controlled = valueProp !== undefined;
  const value: Required<ExchangeValue> = controlled ? { side: 'from', ...valueProp } : inner;

  const latest = useRef({ value, controlled, onValueChange });
  latest.current = { value, controlled, onValueChange };
  const commit = useCallback((next: Required<ExchangeValue>) => {
    if (!latest.current.controlled) setInner(next);
    latest.current.onValueChange?.(next);
  }, []);

  const byCode = useMemo(() => new Map(currencies.map((currency) => [currency.code, currency])), [currencies]);

  const convertWith = useCallback(
    (amount: number, from: string, to: string) => {
      if (from === to) return amount;
      if (convert) return convert(amount, from, to);
      const a = rates?.[from];
      const b = rates?.[to];
      return a && b ? (amount / a) * b : Number.NaN;
    },
    [convert, rates]
  );

  const amounts = useMemo(() => {
    const other: ExchangeSide = value.side === 'from' ? 'to' : 'from';
    const result: Record<ExchangeSide, number | null> = {
      from: null,
      to: null,
    };
    result[value.side] = value.amount;
    if (value.amount !== null) {
      const worked = convertWith(value.amount, value[value.side], value[other]);
      result[other] = Number.isFinite(worked) ? roundTo(worked, decimalsOf(byCode.get(value[other]))) : null;
    }
    return result;
  }, [value, convertWith, byCode]);

  const rate = useMemo(() => {
    const forward = convertWith(1, value.from, value.to);
    const back = convertWith(1, value.to, value.from);
    return {
      from: Number.isFinite(forward) ? forward : null,
      to: Number.isFinite(back) ? back : null,
    };
  }, [value.from, value.to, convertWith]);

  const [picking, setPickingState] = useState<ExchangeSide | null>(null);
  const [turns, setTurns] = useState(0);
  const cards = useRef<Record<ExchangeSide, HTMLElement | null>>({
    from: null,
    to: null,
  });
  const pills = useRef<Record<ExchangeSide, HTMLButtonElement | null>>({
    from: null,
    to: null,
  });

  const setPicking = useCallback((side: ExchangeSide | null) => {
    setPickingState((current) => {
      // Focus goes back to the pill the list was opened from.
      if (side === null && current) requestAnimationFrame(() => pills.current[current]?.focus());
      return side;
    });
  }, []);

  const setAmount = useCallback(
    (side: ExchangeSide, amount: number | null) => commit({ ...latest.current.value, amount, side }),
    [commit]
  );

  /*
   * The cards trade places. Their contents have already been exchanged by the
   * time this runs, so each is started from where the other one was and moved
   * home: the figures are seen to travel with their card.
   */
  const animateSwap = useCallback(() => {
    const top = cards.current.from;
    const bottom = cards.current.to;
    if (!top || !bottom || typeof top.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const distance = bottom.offsetTop - top.offsetTop;
    const timing = { duration: 420, easing: 'cubic-bezier(0.3, 1.15, 0.4, 1)' };
    top.animate([{ transform: `translateY(${distance}px)` }, { transform: 'none' }], timing);
    bottom.animate([{ transform: `translateY(${-distance}px)` }, { transform: 'none' }], timing);
  }, []);

  const swap = useCallback(() => {
    const current = latest.current.value;
    // The amount stays with its card, so the card that was below arrives on top
    // with the figure it showed there.
    commit({
      from: current.to,
      to: current.from,
      amount: current.amount,
      side: current.side === 'from' ? 'to' : 'from',
    });
    setTurns((count) => count + 1);
    requestAnimationFrame(animateSwap);
  }, [commit, animateSwap]);

  const choose = useCallback(
    (side: ExchangeSide, code: string) => {
      const current = latest.current.value;
      const other: ExchangeSide = side === 'from' ? 'to' : 'from';
      // The currency already on the other side: the two trade places.
      if (code === current[other]) commit({ ...current, from: current.to, to: current.from });
      else commit({ ...current, [side]: code });
      setPicking(null);
    },
    [commit, setPicking]
  );

  const register = useCallback((side: ExchangeSide, node: HTMLElement | null) => {
    cards.current[side] = node;
  }, []);
  const registerPill = useCallback((side: ExchangeSide, node: HTMLButtonElement | null) => {
    pills.current[side] = node;
  }, []);

  const probe = useRef<HTMLSpanElement>(null);
  const fills = useMemo(() => [...new Set(currencies.map((currency) => fillOf(currency)))], [currencies]);
  const ink = useMarkInk(probe, fills);
  const inkOf = useCallback((fill: string) => ink[fill] ?? 'var(--background)', [ink]);

  const context: ExchangeContextValue = {
    inkOf,
    currencies,
    byCode,
    value,
    amounts,
    rate,
    locale,
    disabled,
    picking,
    setPicking,
    setAmount,
    choose,
    swap,
    turns,
    register,
    registerPill,
  };

  return (
    <ExchangeContext.Provider value={context}>
      <div data-slot="exchange" role="group" className={slots.root({ className })} {...props}>
        <div
          // Out of the tab order and the reading order while the list covers it.
          ref={(node) => setInert(node, picking !== null)}
          data-slot="exchange-stack"
          className={slots.stack()}
          data-hidden={picking ? '' : undefined}
        >
          {children}
        </div>
        <ExchangeList />
        {/* Resolves the theme's colours for measuring the marks' ink. */}
        <span ref={probe} aria-hidden="true" className="pointer-events-none absolute size-0 overflow-hidden" />
      </div>
    </ExchangeContext.Provider>
  );
}
ExchangeRoot.displayName = 'Exchange';

/** The disc colour of a currency's mark. */
const fillOf = (currency: ExchangeCurrency | undefined) =>
  currency?.color && currency.color !== 'neutral' ? COLOR_VAR[currency.color] : 'var(--foreground)';

/** A currency's mark: its symbol in a disc of its colour. */
function CurrencyMark({ currency }: { currency: ExchangeCurrency | undefined }) {
  const slots = exchangeVariants();
  const { inkOf } = useExchange('Exchange');
  const fill = fillOf(currency);
  return (
    <span aria-hidden="true" className={slots.mark()} style={{ background: fill, color: inkOf(fill) }}>
      {currency?.symbol ?? currency?.code.slice(0, 1) ?? '?'}
    </span>
  );
}

export interface ExchangeFieldProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Which card this is. */
  side: ExchangeSide;
  /** What the card is, above its amount: "You pay", "They receive". */
  label: ReactNode;
  /** Shown in an empty field. Default `0`. */
  placeholder?: string;
  /**
   * The quieter line under the amount. Defaults to the rate from this card's
   * currency to the other one; pass `null` for none.
   */
  detail?: ReactNode;
}

/** One side: its label, the amount, the currency it is in and the rate under it. */
function ExchangeField({ side, label, placeholder = '0', detail, className, ...props }: ExchangeFieldProps) {
  const slots = exchangeVariants();
  const exchange = useExchange('Exchange.Field');
  const { value, amounts, byCode, locale, disabled, rate } = exchange;
  const code = value[side];
  const currency = byCode.get(code);
  const other = byCode.get(value[side === 'from' ? 'to' : 'from']);
  const decimals = decimalsOf(currency);
  const labelId = useId();

  // While a figure is being typed it is shown as typed; formatted once the field is left.
  const [draft, setDraft] = useState<string | null>(null);
  const amount = amounts[side];
  // The worked-out side shows the currency's whole minor unit, 216.50 not 216.5;
  // the typed side shows what was typed.
  const worked = value.side !== side;
  const formatted =
    amount === null
      ? ''
      : new Intl.NumberFormat(locale, {
          minimumFractionDigits: worked ? decimals : 0,
          maximumFractionDigits: decimals,
          useGrouping: true,
        }).format(amount);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    // Holds back anything that is not a figure, rather than clearing what was typed.
    const typed = text.replace(/,/g, '');
    if (typed !== '' && !/^\d*\.?\d*$/.test(typed)) return;
    const [, fraction = ''] = typed.split('.');
    if (fraction.length > decimals) return;
    setDraft(text);
    exchange.setAmount(side, parseAmount(text));
  };

  const perUnit = rate[side];
  const line =
    detail !== undefined
      ? detail
      : perUnit !== null && other
        ? `1 ${code} = ${formatRate(perUnit, locale)} ${other.code}`
        : null;

  return (
    <div
      ref={(node) => exchange.register(side, node)}
      data-slot="exchange-field"
      data-side={side}
      role="group"
      aria-labelledby={labelId}
      className={slots.card({ className })}
      {...props}
    >
      <span id={labelId} className={slots.label()}>
        {label}
      </span>
      <div className={slots.row()}>
        <input
          data-slot="exchange-amount"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={`${typeof label === 'string' ? label : 'Amount'} in ${currency?.name ?? code}`}
          placeholder={placeholder}
          disabled={disabled}
          value={draft ?? formatted}
          onChange={onChange}
          onFocus={(event) => {
            setDraft(amount === null ? '' : String(amount));
            const input = event.currentTarget;
            requestAnimationFrame(() => input.select());
          }}
          onBlur={() => setDraft(null)}
          className={slots.amount()}
        />
        <button
          ref={(node) => exchange.registerPill(side, node)}
          type="button"
          data-slot="exchange-currency"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={exchange.picking === side}
          aria-label={`${currency?.name ?? code}, change currency`}
          onClick={() => exchange.setPicking(side)}
          className={slots.pill()}
        >
          <CurrencyMark currency={currency} />
          {code}
        </button>
      </div>
      {line !== null ? (
        <span data-slot="exchange-detail" className={slots.rate()}>
          {line}
        </span>
      ) : null}
    </div>
  );
}
ExchangeField.displayName = 'Exchange.Field';

export interface ExchangeSwapProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** What a screen reader calls the button. Default "Swap currencies". */
  'aria-label'?: string;
}

/** The round button on the seam: the two cards trade places. */
function ExchangeSwap({
  className,
  onClick,
  'aria-label': ariaLabel = 'Swap currencies',
  ...props
}: ExchangeSwapProps) {
  const slots = exchangeVariants();
  const exchange = useExchange('Exchange.Swap');
  return (
    <button
      type="button"
      data-slot="exchange-swap"
      aria-label={ariaLabel}
      disabled={exchange.disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) exchange.swap();
      }}
      className={slots.swap({ className })}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={slots.swapIcon()}
        // Half a turn per swap, always the same way round.
        style={{ transform: `rotate(${exchange.turns * 180}deg)` }}
      >
        <path d="M12 5v14" />
        <path d="m6 13 6 6 6-6" />
      </svg>
    </button>
  );
}
ExchangeSwap.displayName = 'Exchange.Swap';

/** The currency list, over both cards while a side is being chosen. */
function ExchangeList() {
  const slots = exchangeVariants();
  const { picking, setPicking, choose, currencies, value } = useExchange('Exchange');
  const listRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const open = picking !== null;
  const selected = picking ? value[picking] : undefined;

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
      setPicking(null);
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
      data-slot="exchange-list"
      className={slots.list()}
      data-hidden={open ? undefined : ''}
      onKeyDown={onKeyDown}
    >
      <div className={slots.listHeader()}>
        <span id={headingId}>{picking === 'to' ? 'Convert to' : 'Convert from'}</span>
        <button type="button" aria-label="Close" className={slots.listClose()} onClick={() => setPicking(null)}>
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
                onClick={() => picking && choose(picking, currency.code)}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && picking) {
                    event.preventDefault();
                    choose(picking, currency.code);
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

export const Exchange = Object.assign(ExchangeRoot, {
  Field: ExchangeField,
  Swap: ExchangeSwap,
});

export { ExchangeField, ExchangeSwap, exchangeVariants, parseAmount };
