/**
 * Pagination — moving through a result set one page at a time.
 *
 * The component owns the arithmetic and nothing else. Give it how many pages
 * there are and which one you are on, and it works out which numbers to show,
 * where the gaps fall, and which controls are dead at the ends; it never fetches
 * and never slices, because the data is yours.
 *
 * ```tsx
 * <Pagination count={12} page={page} onPageChange={setPage} />
 * ```
 *
 * Three presentations, because a phone is not a desktop:
 *
 * - `numbers` — the full run, with the middle folded into ellipses. Fits about
 *   seven targets across a phone, which is what `siblings` and `boundaries`
 *   are tuned for.
 * - `compact` — the two arrows with `3 / 12` between them. Digits and a slash,
 *   so there is no sentence to translate.
 * - `simple` — labelled Previous and Next, for a flow you walk rather than
 *   jump around in: a wizard, an article, a set of onboarding cards.
 *
 * Every target is at least 44pt in both axes, and the small size keeps that
 * reach with `hitSlop` rather than by growing — the row gets denser, the
 * fingers do not get smaller.
 *
 * An ellipsis is a button, not punctuation. A dead 44pt target in the middle of
 * a row of live ones is a thing people tap and then think is broken, so tapping
 * one jumps `pageJump` pages that way.
 *
 * Given children, the root becomes a row with them on the leading edge and the
 * controls on the trailing one — which is where `Pagination.Status` goes:
 *
 * ```tsx
 * <Pagination count={12} page={page} onPageChange={setPage} variant="compact">
 *   <Pagination.Status page={page} pageSize={20} total={240} />
 * </Pagination>
 * ```
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { ChevronLeftIcon, ChevronRightIcon, EllipsisIcon } from '../../icons';
import { useDirection } from '../../hooks/use-direction';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import type { TextRef, ViewRef } from '../../primitives/refs';

export type PaginationVariant = 'numbers' | 'compact' | 'simple';
export type PaginationSize = 'sm' | 'default';

/**
 * What the small size gives back as padding. 44pt is the smallest target a
 * finger reliably hits, and the row is allowed to get tighter than that only
 * because the reach is restored outside the paint — so this is exactly the
 * difference between the small target's 32pt and that 44.
 */
const SMALL_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 } as const;

const paginationVariants = tv({
  slots: {
    root: 'flex-row items-center',
    list: 'flex-row items-center',
    item: 'items-center justify-center rounded-lg',
    itemLabel: 'font-medium tabular-nums',
    ellipsis: 'items-center justify-center',
    status: 'text-muted-foreground tabular-nums',
    summary: 'text-muted-foreground tabular-nums',
  },
  variants: {
    size: {
      default: {
        list: 'gap-1',
        item: 'h-11 min-w-11 px-1',
        itemLabel: 'text-sm',
        ellipsis: 'h-11 w-11',
        status: 'text-sm',
        summary: 'text-sm',
      },
      sm: {
        list: 'gap-0.5',
        item: 'h-8 min-w-8 px-1',
        itemLabel: 'text-xs',
        ellipsis: 'h-8 w-8',
        status: 'text-xs',
        summary: 'text-xs',
      },
    },
    /** Whether the item is the page you are on. */
    current: {
      true: { item: 'bg-primary', itemLabel: 'text-primary-foreground' },
      false: { itemLabel: 'text-foreground' },
    },
    disabled: {
      true: { item: 'opacity-[0.4]' },
    },
  },
  defaultVariants: {
    size: 'default',
    current: false,
  },
});

const iconSize: Record<PaginationSize, number> = { default: 20, sm: 16 };

/**
 * The state every part reads. A `Pagination.Previous` dropped into a row of
 * your own still knows which page it is on and whether it is at the start,
 * because that answer lives here rather than in the props it was given.
 */
interface PaginationContextValue {
  page: number;
  count: number;
  size: PaginationSize;
  disabled: boolean;
  goTo: (page: number) => void;
}

const PaginationContext = createContext<PaginationContextValue | null>(null);

function usePagination(part: string): PaginationContextValue {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error(`${part} must be used inside <Pagination>.`);
  }
  return context;
}

const range = (start: number, end: number): number[] =>
  end < start ? [] : Array.from({ length: end - start + 1 }, (_, i) => start + i);

export type PaginationItemValue = number | 'start-ellipsis' | 'end-ellipsis';

/**
 * Which numbers to draw, and where the gaps go.
 *
 * The run is a fixed width rather than a sliding window: the same number of
 * targets whichever page you are on, so the row does not reflow under the
 * finger as you step through it and the arrow you were aiming at stays put.
 * `boundaries` pins the ends, `siblings` pads the middle, and a gap of exactly
 * one page is drawn as that page instead of an ellipsis — a `…` that hides a
 * single number is longer than the number.
 *
 * Exported because a caller sometimes needs the same run for a control of their
 * own, and two implementations of this would drift.
 */
export function paginationRange({
  count,
  page,
  siblings = 1,
  boundaries = 1,
}: {
  count: number;
  page: number;
  siblings?: number;
  boundaries?: number;
}): PaginationItemValue[] {
  const startPages = range(1, Math.min(boundaries, count));
  const endPages = range(Math.max(count - boundaries + 1, boundaries + 1), count);

  const siblingsStart = Math.max(
    Math.min(page - siblings, count - boundaries - siblings * 2 - 1),
    boundaries + 2
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblings, boundaries + siblings * 2 + 2),
    endPages.length > 0 ? (endPages[0] as number) - 2 : count - 1
  );

  return [
    ...startPages,
    ...(siblingsStart > boundaries + 2
      ? (['start-ellipsis'] as PaginationItemValue[])
      : boundaries + 1 < count - boundaries
        ? [boundaries + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < count - boundaries - 1
      ? (['end-ellipsis'] as PaginationItemValue[])
      : count - boundaries > boundaries
        ? [count - boundaries]
        : []),
    ...endPages,
  ];
}

export interface PaginationProps
  extends Omit<ViewProps, 'children'>,
    VariantProps<typeof paginationVariants> {
  className?: string;
  /**
   * How many pages there are. Pages are numbered from 1, so this is also the
   * last page's number.
   */
  count: number;
  /** The page being shown. Pass it to control the component. */
  page?: number;
  /** The page to start on when the component keeps its own. Defaults to 1. */
  defaultPage?: number;
  /** Called with the page that was asked for, already clamped to `count`. */
  onPageChange?: (page: number) => void;
  /** Which presentation to draw. */
  variant?: PaginationVariant;
  size?: PaginationSize;
  /**
   * How many pages to keep either side of the current one. Raise it on a
   * tablet, where there is room for a longer run.
   */
  siblings?: number;
  /** How many pages to keep pinned at each end of the run. */
  boundaries?: number;
  /**
   * Show the previous and next arrows. Turning them off leaves the numbers
   * alone, so only do it where something else moves the page — a swipe, a
   * scroller reaching its end.
   */
  controls?: boolean;
  /** How far tapping an ellipsis jumps. */
  pageJump?: number;
  /** Greys out and deafens the whole row — for a page that is still loading. */
  disabled?: boolean;
  /** Labels the row for a screen reader. Defaults to "Pagination". */
  accessibilityLabel?: string;
  /** Leading content — a `Pagination.Status`, a page-size control of your own. */
  children?: ReactNode;
}

const PaginationRoot = forwardRef<ViewRef, PaginationProps>(
  (
    {
      className,
      count,
      page: controlledPage,
      defaultPage = 1,
      onPageChange,
      variant = 'numbers',
      size = 'default',
      siblings = 1,
      boundaries = 1,
      controls = true,
      pageJump = 5,
      disabled = false,
      accessibilityLabel = 'Pagination',
      children,
      ...props
    },
    ref
  ) => {
    const [internalPage, setInternalPage] = useState(defaultPage);
    const isControlled = controlledPage !== undefined;
    // Clamped on the way out as well as on the way in: `count` can shrink under
    // a controlled page — a filter narrowing the result set — and a page number
    // past the end would light nothing and disable both arrows at once.
    const page = Math.min(Math.max(isControlled ? controlledPage : internalPage, 1), count);

    const goTo = useCallback(
      (next: number) => {
        const clamped = Math.min(Math.max(next, 1), count);
        if (clamped === page || disabled) return;
        // On the frame of the press rather than after the fetch: the tick is
        // what ties the feeling to the tap, and the rows arrive whenever they
        // arrive.
        selectionTick();
        if (!isControlled) setInternalPage(clamped);
        onPageChange?.(clamped);
      },
      [count, page, disabled, isControlled, onPageChange]
    );

    const context = useMemo<PaginationContextValue>(
      () => ({ page, count, size, disabled, goTo }),
      [page, count, size, disabled, goTo]
    );

    const items = useMemo(
      () =>
        variant === 'numbers'
          ? paginationRange({ count, page, siblings, boundaries })
          : [],
      [variant, count, page, siblings, boundaries]
    );

    const { root, list } = paginationVariants({ size });

    return (
      <PaginationContext.Provider value={context}>
        <View
          ref={ref}
          role="navigation"
          accessibilityLabel={accessibilityLabel}
          className={root({
            // With nothing on the leading edge the controls are the whole row
            // and centre in it; with something there they part to the two ends,
            // which is the shape a table footer wants.
            //
            // Clipped, because the run is a fixed number of targets and a
            // narrow enough container cannot hold it. Overflowing, a centred
            // row hangs the same distance past both edges, and the leading
            // number ends up half off the screen with nothing to say why.
            // Inside its own bounds the shortfall at least looks deliberate,
            // and `siblings`/`boundaries` are the knobs that fix it.
            className: cn(
              'overflow-hidden',
              children ? 'justify-between gap-3' : 'justify-center',
              className
            ),
          })}
          {...props}
        >
          {textChildren(children, (text) => (
            <PaginationStatus>{text}</PaginationStatus>
          ))}

          <View className={list({ className: 'max-w-full' })}>
            {controls ? <PaginationPrevious label={variant === 'simple'} /> : null}

            {variant === 'numbers'
              ? items.map((item, index) =>
                  typeof item === 'number' ? (
                    <PaginationItem key={item} page={item} />
                  ) : (
                    <PaginationEllipsis
                      key={`${item}-${index}`}
                      direction={item === 'start-ellipsis' ? -1 : 1}
                      jump={pageJump}
                    />
                  )
                )
              : null}

            {variant === 'compact' ? <PaginationSummary /> : null}

            {controls ? <PaginationNext label={variant === 'simple'} /> : null}
          </View>
        </View>
      </PaginationContext.Provider>
    );
  }
);
PaginationRoot.displayName = 'Pagination';

export interface PaginationItemProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'> {
  className?: string;
  /** The page this target goes to. */
  page: number;
  /** Styles the number. */
  labelClassName?: string;
  children?: ReactNode;
}

/**
 * One numbered target. Announced as a selected button when it is the page you
 * are on, so the current page is spoken as state rather than only painted.
 */
const PaginationItem = forwardRef<ViewRef, PaginationItemProps>(
  ({ className, labelClassName, page, children, onPress, ...props }, ref) => {
    const { page: current, size, disabled, goTo } = usePagination('Pagination.Item');
    const isCurrent = page === current;
    const { item, itemLabel } = paginationVariants({ size, current: isCurrent, disabled });

    return (
      <AnimatedPressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        accessibilityLabel={`Page ${page}`}
        accessibilityState={{ selected: isCurrent, disabled }}
        disabled={disabled}
        hitSlop={size === 'sm' ? SMALL_HIT_SLOP : undefined}
        onPress={(event) => {
          onPress?.(event);
          goTo(page);
        }}
        className={item({ className })}
      >
        {textChildren(children ?? String(page), (text) => (
          <Text className={itemLabel({ className: labelClassName })}>{text}</Text>
        ))}
      </AnimatedPressable>
    );
  }
);
PaginationItem.displayName = 'Pagination.Item';

export interface PaginationPreviousProps extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
  /** Write the word beside the arrow, rather than leaving it as a glyph. */
  label?: boolean;
}

export interface PaginationNextProps extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
  /** Write the word beside the arrow, rather than leaving it as a glyph. */
  label?: boolean;
}

type PaginationArrowProps = PaginationPreviousProps;

/**
 * The two arrows, which are the same button pointed the other way.
 *
 * Which glyph is "back" is a question about the reading direction, not about
 * the component: in a right-to-left layout the previous page is to the right.
 * Yoga mirrors the row on its own; the arrowhead inside it has to be chosen.
 */
function useArrow(step: -1 | 1, part: string) {
  const { page, count, size, disabled, goTo } = usePagination(part);
  const rtl = useDirection() === 'rtl';
  const color = useCSSVariable('--color-foreground');
  const target = page + step;
  const spent = disabled || target < 1 || target > count;
  const Glyph = (step === -1) === rtl ? ChevronRightIcon : ChevronLeftIcon;

  return {
    Glyph,
    size,
    spent,
    color: typeof color === 'string' ? color : '#0a0a0a',
    press: () => goTo(target),
  };
}

function PaginationArrow({
  step,
  part,
  word,
  className,
  label,
  disabled,
  onPress,
  ...props
}: PaginationArrowProps & { step: -1 | 1; part: string; word: string }) {
  const { Glyph, size, spent, color, press } = useArrow(step, part);
  const isDisabled = Boolean(spent || disabled);
  const { item, itemLabel } = paginationVariants({ size, disabled: isDisabled });

  return (
    <AnimatedPressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={word}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? SMALL_HIT_SLOP : undefined}
      onPress={(event) => {
        onPress?.(event);
        press();
      }}
      className={item({
        className: cn('flex-row gap-1', label && (size === 'sm' ? 'px-2' : 'px-3'), className),
      })}
    >
      {step === -1 ? <Glyph size={iconSize[size]} color={color} /> : null}
      {label ? <Text className={itemLabel()}>{word}</Text> : null}
      {step === 1 ? <Glyph size={iconSize[size]} color={color} /> : null}
    </AnimatedPressable>
  );
}

/** Back one page. Dead on the first page rather than looping to the last. */
const PaginationPrevious = ({ ...props }: PaginationPreviousProps) => (
  <PaginationArrow step={-1} part="Pagination.Previous" word="Previous" {...props} />
);
PaginationPrevious.displayName = 'Pagination.Previous';

/** Forward one page. Dead on the last page rather than looping to the first. */
const PaginationNext = ({ ...props }: PaginationNextProps) => (
  <PaginationArrow step={1} part="Pagination.Next" word="Next" {...props} />
);
PaginationNext.displayName = 'Pagination.Next';

export interface PaginationEllipsisProps
  extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
  /** Which way the gap runs: `-1` towards page 1, `1` towards the last page. */
  direction?: -1 | 1;
  /** How many pages a tap covers. */
  jump?: number;
}

/**
 * The gap in the run, and a way across it. Tapping jumps `jump` pages towards
 * the end the gap is on — which is why the two ellipses are told apart: a jump
 * that always went forwards would strand anyone reading the row right to left.
 */
const PaginationEllipsis = forwardRef<ViewRef, PaginationEllipsisProps>(
  ({ className, direction = 1, jump = 5, disabled: disabledProp, onPress, ...props }, ref) => {
    const { page, size, disabled, goTo } = usePagination('Pagination.Ellipsis');
    const color = useCSSVariable('--color-muted-foreground');
    const { ellipsis } = paginationVariants({ size });
    const isDisabled = Boolean(disabled || disabledProp);

    return (
      <AnimatedPressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        accessibilityLabel={
          direction === -1 ? `Back ${jump} pages` : `Forward ${jump} pages`
        }
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        hitSlop={size === 'sm' ? SMALL_HIT_SLOP : undefined}
        onPress={(event) => {
          onPress?.(event);
          goTo(page + direction * jump);
        }}
        className={ellipsis({ className })}
      >
        <EllipsisIcon
          size={iconSize[size]}
          color={typeof color === 'string' ? color : '#737373'}
        />
      </AnimatedPressable>
    );
  }
);
PaginationEllipsis.displayName = 'Pagination.Ellipsis';

export interface PaginationSummaryProps extends TextProps {
  className?: string;
}

/**
 * `3 / 12` — where you are, in the space two arrows leave between them.
 *
 * Digits and a slash rather than "Page 3 of 12", because a phone has no room
 * for the sentence and the sentence would need translating. `Pagination.Status`
 * is the place for words.
 */
const PaginationSummary = forwardRef<TextRef, PaginationSummaryProps>(
  ({ className, ...props }, ref) => {
    const { page, count, size } = usePagination('Pagination.Summary');
    const { summary } = paginationVariants({ size });

    return (
      <Text
        ref={ref}
        accessibilityLabel={`Page ${page} of ${count}`}
        className={summary({ className: cn('px-2', className) })}
        {...props}
      >
        {page} / {count}
      </Text>
    );
  }
);
PaginationSummary.displayName = 'Pagination.Summary';

export interface PaginationStatusProps extends TextProps {
  className?: string;
  /** Which page the span is counted from. Read from the root when left out. */
  page?: number;
  /** How many rows a page holds. Required for the span to be worked out. */
  pageSize?: number;
  /** How many rows there are altogether. */
  total?: number;
  children?: ReactNode;
}

/**
 * The line that says how much of the set you are looking at — `1–20 of 240`.
 *
 * Worth having beside a table because a page number alone does not answer the
 * question people actually have, which is how much is left. Given `children`
 * it renders those instead, for a set whose size is not known yet.
 */
const PaginationStatus = forwardRef<TextRef, PaginationStatusProps>(
  ({ className, page: ownPage, pageSize, total, children, ...props }, ref) => {
    const context = useContext(PaginationContext);
    const size = context?.size ?? 'default';
    const page = ownPage ?? context?.page ?? 1;
    const { status } = paginationVariants({ size });

    const span = useMemo(() => {
      if (children !== undefined) return null;
      if (pageSize === undefined || total === undefined) return null;
      if (total <= 0) return 'None';
      const from = (page - 1) * pageSize + 1;
      // The last page is nearly always short; counting a full one past the end
      // is the classic off-by-a-page-size.
      const to = Math.min(page * pageSize, total);
      return `${from}–${to} of ${total}`;
    }, [children, page, pageSize, total]);

    return (
      <Text ref={ref} className={status({ className })} {...props}>
        {span ?? textChildren(children)}
      </Text>
    );
  }
);
PaginationStatus.displayName = 'Pagination.Status';

export const Pagination = Object.assign(PaginationRoot, {
  Item: PaginationItem,
  Previous: PaginationPrevious,
  Next: PaginationNext,
  Ellipsis: PaginationEllipsis,
  Summary: PaginationSummary,
  Status: PaginationStatus,
});
