/**
 * Breadcrumb — the trail of where you are in a hierarchy.
 *
 * A row of links back up the tree, ending in the page you are on. The last
 * crumb is not a link: you cannot navigate to where you already are, so it is
 * a plain, current-marked label rather than a dead tappable target.
 *
 * The separators are the component's job, not yours. `Breadcrumb.List` drops a
 * chevron between each crumb it holds, so a trail is just its items — there is
 * no separator to forget, mis-order, or leave dangling at the end. Change the
 * glyph once with `separator` on the root and every gap follows.
 *
 * ```tsx
 * <Breadcrumb>
 *   <Breadcrumb.List>
 *     <Breadcrumb.Item>
 *       <Breadcrumb.Link onPress={goHome}>Home</Breadcrumb.Link>
 *     </Breadcrumb.Item>
 *     <Breadcrumb.Item>
 *       <Breadcrumb.Link onPress={goProjects}>Projects</Breadcrumb.Link>
 *     </Breadcrumb.Item>
 *     <Breadcrumb.Item>
 *       <Breadcrumb.Page>PanelUI</Breadcrumb.Page>
 *     </Breadcrumb.Item>
 *   </Breadcrumb.List>
 * </Breadcrumb>
 * ```
 *
 * A deep trail on a narrow phone does not wrap into a paragraph: give the list
 * a `maxItems` and it keeps the first and last crumbs, folding the middle into
 * a single ellipsis. Hand the ellipsis an `onEllipsisPress` and it becomes the
 * handle for a menu of the hidden steps.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { ChevronRightIcon, EllipsisIcon } from '../../icons';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import type { TextRef, ViewRef } from '../../primitives/refs';

type BreadcrumbSize = 'sm' | 'default';

const crumbText = tv({
  base: '',
  variants: {
    size: {
      sm: 'text-xs',
      default: 'text-sm',
    },
  },
  defaultVariants: { size: 'default' },
});

/**
 * Sub-parts read the density and the shared separator glyph from here, so the
 * trail is configured once on the root rather than repeated per crumb.
 */
const BreadcrumbContext = createContext<{
  size: BreadcrumbSize;
  separator: ReactNode;
}>({
  size: 'default',
  separator: null,
});

const useBreadcrumb = () => useContext(BreadcrumbContext);

export interface BreadcrumbProps extends ViewProps {
  className?: string;
  /** Text density for every crumb. `sm` for a dense header bar. */
  size?: BreadcrumbSize;
  /**
   * The glyph `Breadcrumb.List` places between crumbs. Defaults to a chevron;
   * pass a `<Text>/</Text>`, a slash, or any node to change every gap at once.
   */
  separator?: ReactNode;
  children?: ReactNode;
}

/**
 * The trail's landmark. Labelled for assistive tech so the row is announced as
 * "Breadcrumb" rather than an anonymous run of links.
 */
const BreadcrumbRoot = forwardRef<ViewRef, BreadcrumbProps>(
  ({ className, size = 'default', separator, children, ...props }, ref) => (
    <BreadcrumbContext.Provider value={{ size, separator: separator ?? null }}>
      <View
        ref={ref}
        accessibilityLabel="Breadcrumb"
        className={cn('w-full', className)}
        {...props}
      >
        {textChildren(children)}
      </View>
    </BreadcrumbContext.Provider>
  )
);
BreadcrumbRoot.displayName = 'Breadcrumb';

export interface BreadcrumbListProps extends ViewProps {
  className?: string;
  /**
   * Collapse the trail once it holds more than this many crumbs, so a deep
   * path never wraps into a block of text on a narrow screen. The first
   * `itemsBeforeCollapse` and last `itemsAfterCollapse` survive; the middle
   * folds into a single ellipsis.
   */
  maxItems?: number;
  /** How many leading crumbs to keep when collapsing. Default 1. */
  itemsBeforeCollapse?: number;
  /** How many trailing crumbs to keep when collapsing. Default 1. */
  itemsAfterCollapse?: number;
  /**
   * Makes the collapsed ellipsis pressable — the handle for a menu listing the
   * hidden steps. Without it the ellipsis is a static marker.
   */
  onEllipsisPress?: () => void;
  children?: ReactNode;
}

/** A private marker: the slot the collapsed middle crumbs fold into. */
const COLLAPSE = Symbol('breadcrumb-collapse');

/**
 * The crumb row. It owns the separators — one between every pair of crumbs and
 * none at the ends — and the collapsing, so a caller only ever lists items.
 */
const BreadcrumbList = forwardRef<ViewRef, BreadcrumbListProps>(
  (
    {
      className,
      maxItems,
      itemsBeforeCollapse = 1,
      itemsAfterCollapse = 1,
      onEllipsisPress,
      children,
      ...props
    },
    ref
  ) => {
    const crumbs = Children.toArray(children).filter(isValidElement);

    // Fold the middle only when hiding something actually shortens the row:
    // keeping N-1 of N crumbs plus an ellipsis saves nothing.
    let sequence: Array<ReactNode | typeof COLLAPSE> = crumbs;
    if (
      maxItems !== undefined &&
      crumbs.length > maxItems &&
      itemsBeforeCollapse + itemsAfterCollapse < crumbs.length
    ) {
      const head = crumbs.slice(0, Math.max(0, itemsBeforeCollapse));
      const tail =
        itemsAfterCollapse > 0 ? crumbs.slice(crumbs.length - itemsAfterCollapse) : [];
      sequence = [...head, COLLAPSE, ...tail];
    }

    return (
      <View
        ref={ref}
        accessibilityRole="list"
        className={cn('flex-row flex-wrap items-center gap-1.5', className)}
        {...props}
      >
        {sequence.map((node, i) => (
          <View key={i} className="flex-row items-center gap-1.5">
            {i > 0 ? <BreadcrumbSeparator /> : null}
            {node === COLLAPSE ? (
              <BreadcrumbEllipsis onPress={onEllipsisPress} />
            ) : (
              node
            )}
          </View>
        ))}
      </View>
    );
  }
);
BreadcrumbList.displayName = 'Breadcrumb.List';

export interface BreadcrumbItemProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** One crumb: wraps a link or the current page. */
const BreadcrumbItem = forwardRef<ViewRef, BreadcrumbItemProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-row items-center', className)}
      {...props}
    >
      {textChildren(children)}
    </View>
  )
);
BreadcrumbItem.displayName = 'Breadcrumb.Item';

export interface BreadcrumbLinkProps
  extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
  /** Text style for the crumb's label. */
  textClassName?: string;
  children?: ReactNode;
}

/**
 * A navigable crumb — an ancestor you can jump back to. Muted until pressed,
 * so the current page (which is not a link) reads as the emphasised end of the
 * trail. A string child is wrapped in the crumb text style; anything else
 * renders as given.
 */
const BreadcrumbLink = forwardRef<ViewRef, BreadcrumbLinkProps>(
  ({ className, textClassName, children, ...props }, ref) => {
    const { size } = useBreadcrumb();

    return (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="link"
        pressScale={1}
        pressOpacity={0.6}
        className={cn('flex-row items-center', className)}
        {...props}
      >
        {textChildren(children, (text) => (
          <Text className={crumbText({ size, className: cn('text-muted-foreground', textClassName) })}>
            {text}
          </Text>
        ))}
      </AnimatedPressable>
    );
  }
);
BreadcrumbLink.displayName = 'Breadcrumb.Link';

export interface BreadcrumbPageProps extends TextProps {
  className?: string;
}

/**
 * The trailing crumb: where you are now. Not a link — `aria-current="page"`
 * marks it as the destination, and it is painted in the full foreground so the
 * trail resolves to it.
 */
const BreadcrumbPage = forwardRef<TextRef, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => {
    const { size } = useBreadcrumb();

    return (
      <Text
        ref={ref}
        aria-current="page"
        accessibilityRole="text"
        weight="medium"
        className={crumbText({ size, className: cn('text-foreground', className) })}
        {...props}
      />
    );
  }
);
BreadcrumbPage.displayName = 'Breadcrumb.Page';

export interface BreadcrumbSeparatorProps extends ViewProps {
  className?: string;
  /** Override the glyph for this one gap. Falls back to the root's separator. */
  children?: ReactNode;
}

/**
 * The glyph between crumbs. `Breadcrumb.List` inserts it for you; it is public
 * only for the rare hand-assembled trail. Hidden from screen readers — the
 * order of the crumbs already conveys the hierarchy.
 */
const BreadcrumbSeparator = forwardRef<ViewRef, BreadcrumbSeparatorProps>(
  ({ className, children, ...props }, ref) => {
    const { separator } = useBreadcrumb();
    const rawTint = useCSSVariable('--color-muted-foreground');
    const tint = typeof rawTint === 'string' ? rawTint : undefined;
    const glyph = children ?? separator;

    return (
      <View
        ref={ref}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn('items-center justify-center', className)}
        {...props}
      >
        {glyph ?? <ChevronRightIcon size={14} color={tint} />}
      </View>
    );
  }
);
BreadcrumbSeparator.displayName = 'Breadcrumb.Separator';

export interface BreadcrumbEllipsisProps
  extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
}

/**
 * Stands in for the crumbs a collapsed trail hides. Static by default; give it
 * an `onPress` (via the list's `onEllipsisPress`) and it becomes the trigger
 * for a menu of the hidden steps. Labelled "Show more" so the collapse is not
 * silent to assistive tech.
 */
const BreadcrumbEllipsis = forwardRef<ViewRef, BreadcrumbEllipsisProps>(
  ({ className, onPress, ...props }, ref) => {
    const rawTint = useCSSVariable('--color-muted-foreground');
    const tint = typeof rawTint === 'string' ? rawTint : undefined;
    const glyph = <EllipsisIcon size={16} color={tint} />;

    if (!onPress) {
      return (
        <View
          ref={ref}
          {...(props as ViewProps)}
          accessibilityLabel="More"
          className={cn('h-5 items-center justify-center px-0.5', className)}
        >
          {glyph}
        </View>
      );
    }

    return (
      <AnimatedPressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        accessibilityLabel="Show more"
        pressScale={0.92}
        onPress={onPress}
        className={cn('h-5 items-center justify-center px-0.5', className)}
      >
        {glyph}
      </AnimatedPressable>
    );
  }
);
BreadcrumbEllipsis.displayName = 'Breadcrumb.Ellipsis';

export const Breadcrumb = Object.assign(BreadcrumbRoot, {
  List: BreadcrumbList,
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
  Ellipsis: BreadcrumbEllipsis,
});
