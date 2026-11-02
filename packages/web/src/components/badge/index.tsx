'use client';

/**
 * Badge — a short label that says what state something is in, or what kind of thing it is.
 *
 * ```tsx
 * <Badge>New</Badge>
 * <Badge variant="success" dot>Operational</Badge>
 * <Badge variant="info" dot="pulse">Building</Badge>
 * ```
 *
 * ## Status colours are tinted, not filled
 *
 * A status badge sits inside a row of other text, and a solid green or red
 * block pulls the eye away from the row it belongs to. `success`, `info`,
 * `warning` and `destructive` draw their colour as a light tint with text in
 * the same hue, so a column of them reads as a column of states rather than a
 * column of buttons. `default` is the one solid badge, for the single thing on
 * a screen that should be seen first.
 *
 * ## The dot says it is live
 *
 * `dot` puts a small mark before the text in the badge's colour. `dot="pulse"`
 * makes it breathe, for a state that is still changing — a build running, a
 * call connected — and stops once the state settles. The pulse is off for
 * readers who ask for reduced motion.
 *
 * A badge is not a control. For a label that can be pressed, removed or
 * toggled, use Chip.
 */
import type { ComponentProps } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'info' | 'warning' | 'destructive';
export type BadgeSize = 'sm' | 'md' | 'lg';

const badgeVariants = tv({
  slots: {
    root: [
      'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border font-medium',
      'tabular-nums [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3.5',
    ],
    dot: 'relative inline-flex size-1.5 shrink-0 rounded-full bg-current',
    halo: 'absolute inset-0 rounded-full bg-current opacity-60 animate-ping motion-reduce:hidden',
  },
  variants: {
    variant: {
      default: { root: 'border-transparent bg-primary text-primary-foreground' },
      secondary: { root: 'border-transparent bg-secondary text-secondary-foreground' },
      outline: { root: 'border-border bg-transparent text-foreground', dot: 'text-muted-foreground' },
      // The four states share one recipe, read from --badge-color.
      success: { root: '[--badge-color:var(--success)]' },
      info: { root: '[--badge-color:var(--info)]' },
      warning: { root: '[--badge-color:var(--warning)]' },
      destructive: { root: '[--badge-color:var(--destructive)]' },
    },
    tinted: {
      true: {
        root: [
          'border-[color-mix(in_oklab,var(--badge-color)_22%,var(--background))]',
          'bg-[color-mix(in_oklab,var(--badge-color)_10%,var(--background))] dark:bg-[color-mix(in_oklab,var(--badge-color)_16%,var(--background))]',
          // Text in the badge's own hue, pulled towards the foreground so it stays legible on the tint.
          'text-[color-mix(in_oklab,var(--badge-color),var(--foreground)_30%)]',
        ],
        dot: 'text-(--badge-color)',
      },
    },
    size: {
      sm: { root: 'h-5 px-1.5 text-[0.6875rem] leading-none' },
      md: { root: 'h-6 px-2 text-xs leading-none' },
      lg: { root: 'h-7 px-2.5 text-[0.8125rem] leading-none' },
    },
  },
  defaultVariants: { variant: 'default', size: 'md', tinted: false },
});

const TINTED: ReadonlySet<BadgeVariant> = new Set(['success', 'info', 'warning', 'destructive']);

export interface BadgeProps extends ComponentProps<'span'> {
  /**
   * What it means. `default` is solid, for the one thing that should be seen
   * first; the four states are tinted in their theme colour. Default `default`.
   */
  variant?: BadgeVariant;
  /** Its height and text size. Default `md`. */
  size?: BadgeSize;
  /**
   * A dot before the text in the badge's colour. `'pulse'` makes it breathe,
   * for a state that is still changing.
   */
  dot?: boolean | 'pulse';
}

/** A short label for a state or a kind. Renders a `<span>`. */
function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  children,
  render,
  ...props
}: BadgeProps & RenderProp<'span'>) {
  const slots = badgeVariants({ variant, size, tinted: TINTED.has(variant) });
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'data-slot': 'badge',
        'data-variant': variant,
        className: slots.root({ className }),
        children: (
          <>
            {dot ? (
              <span data-slot="badge-dot" aria-hidden="true" className={slots.dot()}>
                {dot === 'pulse' ? <span className={slots.halo()} /> : null}
              </span>
            ) : null}
            {children}
          </>
        ),
      },
      props
    ),
  });
}
Badge.displayName = 'Badge';

export { Badge };
