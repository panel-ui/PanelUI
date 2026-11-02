/**
 * GridItem — a tile in a bento grid, and the grid that lays it out.
 *
 * ```tsx
 * <GridItem.Group columns={2} gap={12}>
 *   <GridItem colSpan={2}>
 *     <GridItem.Media variant="icon"><ZapIcon /></GridItem.Media>
 *     <GridItem.Title>Deploys</GridItem.Title>
 *     <GridItem.Value>1,284</GridItem.Value>
 *     <GridItem.Description>this week</GridItem.Description>
 *   </GridItem>
 *   <GridItem rowSpan={2}>…</GridItem>
 *   <GridItem>…</GridItem>
 * </GridItem.Group>
 * ```
 *
 * ## Why the group places the tiles
 *
 * `Item` next door is a row, and a list of rows is a column of views — the
 * layout falls out of the flexbox and nothing has to be measured. A bento is
 * not that. Its whole idea is that tiles are different sizes and the grid still
 * lines up: a wide tile and the two square ones beside it share a left edge, a
 * tall one runs past the tile next to it and the next tile fills in underneath.
 *
 * A wrapping flex row cannot do the last of those. Wrapping puts everything
 * that did not fit on a *new line*, so nothing ever tucks under a tall tile,
 * and `rowSpan` in a wrapping row is a prop that quietly does nothing.
 *
 * So the group measures itself, walks its children into the first free cell
 * that fits each one — row by row, the way a grid places anything it is not
 * told where to put — and positions them absolutely. Every tile is a whole
 * number of cells, which is what makes the edges line up, and the group's own
 * height is the number of rows it ended up needing.
 *
 * The consequence worth knowing: **a tile's height is its cells, not its
 * content**. That is the right way round for a bento — a grid of boxes that
 * each grew to fit its own text is not a grid — but it does mean long text
 * needs `numberOfLines`, a smaller `size`, or a taller `rowSpan`.
 *
 * ## Nesting
 *
 * A group inside a tile is a group like any other, and it measures the cell it
 * was put in. That is how a bento gets a sub-rhythm — two small tiles stacked
 * inside one cell of the outer grid — without the outer grid needing a notion
 * of half a row.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import type { TextRef, ViewRef } from '../../primitives/refs';

type GridItemSize = 'default' | 'sm';

const gridItemVariants = tv({
  slots: {
    // Full-bleed inside its cell: the group has already decided how big the
    // tile is, and a tile that sized itself would break the grid it is in.
    root: 'h-full w-full overflow-hidden rounded-2xl',
    title: 'font-medium text-foreground',
    value: 'font-semibold text-foreground',
    description: 'text-muted-foreground',
  },
  variants: {
    variant: {
      /** A card in a tray — the tile that reads as a tile. */
      default: { root: 'border border-border bg-card' },
      /** Outline only, for a grid over a coloured or patterned page. */
      outline: { root: 'border border-border' },
      /** Filled and unbordered, for a quieter tile among louder ones. */
      muted: { root: 'bg-muted' },
      /** Nothing at all: the tile is whatever is put inside it. */
      plain: { root: '' },
    },
    size: {
      default: { root: 'gap-2 p-4', title: 'text-sm', value: 'text-2xl', description: 'text-xs' },
      sm: { root: 'gap-1.5 p-3', title: 'text-xs', value: 'text-xl', description: 'text-xs' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const mediaVariants = tv({
  base: 'shrink-0 items-center justify-center',
  variants: {
    variant: {
      /** No box — for an Avatar or anything that styles itself. */
      default: '',
      /** Rounded square tile sized for an icon. */
      icon: 'rounded-lg border border-border bg-muted',
      /** Clipped frame for an image or thumbnail. */
      image: 'overflow-hidden rounded-lg bg-muted',
    },
    size: {
      default: '',
      sm: '',
    },
  },
  compoundVariants: [
    { variant: 'icon', size: 'default', class: 'h-9 w-9' },
    { variant: 'icon', size: 'sm', class: 'h-7 w-7' },
    { variant: 'image', size: 'default', class: 'h-11 w-11' },
    { variant: 'image', size: 'sm', class: 'h-9 w-9' },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

/** Density, set once on the group and read by every part inside a tile. */
const GridItemContext = createContext<{ size: GridItemSize }>({ size: 'default' });

export interface GridItemGroupProps extends ViewProps {
  className?: string;
  /** How many tracks wide the grid is. */
  columns?: number;
  /** Gutter between tiles, in points — both ways. */
  gap?: number;
  /**
   * The shape of one cell, as width ÷ height. `1` is square; below one the
   * cells are taller than they are wide. Ignored when `rowHeight` is given.
   */
  aspect?: number;
  /** Cell height in points, when the grid should not be driven by its width. */
  rowHeight?: number;
  /** Density for every tile in the grid. Set here rather than on each one. */
  size?: GridItemSize;
  children?: ReactNode;
}

/** One tile's place in the grid, in cells. */
interface Placement {
  row: number;
  column: number;
  colSpan: number;
  rowSpan: number;
}

/**
 * The first cell a tile of this size fits in, scanning row by row.
 *
 * The same rule a grid uses for anything it is not told where to put: take the
 * earliest place it fits, never move anything already placed, and open a new
 * row when nothing on the existing ones will do. Row-major, so the order the
 * tiles are written in is the order they are read in — which is the order a
 * screen reader will walk them in too, since that is the child order.
 */
function findSpot(
  occupied: boolean[][],
  columns: number,
  colSpan: number,
  rowSpan: number
): { row: number; column: number } {
  for (let row = 0; ; row += 1) {
    for (let column = 0; column + colSpan <= columns; column += 1) {
      let free = true;
      for (let y = row; y < row + rowSpan && free; y += 1) {
        for (let x = column; x < column + colSpan; x += 1) {
          if (occupied[y]?.[x]) {
            free = false;
            break;
          }
        }
      }
      if (free) return { row, column };
    }
  }
}

/**
 * The grid. Measures its own width, places its tiles, and stands as tall as the
 * rows they ended up needing.
 */
const GridItemGroup = forwardRef<ViewRef, GridItemGroupProps>(
  (
    {
      className,
      columns = 2,
      gap = 12,
      aspect = 1,
      rowHeight,
      size = 'default',
      children,
      ...props
    },
    ref
  ) => {
    const [width, setWidth] = useState(0);

    const tracks = Math.max(1, Math.floor(columns));
    const track = (width - gap * (tracks - 1)) / tracks;
    const cell = rowHeight ?? track / (aspect || 1);

    const { placements, rows } = useMemo(() => {
      const occupied: boolean[][] = [];
      const result: Placement[] = [];
      let used = 0;

      Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        const spans = child.props as { colSpan?: number; rowSpan?: number };
        const colSpan = Math.max(1, Math.min(Math.floor(spans.colSpan ?? 1), tracks));
        const rowSpan = Math.max(1, Math.floor(spans.rowSpan ?? 1));

        const { row, column } = findSpot(occupied, tracks, colSpan, rowSpan);
        for (let y = row; y < row + rowSpan; y += 1) {
          const line = (occupied[y] ??= []);
          for (let x = column; x < column + colSpan; x += 1) line[x] = true;
        }

        result.push({ row, column, colSpan, rowSpan });
        used = Math.max(used, row + rowSpan);
      });

      return { placements: result, rows: used };
    }, [children, tracks]);

    const onLayout = (event: LayoutChangeEvent) => {
      const next = event.nativeEvent.layout.width;
      if (Math.abs(next - width) > 0.5) setWidth(next);
      props.onLayout?.(event);
    };

    const height = rows > 0 ? rows * cell + gap * (rows - 1) : 0;

    let index = -1;

    return (
      <GridItemContext.Provider value={{ size }}>
        <View
          ref={ref}
          onLayout={onLayout}
          accessibilityRole="list"
          style={width > 0 ? { height } : undefined}
          className={cn('w-full', className)}
          {...props}
        >
          {/* Nothing is drawn until the width is known: every tile is placed
              from it, and one frame of tiles piled on the origin is worse than
              one frame of an empty box. */}
          {width > 0
            ? Children.map(children, (child) => {
                if (!isValidElement(child)) return null;
                index += 1;
                const place = placements[index];
                if (!place) return null;
                return (
                  <View
                    style={{
                      position: 'absolute',
                      left: place.column * (track + gap),
                      top: place.row * (cell + gap),
                      width: place.colSpan * track + (place.colSpan - 1) * gap,
                      height: place.rowSpan * cell + (place.rowSpan - 1) * gap,
                    }}
                  >
                    {child}
                  </View>
                );
              })
            : null}
        </View>
      </GridItemContext.Provider>
    );
  }
);
GridItemGroup.displayName = 'GridItem.Group';

export interface GridItemProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'>,
    Omit<VariantProps<typeof gridItemVariants>, 'disabled' | 'size'> {
  className?: string;
  disabled?: boolean;
  /**
   * How many tracks wide the tile is. Clamped to the group's column count, so
   * a tile asking for three columns of a two-column grid is two wide rather
   * than overflowing it.
   *
   * Read by `GridItem.Group`, which does the placing — a tile does not size
   * itself, because a tile that sized itself would not be in a grid.
   */
  colSpan?: number;
  /** How many rows tall it is. Also read by the group. */
  rowSpan?: number;
  children?: ReactNode;
}

/**
 * One tile.
 *
 * Renders as a pressable when given `onPress`, and as a plain view otherwise,
 * so a tile that is only showing a number does not announce itself as a button.
 */
const GridItemRoot = forwardRef<ViewRef, GridItemProps>(
  (
    {
      className,
      variant,
      disabled,
      children,
      onPress,
      // Declared so they are part of the tile's API and typed at the call site,
      // read by the group, and deliberately not applied here.
      colSpan: _colSpan,
      rowSpan: _rowSpan,
      ...props
    },
    ref
  ) => {
    const { size } = useContext(GridItemContext);
    const { root } = gridItemVariants({ variant, size, disabled: !!disabled });

    if (!onPress) {
      return (
        <View
          ref={ref}
          {...(props as ViewProps)}
          accessibilityState={{ disabled: !!disabled }}
          className={root({ className })}
        >
          {textChildren(children)}
        </View>
      );
    }

    return (
      <AnimatedPressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        className={root({ className })}
      >
        {textChildren(children)}
      </AnimatedPressable>
    );
  }
);
GridItemRoot.displayName = 'GridItem';

export interface GridItemBackgroundProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The layer behind the tile's content — a chart, a gradient, an image, a
 * pattern.
 *
 * Absolutely filling the tile and taking no touches, so it can be written
 * anywhere among the children without moving anything. It is what makes a bento
 * grid read as a bento grid rather than as a wall of stat cards, and it is the
 * one part that is meant to be cropped: the tile clips it.
 */
const GridItemBackground = forwardRef<ViewRef, GridItemBackgroundProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      className={cn('overflow-hidden', className)}
      {...props}
    >
      {textChildren(children)}
    </View>
  )
);
GridItemBackground.displayName = 'GridItem.Background';

export interface GridItemMediaProps
  extends ViewProps,
    VariantProps<typeof mediaVariants> {
  className?: string;
  children?: ReactNode;
}

/** Leading slot: an icon tile, a thumbnail, or an avatar passed through. */
const GridItemMedia = forwardRef<ViewRef, GridItemMediaProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    const grid = useContext(GridItemContext);

    return (
      <View
        ref={ref}
        className={mediaVariants({ variant, size: size ?? grid.size, className })}
        {...props}
      >
        {textChildren(children)}
      </View>
    );
  }
);
GridItemMedia.displayName = 'GridItem.Media';

export interface GridItemTitleProps extends TextProps {
  className?: string;
}

/** What the tile is of. Quiet, because the number under it is the message. */
const GridItemTitle = forwardRef<TextRef, GridItemTitleProps>(
  ({ className, ...props }, ref) => {
    const { size } = useContext(GridItemContext);
    const { title } = gridItemVariants({ size });

    return <Text ref={ref} className={title({ className })} {...props} />;
  }
);
GridItemTitle.displayName = 'GridItem.Title';

export interface GridItemValueProps extends TextProps {
  className?: string;
}

/** The figure. The largest thing on the tile, and the reason it is there. */
const GridItemValue = forwardRef<TextRef, GridItemValueProps>(
  ({ className, ...props }, ref) => {
    const { size } = useContext(GridItemContext);
    const { value } = gridItemVariants({ size });

    return <Text ref={ref} className={value({ className })} {...props} />;
  }
);
GridItemValue.displayName = 'GridItem.Value';

export interface GridItemDescriptionProps extends TextProps {
  className?: string;
}

const GridItemDescription = forwardRef<
  TextRef,
  GridItemDescriptionProps
>(({ className, ...props }, ref) => {
  const { size } = useContext(GridItemContext);
  const { description } = gridItemVariants({ size });

  return <Text ref={ref} className={description({ className })} {...props} />;
});
GridItemDescription.displayName = 'GridItem.Description';

export interface GridItemFooterProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The strip along the bottom of the tile.
 *
 * `mt-auto` rather than `absolute`: a tile's height is fixed by its cells, so
 * pushing the footer down with the space left over pins it to the bottom
 * without taking it out of the layout the rest of the tile is sharing.
 */
const GridItemFooter = forwardRef<ViewRef, GridItemFooterProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('mt-auto w-full flex-row items-center gap-2', className)}
      {...props}
    >
      {textChildren(children)}
    </View>
  )
);
GridItemFooter.displayName = 'GridItem.Footer';

export interface GridItemActionsProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Trailing slot: buttons, a chip, a chevron. */
const GridItemActions = forwardRef<ViewRef, GridItemActionsProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('shrink-0 flex-row items-center gap-1.5', className)}
      {...props}
    >
      {textChildren(children)}
    </View>
  )
);
GridItemActions.displayName = 'GridItem.Actions';

export const GridItem = Object.assign(GridItemRoot, {
  Group: GridItemGroup,
  Background: GridItemBackground,
  Media: GridItemMedia,
  Title: GridItemTitle,
  Value: GridItemValue,
  Description: GridItemDescription,
  Footer: GridItemFooter,
  Actions: GridItemActions,
});
