/**
 * ButtonGroup — several buttons drawn as one control.
 *
 * ```tsx
 * <ButtonGroup>
 *   <Button startContent={<ListChecksIcon size={16} />}>Tasks</Button>
 *   <Button startContent={<CalendarIcon size={16} />}>Agenda</Button>
 *   <Button startContent={<ChartIcon size={16} />}>Board</Button>
 * </ButtonGroup>
 * ```
 *
 * The buttons stay buttons. Anything a `Button` does — an icon, a badge, a
 * loading state, a disabled segment, opening a Popover — it still does inside a
 * group, because the group is a container rather than a component that takes a
 * list of items and renders them for you. A list-of-items API has to grow a
 * prop for every one of those things; this one has none of them and can do all
 * of them.
 *
 * ## Why the container draws the border
 *
 * A joined run could be built by giving the first and last segments their
 * corners and squaring the ones between, then collapsing every shared edge with
 * a negative margin. That works on the web and is a stack of off-by-one
 * problems on a phone: the hairlines land on different fractions of a pixel per
 * device, and a run that wraps has no first or last segment any more.
 *
 * So the group draws the shape once — one border, one radius, one shadow,
 * clipped — and the buttons inside it draw none of their own. The dividers are
 * real one-pixel views the group puts between its children, which is also why
 * they are always exactly one pixel and always in the same place.
 *
 * ## What it passes down
 *
 * `variant` and `size` fill in for a button that did not choose its own, so a
 * run of six does not repeat the same two props six times. A segment that wants
 * to stand out — the selected one, the destructive one — sets its own and wins.
 *
 * ```tsx
 * <ButtonGroup size="sm">
 *   <Button>Day</Button>
 *   <Button variant="secondary">Week</Button>   {/* the selected one *\/}
 *   <Button>Month</Button>
 * </ButtonGroup>
 * ```
 *
 * ## Not a selection control
 *
 * This joins buttons; what they mean is yours. For a control that owns which
 * one is on, reach for `ToggleButtonGroup`, and for switching between panels of
 * content reach for `Tabs` — a segmented run of buttons that swaps a screen is
 * navigation, and navigation should say so to a screen reader.
 */
import { Children, Fragment, forwardRef, useMemo, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import {
  ButtonGroupProvider,
  type ButtonGroupContextValue,
  type ButtonSize,
  type ButtonVariant,
} from '../button';
import type { ViewRef } from '../../primitives/refs';

/** Which way the run reads. */
export type ButtonGroupOrientation = 'horizontal' | 'vertical';

const buttonGroupVariants = tv({
  slots: {
    root: 'items-stretch',
    divider: 'bg-border',
  },
  variants: {
    orientation: {
      horizontal: { root: 'flex-row', divider: 'w-px' },
      vertical: { root: 'flex-col', divider: 'h-px' },
    },
    attached: {
      // `overflow-hidden` is what squares the inner corners and rounds the
      // outer ones without any segment knowing which it is.
      true: { root: 'overflow-hidden border border-input bg-popover shadow-sm' },
      false: { root: 'gap-2' },
    },
    /* Matched to the height the buttons will be, since a radius that suited a
       36pt run reads as a rectangle around a 48pt one. */
    size: {
      xs: { root: 'rounded-md' },
      sm: { root: 'rounded-lg' },
      md: { root: 'rounded-xl' },
      lg: { root: 'rounded-xl' },
      xl: { root: 'rounded-2xl' },
      icon: { root: 'rounded-xl' },
    },
    fullWidth: {
      true: { root: 'w-full' },
    },
  },
  compoundVariants: [
    // Nothing is being joined, so the radius belongs to each button instead.
    { attached: false, class: { root: 'rounded-none' } },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    attached: true,
    size: 'md',
  },
});

type ButtonGroupVariantProps = VariantProps<typeof buttonGroupVariants>;

export interface ButtonGroupProps
  extends ViewProps,
    Omit<ButtonGroupVariantProps, 'size' | 'attached'> {
  className?: string;
  /** Which way the run reads. Vertical is the toolbar down the side of a canvas. */
  orientation?: ButtonGroupOrientation;
  /** Fills in for any button that did not choose its own. */
  variant?: ButtonVariant;
  /** Fills in for any button that did not choose its own, and sets the radius. */
  size?: ButtonSize;
  /**
   * Draw the run as one joined shape.
   *
   * On by default — that is what a group is. Turn it off for a plain row of
   * separate buttons that should still share a variant and a size, which is a
   * toolbar rather than a segmented control.
   */
  attached?: boolean;
  /**
   * Span the container, with the segments sharing it equally.
   *
   * Equally, not by content: a row of segments at their natural widths is a row
   * whose divisions move when the labels change, and a picker whose halves are
   * different sizes reads as though one of them matters more.
   */
  fullWidth?: boolean;
  children?: ReactNode;
}

const ButtonGroupRoot = forwardRef<ViewRef, ButtonGroupProps>(
  (
    {
      className,
      orientation = 'horizontal',
      variant,
      size = 'md',
      attached = true,
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    const { root, divider } = buttonGroupVariants({
      orientation,
      attached,
      size,
      fullWidth,
    });

    const context = useMemo<ButtonGroupContextValue>(
      () => ({ variant, size, attached, fullWidth }),
      [variant, size, attached, fullWidth]
    );

    /*
     * `Children.toArray` rather than the raw children: it drops the nulls a
     * conditional segment leaves behind and flattens fragments, so a run built
     * by a `map` or by `{canEdit && <Button/>}` gets its dividers in the right
     * places instead of one before a segment that is not there.
     */
    const items = Children.toArray(children);

    return (
      <ButtonGroupProvider value={context}>
        <View
          ref={ref}
          {...props}
          // A run of related actions is a toolbar; a screen reader announcing
          // the group is what tells someone the buttons in it belong together.
          accessibilityRole="toolbar"
          className={root({ className })}
        >
          {items.map((child, index) => (
            // Index keys: these fragments have no identity of their own, and
            // the children keep whatever keys they were already given.
            <Fragment key={index}>
              {index > 0 && attached ? <View className={divider()} /> : null}
              {/* The share of the row is taken by a wrapper rather than by the
                  button, so a segment that is a Popover trigger — a button
                  inside something else — still gets one. */}
              {fullWidth ? <View className="flex-1">{child}</View> : child}
            </Fragment>
          ))}
        </View>
      </ButtonGroupProvider>
    );
  }
);

ButtonGroupRoot.displayName = 'ButtonGroup';

export const ButtonGroup = ButtonGroupRoot;
