'use client';

/**
 * Stat — one figure written large, with what it is and what it means.
 *
 * ```tsx
 * <Stat>
 *   <Stat.Content>
 *     <Stat.Label>Response time</Stat.Label>
 *     <Stat.Value>
 *       240<Stat.Unit>ms</Stat.Unit>
 *     </Stat.Value>
 *   </Stat.Content>
 *   <Stat.Badge>60 ms inside budget</Stat.Badge>
 * </Stat>
 * ```
 *
 * ## The figure over the chart
 *
 * It is the reading at the top of a panel whose body is a meter, a bar chart
 * or a grid of days: the label says what is measured, the value is the
 * reading, and the badge on the trailing side says how that reading stands.
 * Change the value as the chart beside it changes and the two read as one.
 *
 * ## The row sets the baseline
 *
 * Inside `Stat`, the value is set solid, with no leading, so its foot sits on
 * the same line as the badge's at the bottom of the row. Outside it, as a
 * label and a value stacked on their own, the value keeps its line height and
 * sits in running text like any other line.
 *
 * ## The unit follows the value's size
 *
 * `Stat.Unit` is written inside `Stat.Value` and takes its size and its gap
 * from it, so a unit never has to be sized by hand to match its number.
 *
 * ## It renders on the server
 *
 * No state and no handlers. Everything that depends on where a part sits is
 * done in CSS from data attributes, so a Server Component can render it.
 */
import type { ComponentProps } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const statVariants = tv({
  slots: {
    root: 'flex items-end justify-between gap-4',
    content: 'flex flex-col gap-1',
    label: 'text-sm text-muted-foreground',
    description: 'text-sm font-medium',
    // Solid inside a row, so its foot lines up with the badge's.
    value: 'group/stat-value font-bold tracking-tight in-data-[slot=stat]:leading-none',
    unit: [
      'ms-1 text-sm font-medium text-muted-foreground',
      'group-data-[size=lg]/stat-value:ms-1.5 group-data-[size=lg]/stat-value:text-base',
    ],
    badge: 'rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground',
  },
  variants: {
    size: {
      sm: { value: 'text-2xl' },
      md: { value: 'text-3xl' },
      lg: { value: 'text-4xl' },
    },
    weight: {
      normal: {},
      medium: { label: 'font-medium' },
    },
  },
});

export interface StatProps extends ComponentProps<'div'> {}

/** A row: the label and value on the leading side, a badge on the trailing one. */
function StatRoot({ className, render, ...props }: StatProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'stat', className: statVariants().root({ className }) }, props),
  });
}
StatRoot.displayName = 'Stat';

export interface StatContentProps extends ComponentProps<'div'> {}

/** The label and the value, stacked. Used on its own when there is no badge. */
function StatContent({ className, render, ...props }: StatContentProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'stat-content', className: statVariants().content({ className }) }, props),
  });
}
StatContent.displayName = 'Stat.Content';

export interface StatLabelProps extends ComponentProps<'p'> {
  /**
   * `medium` sets the label in a heavier weight, for a figure that stands on
   * its own rather than at the top of a panel that is already titled.
   * Default `normal`.
   */
  weight?: 'normal' | 'medium';
}

/** What is measured, in a quiet line over the value. */
function StatLabel({ weight = 'normal', className, render, ...props }: StatLabelProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps({ 'data-slot': 'stat-label', className: statVariants({ weight }).label({ className }) }, props),
  });
}
StatLabel.displayName = 'Stat.Label';

export interface StatDescriptionProps extends ComponentProps<'p'> {}

/** What the reading means, in words: "Answering slowly". Written under the label. */
function StatDescription({ className, render, ...props }: StatDescriptionProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps({ 'data-slot': 'stat-description', className: statVariants().description({ className }) }, props),
  });
}
StatDescription.displayName = 'Stat.Description';

export interface StatValueProps extends ComponentProps<'p'> {
  /** `sm` is 2xl, `md` 3xl and `lg` 4xl. Default `lg`. */
  size?: 'sm' | 'md' | 'lg';
}

/** The figure. Put a `Stat.Unit` inside it, after the number. */
function StatValue({ size = 'lg', className, render, ...props }: StatValueProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      { 'data-slot': 'stat-value', 'data-size': size, className: statVariants({ size }).value({ className }) },
      props
    ),
  });
}
StatValue.displayName = 'Stat.Value';

export interface StatUnitProps extends ComponentProps<'span'> {}

/** The unit after the number, smaller and quieter, sized from the value it is in. */
function StatUnit({ className, render, ...props }: StatUnitProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'stat-unit', className: statVariants().unit({ className }) }, props),
  });
}
StatUnit.displayName = 'Stat.Unit';

export interface StatBadgeProps extends ComponentProps<'span'> {}

/** How the reading stands, in a pill on the row's trailing side. */
function StatBadge({ className, render, ...props }: StatBadgeProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'stat-badge', className: statVariants().badge({ className }) }, props),
  });
}
StatBadge.displayName = 'Stat.Badge';

export const Stat = Object.assign(StatRoot, {
  Content: StatContent,
  Label: StatLabel,
  Description: StatDescription,
  Value: StatValue,
  Unit: StatUnit,
  Badge: StatBadge,
});

export { StatContent, StatLabel, StatDescription, StatValue, StatUnit, StatBadge };
