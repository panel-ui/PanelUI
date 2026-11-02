'use client';

/**
 * TiltCard — a card that leans towards the pointer, with layers inside it
 * that move by how near they are.
 *
 * ```tsx
 * <TiltCard>
 *   <TiltCard.Layer depth={24}>…a figure…</TiltCard.Layer>
 *   <TiltCard.Layer depth={8}>
 *     <TiltCard.Title>Versions</TiltCard.Title>
 *     <TiltCard.Description>Every save is kept.</TiltCard.Description>
 *   </TiltCard.Layer>
 * </TiltCard>
 * ```
 *
 * ## The card turns on the pointer
 *
 * The card is tipped a few degrees towards wherever the pointer is on it, as
 * a card held in the hand is tipped towards the eye, and a patch of light
 * sits under the pointer. When the pointer leaves, it settles back level.
 *
 * ## Layers give it depth
 *
 * A `TiltCard.Layer` is lifted off the card by its `depth`. As the card tips,
 * a layer further out moves further, which is the whole of what makes a flat
 * drawing read as a thing with a front and a back. Without layers the card
 * still tips; with them there is something to look round.
 *
 * ## It is decoration
 *
 * Nothing is said by the tilt, so nothing is lost without it: it does not
 * follow a finger, and it holds still for anyone who has asked their system
 * for reduced motion. Whatever the card says is in its contents.
 */
import { useRef, type ComponentProps, type PointerEvent as ReactPointerEvent } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** Which of the theme's roles the light under the pointer is drawn in. */
export type TiltCardColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const tiltCardVariants = tv({
  slots: {
    // The eye's distance from the card. Nearer and the lean would be a lurch.
    root: 'group/tilt relative [perspective:900px]',
    /*
     * The lean is two variables the pointer sets. They move at once while the
     * pointer is on the card, and ease back when it has gone, so the card
     * follows a hand exactly and then settles on its own.
     */
    card: 'relative overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-sm transition-[transform,box-shadow,border-color] duration-500 ease-out [transform-style:preserve-3d] [transform:rotateX(var(--pu-rx,0deg))_rotateY(var(--pu-ry,0deg))] group-data-[tilting]/tilt:shadow-xl group-data-[tilting]/tilt:duration-100 motion-reduce:transition-none motion-reduce:[transform:none]',
    // The light is the card's colour, soft and wide, centred on the pointer.
    glare:
      'pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(18rem_circle_at_var(--pu-gx,50%)_var(--pu-gy,50%),color-mix(in_oklab,var(--pu-color)_16%,transparent),transparent_70%)] opacity-0 transition-opacity duration-300 group-data-[tilting]/tilt:opacity-100',
    title: 'text-base font-semibold',
    description: 'text-sm text-muted-foreground',
    layer:
      'transition-transform duration-500 ease-out [transform:translate3d(calc(var(--pu-px,0)*var(--pu-depth)*1px),calc(var(--pu-py,0)*var(--pu-depth)*1px),calc(var(--pu-depth)*1px))] group-data-[tilting]/tilt:duration-100 motion-reduce:[transform:none]',
  },
  variants: {
    color: {
      primary: { card: '[--pu-color:var(--primary)]' },
      info: { card: '[--pu-color:var(--info)]' },
      success: { card: '[--pu-color:var(--success)]' },
      warning: { card: '[--pu-color:var(--warning)]' },
      destructive: { card: '[--pu-color:var(--destructive)]' },
    },
  },
  defaultVariants: { color: 'primary' },
});

export interface TiltCardProps extends Omit<ComponentProps<'div'>, 'color'> {
  /** The furthest the card leans, in degrees. */
  tilt?: number;
  /** Which of the theme's roles the light under the pointer is drawn in. */
  color?: TiltCardColor;
  /** Set to `false` for a card with no light under the pointer. */
  glare?: boolean;
  /** Extra classes for the card itself. `className` goes on the box round it. */
  cardClassName?: string;
}

function TiltCardRoot({
  tilt = 8,
  color = 'primary',
  glare = true,
  className,
  cardClassName,
  children,
  onPointerMove,
  onPointerLeave,
  render,
  ...props
}: TiltCardProps & RenderProp<'div'>) {
  const slots = tiltCardVariants({ color });
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const lean = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    // A finger has no hover to end the lean, and would cover it anyway.
    if (event.pointerType === 'touch') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = root.current;
    if (!node) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const box = node.getBoundingClientRect();
      // Where the pointer is on the card, from -1 at one edge to 1 at the other.
      const x = ((clientX - box.left) / box.width) * 2 - 1;
      const y = ((clientY - box.top) / box.height) * 2 - 1;
      node.dataset.tilting = '';
      // Towards the pointer: the near edge comes forward.
      node.style.setProperty('--pu-rx', `${(-y * tilt).toFixed(2)}deg`);
      node.style.setProperty('--pu-ry', `${(x * tilt).toFixed(2)}deg`);
      node.style.setProperty('--pu-px', x.toFixed(3));
      node.style.setProperty('--pu-py', y.toFixed(3));
      node.style.setProperty('--pu-gx', `${(((x + 1) / 2) * 100).toFixed(1)}%`);
      node.style.setProperty('--pu-gy', `${(((y + 1) / 2) * 100).toFixed(1)}%`);
    });
  };

  const settle = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    cancelAnimationFrame(frame.current);
    const node = root.current;
    if (!node) return;
    delete node.dataset.tilting;
    for (const name of ['--pu-rx', '--pu-ry', '--pu-px', '--pu-py']) node.style.removeProperty(name);
  };

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        ref: root,
        className: slots.root({ className }),
        onPointerMove: lean,
        onPointerLeave: settle,
        children: (
          <>
            <div className={slots.card({ className: cardClassName })}>
              {children}
              {glare ? <span aria-hidden="true" className={slots.glare()} /> : null}
            </div>
          </>
        ),
      },
      props
    ),
  });
}
TiltCardRoot.displayName = 'TiltCard';

export interface TiltCardLayerProps extends ComponentProps<'div'> {
  /** How far off the card it is lifted, in pixels. Further out moves further as the card leans. */
  depth?: number;
}

/** Something lifted off the card, which moves against it as the card leans. */
function TiltCardLayer({ depth = 16, className, style, render, ...props }: TiltCardLayerProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { className: tiltCardVariants().layer({ className }), style: { ['--pu-depth' as string]: depth, ...style } },
      props
    ),
  });
}
TiltCardLayer.displayName = 'TiltCard.Layer';

export interface TiltCardTitleProps extends ComponentProps<'h3'> {
  /** The heading level, to fit the page around the card. Default `h3`. */
  as?: 'h2' | 'h3' | 'h4' | 'p';
}

/** What the card is about. */
function TiltCardTitle({ as: Tag = 'h3', className, ...props }: TiltCardTitleProps) {
  return <Tag data-slot="tilt-card-title" className={tiltCardVariants().title({ className })} {...props} />;
}
TiltCardTitle.displayName = 'TiltCard.Title';

export interface TiltCardDescriptionProps extends ComponentProps<'p'> {}

/** A line or two of body text, under the title. */
function TiltCardDescription({ className, render, ...props }: TiltCardDescriptionProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      { 'data-slot': 'tilt-card-description', className: tiltCardVariants().description({ className }) },
      props
    ),
  });
}
TiltCardDescription.displayName = 'TiltCard.Description';

export const TiltCard = Object.assign(TiltCardRoot, {
  Layer: TiltCardLayer,
  Title: TiltCardTitle,
  Description: TiltCardDescription,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { TiltCardLayer, TiltCardTitle, TiltCardDescription };
