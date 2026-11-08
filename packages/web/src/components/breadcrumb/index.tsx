'use client';

/**
 * Breadcrumb — the trail of where you are in a hierarchy.
 *
 * A row of links back up the tree, ending in the page you are on. The last
 * crumb is not a link: you cannot navigate to where you already are, so it is a
 * plain, current-marked label rather than a dead target.
 *
 * ```tsx
 * <Breadcrumb>
 *   <Breadcrumb.List>
 *     <Breadcrumb.Item>
 *       <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 *     </Breadcrumb.Item>
 *     <Breadcrumb.Item>
 *       <Breadcrumb.Link href="/projects">Projects</Breadcrumb.Link>
 *     </Breadcrumb.Item>
 *     <Breadcrumb.Item>
 *       <Breadcrumb.Page>PanelUI</Breadcrumb.Page>
 *     </Breadcrumb.Item>
 *   </Breadcrumb.List>
 * </Breadcrumb>
 * ```
 *
 * ## The row is all you write
 *
 * Separators belong to the component, not to the page. `Breadcrumb.List` drops
 * a chevron between every pair of crumbs it holds and never at the ends, so a
 * trail is just its items — there is no separator to forget, mis-order, or
 * leave dangling after the current page. Change the glyph once with `separator`
 * on the root and every gap follows.
 *
 * ## A deep trail folds, it does not wrap
 *
 * A long path on a narrow screen should still read as one line. Give the root a
 * `maxItems` and the first and last crumbs survive while the middle folds into
 * a single ellipsis. A fold that would hide only one crumb is skipped: it is
 * the same number of slots with one of them made less useful.
 *
 * Hand the root an `onEllipsisClick` and the ellipsis becomes a real button —
 * the handle for a menu of the steps it is standing in for. Without one it is a
 * quiet, static marker.
 *
 * ## The trail ends where the page is
 *
 * `Breadcrumb.Page` carries `aria-current="page"` and is painted in the full
 * foreground. Links before it are muted, and gather a subtle underline on hover
 * or keyboard focus so the whole row stays quiet until it is being read.
 *
 * ## Long labels stay on one line
 *
 * A crumb's label truncates instead of pushing the trail onto a second line,
 * and a string label gets the full text as its `title`, so the cut is never
 * silent. The row sizes itself to the space it is given: the separator and the
 * ellipsis keep their width, and the labels share what is left.
 */
import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  type ComponentProps,
  type ElementType as RenderElementType,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
} from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { tv } from 'tailwind-variants';
import { BREADCRUMB_ELLIPSIS, collapseBreadcrumbItems } from './collapse';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type BreadcrumbSize = 'sm' | 'default';

const breadcrumbVariants = tv({
  slots: {
    root: 'w-full min-w-0',
    // One line, always. A breadcrumb that wraps into a paragraph has stopped
    // being a trail and become a block of text.
    list: 'flex min-w-0 items-center',
    item: 'flex min-w-0 items-center',
    link: [
      'inline-block min-w-0 max-w-full truncate rounded-sm text-muted-foreground outline-none',
      // The underline is always laid out, only coloured in when it matters, so
      // hovering does not move the label by a pixel.
      'underline decoration-transparent decoration-1 underline-offset-4',
      'transition-[color,text-decoration-color] duration-150 ease-out',
      'hover:text-foreground hover:decoration-current',
      'focus-visible:text-foreground focus-visible:decoration-current focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'motion-reduce:transition-none',
    ],
    page: 'inline-block min-w-0 max-w-full truncate font-medium text-foreground',
    separator: [
      'flex shrink-0 items-center text-muted-foreground/60 select-none',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ],
    ellipsis: [
      'inline-flex shrink-0 items-center justify-center text-muted-foreground',
      'rounded-md outline-none transition-colors duration-150',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'motion-reduce:transition-none',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ],
  },
  variants: {
    size: {
      sm: {
        list: 'gap-1 text-xs',
        link: 'underline-offset-2',
        separator: '[&_svg]:size-3',
        ellipsis: 'h-5 min-w-5 [&_svg]:size-3.5',
      },
      default: {
        list: 'gap-1.5 text-sm sm:gap-2',
        separator: '[&_svg]:size-3.5',
        ellipsis: 'h-6 min-w-6 [&_svg]:size-4',
      },
    },
    interactive: {
      true: {
        ellipsis: 'cursor-pointer hover:bg-muted hover:text-foreground active:bg-muted/70',
      },
    },
  },
  defaultVariants: { size: 'default', interactive: false },
});

/**
 * The density, separator and folding rules a trail shares. Configured once on
 * the root, read by every part below it.
 */
const BreadcrumbContext = createContext<{
  size: BreadcrumbSize;
  separator?: ReactNode;
  maxItems?: number;
  itemsBeforeCollapse: number;
  itemsAfterCollapse: number;
  onEllipsisClick?: MouseEventHandler<HTMLElement>;
  ellipsisOpen?: boolean;
  ellipsisLabel?: string;
}>({
  size: 'default',
  itemsBeforeCollapse: 1,
  itemsAfterCollapse: 1,
});

const useBreadcrumb = () => useContext(BreadcrumbContext);

const ChevronRightGlyph = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const EllipsisGlyph = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
);

export interface BreadcrumbProps extends ComponentProps<'nav'> {
  /** Extra classes for the landmark. */
  className?: string;
  /** Text density for every crumb. `sm` suits a header bar. Default `default`. */
  size?: BreadcrumbSize;
  /**
   * The glyph `Breadcrumb.List` places between crumbs. Defaults to a chevron;
   * pass `'/'`, a dot, or any node to change every gap at once.
   */
  separator?: ReactNode;
  /**
   * Collapse the trail once it holds more than this many crumbs. The first
   * `itemsBeforeCollapse` and last `itemsAfterCollapse` crumbs survive; the
   * middle folds into a single ellipsis. Nothing folds when hiding the middle
   * would not shorten the row.
   */
  maxItems?: number;
  /** How many leading crumbs survive a collapse, at least one. Default 1. */
  itemsBeforeCollapse?: number;
  /** How many trailing crumbs survive a collapse, at least one. Default 1. */
  itemsAfterCollapse?: number;
  /**
   * Makes the collapsed ellipsis pressable — the handle for a menu listing the
   * hidden steps. Without it the ellipsis is a static marker.
   */
  onEllipsisClick?: MouseEventHandler<HTMLElement>;
  /**
   * Whether the menu the pressable ellipsis opens is showing. Sets
   * `aria-expanded` on that button, so a screen reader knows the menu is open.
   */
  ellipsisOpen?: boolean;
  /**
   * What the collapsed ellipsis is called when pressable. Default "Show hidden
   * items"; set it to localize the button the list creates for you.
   */
  ellipsisLabel?: string;
}

/**
 * The trail's landmark. Labelled for assistive tech, so the row is announced
 * as "Breadcrumb" rather than an anonymous run of links. Pass `aria-label` to
 * name it after what the hierarchy describes.
 */
function BreadcrumbRoot({
  size = 'default',
  separator,
  maxItems,
  itemsBeforeCollapse = 1,
  itemsAfterCollapse = 1,
  onEllipsisClick,
  ellipsisOpen,
  ellipsisLabel,
  className,
  children,
  ...props
}: BreadcrumbProps) {
  return (
    <BreadcrumbContext.Provider
      value={{ size, separator, maxItems, itemsBeforeCollapse, itemsAfterCollapse, onEllipsisClick, ellipsisOpen, ellipsisLabel }}
    >
      <nav
        data-slot="breadcrumb"
        aria-label="Breadcrumb"
        className={breadcrumbVariants({ size }).root({ className })}
        {...props}
      >
        {children}
      </nav>
    </BreadcrumbContext.Provider>
  );
}
BreadcrumbRoot.displayName = 'Breadcrumb';

export interface BreadcrumbListProps extends ComponentProps<'ol'> {
  /** Extra classes for the crumb row. */
  className?: string;
}

/**
 * Flattens fragments so a wrapped run of crumbs counts as the items inside it,
 * and drops a separator passed straight to the list: the list places its own.
 */
function flattenCrumbs(nodes: ReactNode): ReactElement[] {
  return Children.toArray(nodes).flatMap((node) => {
    if (!isValidElement(node)) return [];
    if (node.type === Fragment) {
      return flattenCrumbs((node.props as { children?: ReactNode }).children);
    }
    if (node.type === BreadcrumbSeparator) return [];
    return [node];
  });
}

/**
 * The crumb row. It owns the separators — one between every pair of crumbs and
 * none at the ends — and the folding, so a caller only ever lists items.
 */
function BreadcrumbList({ className, children, ...props }: BreadcrumbListProps) {
  const { size, maxItems, itemsBeforeCollapse, itemsAfterCollapse, onEllipsisClick, ellipsisLabel } = useBreadcrumb();
  const crumbs = flattenCrumbs(children);
  const slots = breadcrumbVariants({ size });
  const sequence = collapseBreadcrumbItems(crumbs.length, {
    maxItems,
    itemsBeforeCollapse,
    itemsAfterCollapse,
  });

  return (
    <ol data-slot="breadcrumb-list" className={slots.list({ className })} {...props}>
      {sequence.map((slot, position) => (
        <Fragment key={position}>
          {position > 0 ? <BreadcrumbSeparator /> : null}
          {slot === BREADCRUMB_ELLIPSIS ? (
            <li data-slot="breadcrumb-item" className={slots.item()}>
              <BreadcrumbEllipsis onClick={onEllipsisClick} label={ellipsisLabel} />
            </li>
          ) : (
            crumbs[slot]
          )}
        </Fragment>
      ))}
    </ol>
  );
}
BreadcrumbList.displayName = 'Breadcrumb.List';

export interface BreadcrumbItemProps extends ComponentProps<'li'> {
  /** Extra classes for the crumb's list item. */
  className?: string;
}

/** One crumb: wraps a link or the current page, and keeps its label on one line. */
function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
  return <li data-slot="breadcrumb-item" className={breadcrumbVariants().item({ className })} {...props} />;
}
BreadcrumbItem.displayName = 'Breadcrumb.Item';

export interface BreadcrumbLinkProps extends Omit<ComponentProps<'a'>, 'className'> {
  /** Extra classes for the anchor. */
  className?: string;
}

/**
 * A navigable crumb — an ancestor you can jump back to. Renders an `<a>`, so
 * `href`, `target` and the rest work as they do anywhere; `render` draws it as
 * your router's own link instead. A string label is truncated to the space
 * available and carries its full text as a `title`.
 */
function BreadcrumbLink({
  className,
  children,
  title,
  render,
  ...props
}: BreadcrumbLinkProps & RenderProp<'a'>) {
  const { size } = useBreadcrumb();
  return useRender({
    defaultTagName: 'a',
    render,
    props: mergeProps(
      {
        'data-slot': 'breadcrumb-link',
        className: breadcrumbVariants({ size }).link({ className }),
        title: title ?? (typeof children === 'string' ? children : undefined),
        children,
      },
      props
    ),
  });
}
BreadcrumbLink.displayName = 'Breadcrumb.Link';

export interface BreadcrumbPageProps extends Omit<ComponentProps<'span'>, 'className'> {
  /** Extra classes for the label. */
  className?: string;
}

/**
 * The trailing crumb: where you are now. Not a link — `aria-current="page"`
 * marks it as the destination, and it is painted in the full foreground so the
 * trail resolves to it. A string label truncates and carries its full text as a
 * `title`, as `Breadcrumb.Link` does.
 */
function BreadcrumbPage({ className, children, title, ...props }: BreadcrumbPageProps) {
  const { size } = useBreadcrumb();
  return (
    <span
      data-slot="breadcrumb-page"
      title={title ?? (typeof children === 'string' ? children : undefined)}
      className={breadcrumbVariants({ size }).page({ className })}
      {...props}
      aria-current="page"
    >
      {children}
    </span>
  );
}
BreadcrumbPage.displayName = 'Breadcrumb.Page';

export interface BreadcrumbSeparatorProps extends Omit<ComponentProps<'li'>, 'children'> {
  /** Extra classes for the gap. */
  className?: string;
  /** Override the glyph for this one gap. Falls back to the root's separator. */
  children?: ReactNode;
}

/**
 * The glyph between crumbs. `Breadcrumb.List` inserts it for you; it is public
 * only for the rare hand-assembled trail, where it is a sibling of the items.
 * Hidden from screen readers — the order of the crumbs already says everything.
 */
function BreadcrumbSeparator({ className, children, ...props }: BreadcrumbSeparatorProps) {
  const { size, separator } = useBreadcrumb();
  const glyph = children ?? separator;

  return (
    <li
      data-slot="breadcrumb-separator"
      className={breadcrumbVariants({ size }).separator({ className })}
      {...props}
      aria-hidden="true"
      role="presentation"
    >
      {glyph ?? <ChevronRightGlyph />}
    </li>
  );
}
BreadcrumbSeparator.displayName = 'Breadcrumb.Separator';

export interface BreadcrumbEllipsisProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick'> {
  /** Extra classes for the marker or button. */
  className?: string;
  /** A glyph of your own in place of the three dots. */
  children?: ReactNode;
  /**
   * Called when the ellipsis is pressed. Without it the ellipsis is a static
   * marker; with it, it is a real button for a menu of the hidden steps.
   */
  onClick?: MouseEventHandler<HTMLElement>;
  /** Its accessible name. Default `More` when static, `Show hidden items` when pressable. */
  label?: string;
}

/**
 * Stands in for the crumbs a folded trail hides. Static by default; give it an
 * `onClick` (through the root's `onEllipsisClick`) and it becomes the trigger
 * for a menu of the hidden steps. Either way it is labelled, so the fold is not
 * silent to assistive tech.
 */
function BreadcrumbEllipsis({ className, children, onClick, label, ...props }: BreadcrumbEllipsisProps) {
  const { size, ellipsisOpen } = useBreadcrumb();
  const slots = breadcrumbVariants({ size, interactive: Boolean(onClick) });
  const glyph = children ?? <EllipsisGlyph />;

  if (!onClick) {
    return (
      <span
        data-slot="breadcrumb-ellipsis"
        role="img"
        aria-label={label ?? 'More'}
        className={slots.ellipsis({ className })}
        {...props}
      >
        {glyph}
      </span>
    );
  }

  return (
    <button
      data-slot="breadcrumb-ellipsis"
      type="button"
      aria-label={label ?? 'Show hidden items'}
      aria-haspopup="menu"
      aria-expanded={ellipsisOpen}
      className={slots.ellipsis({ className })}
      onClick={onClick}
      {...props}
    >
      {glyph}
    </button>
  );
}
BreadcrumbEllipsis.displayName = 'Breadcrumb.Ellipsis';

export const Breadcrumb = Object.assign(BreadcrumbRoot, {
  List: BreadcrumbList,
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
  Ellipsis: BreadcrumbEllipsis,
});

export {
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
