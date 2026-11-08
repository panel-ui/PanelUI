'use client';

/**
 * Pagination — moving through a result set one page at a time.
 *
 * ```tsx
 * <Pagination count={12} page={page} onPageChange={setPage} />
 * ```
 *
 * The component owns the arithmetic and nothing else. Give it how many pages
 * there are and which one you are on, and it works out which numbers to show,
 * where the gaps fall, and which controls are dead at the ends; it never
 * fetches and never slices, because the data is yours.
 *
 * ## Three shapes
 *
 * `numbers` is the full run, with the middle folded into gaps. It is the one
 * to reach for on a search result or a table: the page you are on sits among
 * its neighbours, and the two ends stay visible while you move.
 *
 * `compact` puts the two arrows either side of `3 / 12`. Digits and a slash
 * rather than a sentence, so the shape is the same in any language and fits a
 * table footer or a phone.
 *
 * `simple` replaces the numbers with the words Previous and Next. Use it for
 * a flow you walk rather than jump around in: a wizard, a set of onboarding
 * cards, the pages of an article. It says where the flow goes, which a row of
 * numbers does not.
 *
 * ## The run holds its width
 *
 * The visible run is a fixed width, not a window that grows and shrinks, so
 * the arrows stay where the hand left them as you step through the pages.
 * `siblings` sets how many pages sit either side of the current one and
 * `boundaries` how many are pinned at each end. A gap of exactly one page is
 * drawn as that page, because a gap marker wider than the number it hides is
 * a worse trade than the number.
 *
 * An ellipsis is a button, not punctuation. A dead target in the middle of a
 * row of live ones is a thing people press and then think is broken, so
 * pressing one jumps `pageJump` pages towards the end the gap is on.
 *
 * ## With something beside it
 *
 * Given children, the root becomes a row with them on the leading edge and
 * the controls on the trailing one. That is where `Pagination.Status` goes:
 *
 * ```tsx
 * <Pagination count={8} page={page} onPageChange={setPage}>
 *   <Pagination.Status page={page} pageSize={20} total={143} />
 * </Pagination>
 * ```
 *
 * `Pagination.Item` is a numbered target that changes the page in this
 * component. `Pagination.Link` is the same target as a real link, for a pager
 * whose pages have addresses and can be opened in another tab. Pass
 * `getPageHref` and the whole run is drawn from links, so each page can be
 * shared, followed without JavaScript, and opened beside the one you are on.
 *
 * ## Keyboard and assistive technology
 *
 * The root is a `nav` with a label, the targets are a list, the current page
 * carries `aria-current="page"`, and every arrow and gap has a label that says
 * where it goes. Every target is a real button or link, so Tab, Enter and
 * Space work as the platform defines them, without a key handler of ours. A
 * control that is dead at an end is
 * announced as disabled and stays in place, so the row does not rearrange
 * under the pointer.
 */
import { Children, createContext, useCallback, useContext, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';
import {
  clampPage,
  paginationRange,
  paginationSpan,
  type PaginationItemValue,
} from './pagination-range';

export type PaginationVariant = 'numbers' | 'compact' | 'simple';
export type PaginationSize = 'sm' | 'default';

const paginationVariants = tv({
  slots: {
    root: [
      'group/pagination flex w-full max-w-full flex-wrap items-center gap-3',
      'data-disabled:opacity-60',
    ],
    // Scrolls rather than wraps, so a run that is too wide for its column stays
    // one row. The ring is drawn inside each target, so the clip takes nothing
    // off it, and a keyboard focus still scrolls the target into view.
    list: 'flex min-w-0 max-w-full items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    item: [
      'relative inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap px-2 font-medium tabular-nums outline-none select-none',
      'text-foreground transition-[color,background-color] duration-150 motion-reduce:transition-none',
      'hover:bg-accent hover:text-accent-foreground',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      // A spent arrow or a disabled row keeps its place and says why it does
      // nothing, rather than vanishing and moving its neighbours.
      'aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-foreground',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ],
    ellipsis: [
      'relative inline-flex shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none select-none',
      'transition-colors duration-150 hover:bg-accent hover:text-foreground motion-reduce:transition-none',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      'aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground',
    ],
    status: 'min-w-0 text-muted-foreground tabular-nums',
    summary: 'shrink-0 text-center text-muted-foreground tabular-nums',
    icon: 'shrink-0',
  },
  variants: {
    size: {
      default: {
        list: 'gap-1',
        item: 'h-9 min-w-9 rounded-lg text-sm',
        ellipsis: 'size-9 rounded-lg',
        status: 'text-sm',
        summary: 'px-2 text-sm',
        icon: 'size-4',
      },
      sm: {
        list: 'gap-0.5',
        item: 'h-8 min-w-8 rounded-md px-1.5 text-xs',
        ellipsis: 'size-8 rounded-md',
        status: 'text-xs',
        summary: 'px-1.5 text-xs',
        icon: 'size-3.5',
      },
    },
    /** The page you are on, in the weight the collection uses for a chosen item. */
    current: {
      true: {
        item:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:text-primary-foreground',
      },
    },
  },
  defaultVariants: { size: 'default' },
});

interface PaginationContextValue {
  /** The page being drawn, already clamped into the set. */
  page: number;
  /** How many pages there are. */
  count: number;
  /** The target size every part reads. */
  size: PaginationSize;
  /** Whether the whole row is deaf. */
  disabled: boolean;
  /** Ask for another page. Clamped here, so a part never has to. */
  goTo: (page: number) => void;
}

const PaginationContext = createContext<PaginationContextValue | null>(null);

function usePagination(part: string): PaginationContextValue {
  const context = useContext(PaginationContext);
  if (!context) throw new Error(`${part} must be used inside <Pagination>.`);
  return context;
}

export interface PaginationProps extends Omit<ComponentProps<'nav'>, 'children'> {
  /** How many pages there are. Pages are numbered from 1, so this is also the last page's number. */
  count: number;
  /** The page being shown. Pass it to control the component. */
  page?: number;
  /** The page to start on when the component keeps its own. Defaults to 1. */
  defaultPage?: number;
  /** Called with the page that was asked for, already clamped to `count`. */
  onPageChange?: (page: number) => void;
  /** Which presentation to draw. Default `numbers`. */
  variant?: PaginationVariant;
  /** Its height and text size. Default `default`. */
  size?: PaginationSize;
  /** How many pages to keep either side of the current one. Default 1. */
  siblings?: number;
  /** How many pages to keep pinned at each end of the run. Default 1. */
  boundaries?: number;
  /**
   * Show the previous and next arrows. Turning them off leaves the numbers
   * alone, for a row that something else moves — a swipe, a scroller reaching
   * its end.
   */
  controls?: boolean;
  /** How far pressing an ellipsis jumps. Default 5. */
  pageJump?: number;
  /**
   * Turns a page number into its address. When set, every numbered target is
   * a real link — one that opens in another tab and works without JavaScript —
   * instead of a button that only moves this component.
   */
  getPageHref?: (page: number) => string;
  /** Greys out and deafens the whole row, for a page that is still loading. */
  disabled?: boolean;
  /** Labels the row for a screen reader. Default "Pagination". */
  'aria-label'?: string;
  /** Leading content, where a `Pagination.Status` or a page-size control goes. */
  children?: ReactNode;
  /** Extra classes for the row. */
  className?: string;
}

/**
 * Holds the page and draws the row. Give every pagination on a page its own
 * `aria-label` when there is more than one, so a screen reader can tell them
 * apart.
 */
function PaginationRoot({
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
  getPageHref,
  disabled = false,
  children,
  className,
  'aria-label': ariaLabel = 'Pagination',
  ...props
}: PaginationProps) {
  const [uncontrolledPage, setUncontrolledPage] = useState(() => clampPage(defaultPage, count));
  const isControlled = controlledPage !== undefined;

  // Clamped on the way out as well as on the way in: `count` can shrink under
  // a controlled page — a filter narrowing the result set — and a page number
  // past the end would light nothing and disable both arrows at once.
  const current = clampPage(isControlled ? controlledPage : uncontrolledPage, count);

  const goTo = useCallback(
    (next: number) => {
      const target = clampPage(next, count);
      if (disabled || target === 0 || target === current) return;
      if (!isControlled) setUncontrolledPage(target);
      onPageChange?.(target);
    },
    [count, current, disabled, isControlled, onPageChange]
  );

  const context = useMemo<PaginationContextValue>(
    () => ({ page: current, count, size, disabled, goTo }),
    [current, count, size, disabled, goTo]
  );

  const items = useMemo<readonly PaginationItemValue[]>(
    () =>
      variant === 'numbers'
        ? paginationRange({ count, page: current, siblings, boundaries })
        : [],
    [variant, count, current, siblings, boundaries]
  );

  const slots = paginationVariants({ size });
  const hasChildren = Children.toArray(children).length > 0;

  return (
    <PaginationContext.Provider value={context}>
      <nav
        data-slot="pagination"
        data-variant={variant}
        data-size={size}
        data-disabled={disabled || undefined}
        aria-label={ariaLabel}
        className={slots.root({
          className: cn(hasChildren ? 'justify-between' : 'justify-center', className),
        })}
        {...props}
      >
        {hasChildren ? (
          <div data-slot="pagination-leading" className="flex min-w-0 flex-wrap items-center gap-3">
            {typeof children === 'string' || typeof children === 'number' ? (
              <PaginationStatus>{children}</PaginationStatus>
            ) : (
              children
            )}
          </div>
        ) : null}

        <ul data-slot="pagination-list" className={slots.list()}>
          {controls ? (
            <li className="flex">
              <PaginationPrevious label={variant === 'simple'} />
            </li>
          ) : null}

          {variant === 'numbers'
            ? items.map((item, index) => (
                <li className="flex" key={typeof item === 'number' ? `page-${item}` : `${item}-${index}`}>
                  {typeof item === 'number' ? (
                    getPageHref ? (
                      <PaginationLink page={item} href={getPageHref(item)} />
                    ) : (
                      <PaginationItem page={item} />
                    )
                  ) : (
                    <PaginationEllipsis
                      direction={item === 'start-ellipsis' ? -1 : 1}
                      jump={pageJump}
                    />
                  )}
                </li>
              ))
            : null}

          {variant === 'compact' ? (
            <li className="flex">
              <PaginationSummary />
            </li>
          ) : null}

          {controls ? (
            <li className="flex">
              <PaginationNext label={variant === 'simple'} />
            </li>
          ) : null}
        </ul>
      </nav>
    </PaginationContext.Provider>
  );
}
PaginationRoot.displayName = 'Pagination';

export interface PaginationItemProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** The page this target goes to. */
  page: number;
  /** What a screen reader calls this target. Defaults to "Go to page N". */
  'aria-label'?: string;
  /** Replaces the number, for a target that says something other than its page. */
  children?: ReactNode;
  /** Extra classes for the target. */
  className?: string;
}

/**
 * One numbered target. It is announced as the current page when it is, so the
 * page you are on is spoken as state and not only painted.
 */
function PaginationItem({
  page,
  children,
  className,
  onClick,
  disabled: ownDisabled,
  'aria-label': ariaLabel,
  ...props
}: PaginationItemProps) {
  const { page: current, size, disabled, goTo } = usePagination('Pagination.Item');
  const isCurrent = page === current;
  const isDisabled = disabled || ownDisabled === true;
  const slots = paginationVariants({ size, current: isCurrent });

  return (
    <button
      type="button"
      data-slot="pagination-item"
      data-current={isCurrent || undefined}
      aria-current={isCurrent ? 'page' : undefined}
      aria-label={ariaLabel ?? `Go to page ${page}`}
      aria-disabled={isDisabled || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        goTo(page);
      }}
      className={slots.item({ className })}
      {...props}
    >
      {children ?? page}
    </button>
  );
}
PaginationItem.displayName = 'Pagination.Item';

export interface PaginationLinkProps extends Omit<ComponentProps<'a'>, 'children' | 'href'> {
  /** The page this link goes to. */
  page: number;
  /** The address of that page. A real link works without JavaScript and can be opened in another tab. */
  href: string;
  /** What a screen reader calls this target. Defaults to "Go to page N". */
  'aria-label'?: string;
  /** Replaces the number. */
  children?: ReactNode;
  /** Extra classes for the target. */
  className?: string;
}

/**
 * A numbered target drawn as a link, for a pager whose pages have addresses.
 *
 * A modified click — a new tab, a new window — is left to the browser, so the
 * page the reader is on is not changed behind it. A plain click still moves
 * the component, so a router or a caller holding the page sees it change
 * before the navigation lands.
 */
function PaginationLink({
  page,
  href,
  children,
  className,
  onClick,
  'aria-label': ariaLabel,
  ...props
}: PaginationLinkProps) {
  const { page: current, size, disabled, goTo } = usePagination('Pagination.Link');
  const isCurrent = page === current;
  const slots = paginationVariants({ size, current: isCurrent });

  return (
    <a
      data-slot="pagination-link"
      data-current={isCurrent || undefined}
      href={href}
      aria-current={isCurrent ? 'page' : undefined}
      aria-label={ariaLabel ?? `Go to page ${page}`}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (disabled || isCurrent) {
          event.preventDefault();
          return;
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        goTo(page);
      }}
      className={slots.item({ className })}
      {...props}
    >
      {children ?? page}
    </a>
  );
}
PaginationLink.displayName = 'Pagination.Link';

export interface PaginationPreviousProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Write the word beside the arrow rather than leaving it as a glyph. */
  label?: boolean;
  /** What a screen reader calls the control. Defaults to "Previous page". */
  'aria-label'?: string;
  /** Extra classes for the control. */
  className?: string;
}

export interface PaginationNextProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Write the word beside the arrow rather than leaving it as a glyph. */
  label?: boolean;
  /** What a screen reader calls the control. Defaults to "Next page". */
  'aria-label'?: string;
  /** Extra classes for the control. */
  className?: string;
}

interface PaginationArrowProps {
  step: -1 | 1;
  part: string;
  word: string;
  label?: boolean;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
  onClick?: ComponentProps<'button'>['onClick'];
}

/**
 * The two arrows, which are one control pointed the other way.
 *
 * A spent arrow is `aria-disabled` rather than removed from the page: it
 * keeps its place, so the row does not rearrange, and it stays in the tab
 * order, so a keyboard user can hear that there is a first page rather than
 * finding the row shorter than it looked.
 */
function PaginationArrow({
  step,
  part,
  word,
  label = false,
  className,
  disabled: ownDisabled,
  onClick,
  'aria-label': ariaLabel,
  ...props
}: PaginationArrowProps) {
  const { page, count, size, disabled, goTo } = usePagination(part);
  const slots = paginationVariants({ size });
  const target = page + step;
  const spent = target < 1 || target > count;
  const isDisabled = disabled || spent || ownDisabled === true;

  return (
    <button
      type="button"
      data-slot={step === -1 ? 'pagination-previous' : 'pagination-next'}
      aria-label={ariaLabel ?? (step === -1 ? 'Previous page' : 'Next page')}
      aria-disabled={isDisabled || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        goTo(target);
      }}
      className={slots.item({
        className: cn(label && 'gap-1.5 px-3', label && size === 'sm' && 'px-2', className),
      })}
      {...props}
    >
      {step === -1 ? <Chevron direction="left" className={slots.icon()} /> : null}
      {label ? <span>{word}</span> : null}
      {step === 1 ? <Chevron direction="right" className={slots.icon()} /> : null}
    </button>
  );
}

/** Back one page. Dead on the first page rather than looping to the last. */
function PaginationPrevious({ label, ...props }: PaginationPreviousProps) {
  return <PaginationArrow step={-1} part="Pagination.Previous" word="Previous" label={label} {...props} />;
}
PaginationPrevious.displayName = 'Pagination.Previous';

/** Forward one page. Dead on the last page rather than looping to the first. */
function PaginationNext({ label, ...props }: PaginationNextProps) {
  return <PaginationArrow step={1} part="Pagination.Next" word="Next" label={label} {...props} />;
}
PaginationNext.displayName = 'Pagination.Next';

export interface PaginationEllipsisProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Which way the gap runs: `-1` towards page 1, `1` towards the last page. */
  direction?: -1 | 1;
  /** How many pages a press covers. Default 5. */
  jump?: number;
  /** What a screen reader calls the control. Defaults to "Jump back/forward N pages". */
  'aria-label'?: string;
  /** Replaces the three dots. */
  children?: ReactNode;
  /** Extra classes for the control. */
  className?: string;
}

/**
 * The gap in the run, and a way across it. Pressing it jumps `jump` pages
 * towards the end the gap is on, which is why the two gaps are told apart:
 * a jump that always went forwards would strand anyone reading the row right
 * to left.
 */
function PaginationEllipsis({
  direction = 1,
  jump = 5,
  children,
  className,
  onClick,
  disabled: ownDisabled,
  'aria-label': ariaLabel,
  ...props
}: PaginationEllipsisProps) {
  const { page, size, disabled, goTo } = usePagination('Pagination.Ellipsis');
  const slots = paginationVariants({ size });
  const distance = Number.isFinite(jump) ? Math.max(1, Math.floor(jump)) : 5;
  const isDisabled = disabled || ownDisabled === true;

  return (
    <button
      type="button"
      data-slot="pagination-ellipsis"
      data-direction={direction === -1 ? 'back' : 'forward'}
      aria-label={
        ariaLabel ?? (direction === -1 ? `Jump back ${distance} pages` : `Jump forward ${distance} pages`)
      }
      aria-disabled={isDisabled || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        goTo(page + direction * distance);
      }}
      className={slots.ellipsis({ className })}
      {...props}
    >
      {children ?? <EllipsisGlyph className={slots.icon()} />}
    </button>
  );
}
PaginationEllipsis.displayName = 'Pagination.Ellipsis';

export interface PaginationSummaryProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Extra classes for the line. */
  className?: string;
}

/**
 * `3 / 12` — where you are, in the space two arrows leave between them.
 *
 * Digits and a slash rather than "Page 3 of 12", because the row has no room
 * for the sentence and the sentence would need translating. A screen reader
 * still hears the words, placed around the numbers with `sr-only`.
 */
function PaginationSummary({ className, ...props }: PaginationSummaryProps) {
  const { page, count, size } = usePagination('Pagination.Summary');
  const slots = paginationVariants({ size });

  return (
    <span data-slot="pagination-summary" className={slots.summary({ className })} {...props}>
      <span className="sr-only">Page </span>
      {page}
      <span aria-hidden="true"> / </span>
      <span className="sr-only"> of </span>
      {count}
    </span>
  );
}
PaginationSummary.displayName = 'Pagination.Summary';

export interface PaginationStatusProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Which page the span is counted from. Read from the root when left out. */
  page?: number;
  /** How many rows a page holds. Required, with `total`, for a range. */
  pageSize?: number;
  /** How many rows there are altogether. */
  total?: number;
  /** Words to show instead of a worked-out span, for a set whose size is not known yet. */
  children?: ReactNode;
  /** Extra classes for the line. */
  className?: string;
}

/**
 * The line that says how much of the set you are looking at: `1–20 of 143`.
 *
 * It answers the question a page number alone does not, which is how much is
 * left. Given `pageSize` and `total` it draws a range; inside a `Pagination`
 * without them it falls back to `3 / 12`; given children it shows those
 * instead.
 */
function PaginationStatus({
  page: ownPage,
  pageSize,
  total,
  children,
  className,
  ...props
}: PaginationStatusProps) {
  const context = useContext(PaginationContext);
  const size = context?.size ?? 'default';
  const page = ownPage ?? context?.page ?? 1;
  const count = context?.count;
  const slots = paginationVariants({ size });

  const span = useMemo(() => {
    if (children !== undefined) return null;
    if (pageSize !== undefined && total !== undefined) return paginationSpan({ page, pageSize, total });
    if (count !== undefined) return `${page} / ${count}`;
    return null;
  }, [children, page, pageSize, total, count]);

  return (
    <span data-slot="pagination-status" className={slots.status({ className })} {...props}>
      {span ?? children}
    </span>
  );
}
PaginationStatus.displayName = 'Pagination.Status';

function Chevron({ direction, className }: { direction: 'left' | 'right'; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('rtl:-scale-x-100', className)}
    >
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

function EllipsisGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export const Pagination = Object.assign(PaginationRoot, {
  Previous: PaginationPrevious,
  Next: PaginationNext,
  Item: PaginationItem,
  Link: PaginationLink,
  Ellipsis: PaginationEllipsis,
  Status: PaginationStatus,
  Summary: PaginationSummary,
});

export {
  PaginationPrevious,
  PaginationNext,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationStatus,
  PaginationSummary,
};

export { clampPage, paginationRange, paginationSpan, type PaginationItemValue };
