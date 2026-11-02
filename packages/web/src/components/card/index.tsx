'use client';

/**
 * Card — a surface that holds one thing: a plan, a setting, a summary.
 *
 * ```tsx
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Storage</Card.Title>
 *     <Card.Description>Northwind Studio workspace</Card.Description>
 *     <Card.Action><Button variant="ghost">Manage</Button></Card.Action>
 *   </Card.Header>
 *   <Card.Content>…</Card.Content>
 *   <Card.Footer variant="panel">…</Card.Footer>
 * </Card>
 * ```
 *
 * ## The padding is on the parts
 *
 * The card itself draws a surface and nothing inside it, and every part
 * carries its own padding. That is what lets a picture reach the card's
 * corners with nothing but `overflow-hidden` on the card, and what lets a
 * footer be a band set into the bottom of it rather than one more row.
 *
 * ## The action sits beside the heading
 *
 * `Card.Action` is placed in the header's top trailing corner whatever order
 * it is written in, and the title and description keep the rest of the width.
 * A button that belongs to the whole card goes there; one that belongs to the
 * content goes in the content.
 *
 * ## It renders on the server
 *
 * No state, no effects, no handlers of its own: everything that changes with
 * `size` or with the parts present is done in CSS, so a page of cards costs no
 * JavaScript.
 */
import type { ComponentProps } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const cardVariants = tv({
  slots: {
    root: 'group/card flex flex-col rounded-2xl border bg-card text-card-foreground shadow-xs',
    header: [
      'grid auto-rows-min grid-cols-[minmax(0,1fr)] items-start gap-x-4 gap-y-1.5 p-6',
      'has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]',
      'group-data-[size=sm]/card:gap-y-1 group-data-[size=sm]/card:p-4',
    ],
    title: 'text-lg font-semibold leading-tight tracking-[-0.01em] group-data-[size=sm]/card:text-base',
    description: 'text-sm text-muted-foreground',
    // Its own column, across both of the heading's rows, so a long title wraps
    // beside it instead of underneath it.
    action: 'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
    // `first:` for a card with no header, which would otherwise start flush.
    content:
      'px-6 pb-6 first:pt-6 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:pb-4 group-data-[size=sm]/card:first:pt-4',
    footer: 'flex items-center gap-2',
  },
  variants: {
    footer: {
      /** Part of the card: same surface, continuing the content's padding. */
      plain: {
        footer:
          'px-6 pb-6 first:pt-6 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:pb-4 group-data-[size=sm]/card:first:pt-4',
      },
      /**
       * A band set into the bottom of the card: a rule across its top, a step
       * darker, and the card's own bottom corners. For a footer that is what
       * somebody does with the card, not more of what it says.
       */
      panel: {
        footer:
          'mt-auto rounded-b-[calc(var(--radius-2xl)-1px)] border-t bg-muted/60 px-6 py-4 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3',
      },
    },
  },
});

export interface CardProps extends ComponentProps<'div'> {
  /** `sm` tightens the padding and the title, for a card in a dense grid. Default `default`. */
  size?: 'default' | 'sm';
  /**
   * The element to render. `article` for a card that stands on its own, `li`
   * for one in a list, `section` for one that groups a part of a page.
   */
  as?: 'div' | 'article' | 'section' | 'li';
}

function CardRoot({ size = 'default', as = 'div', render, className, ...props }: CardProps & RenderProp<'div'>) {
  const slots = cardVariants();
  return useRender({
    defaultTagName: as,
    render,
    props: mergeProps({ 'data-slot': 'card', 'data-size': size, className: slots.root({ className }) }, props),
  });
}
CardRoot.displayName = 'Card';

export interface CardHeaderProps extends ComponentProps<'div'> {}

/** The title, the line under it, and the action beside them. */
function CardHeader({ className, render, ...props }: CardHeaderProps & RenderProp<'div'>) {
  const slots = cardVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'card-header', className: slots.header({ className }) }, props),
  });
}
CardHeader.displayName = 'Card.Header';

export interface CardTitleProps extends ComponentProps<'h3'> {
  /** The heading level, to fit the page around the card. Default `h3`. */
  as?: 'h2' | 'h3' | 'h4' | 'div';
}

/** What the card is about. A heading, so the page outline includes it. */
function CardTitle({ as = 'h3', render, className, ...props }: CardTitleProps & RenderProp<'h3'>) {
  const slots = cardVariants();
  return useRender({
    defaultTagName: as,
    render,
    props: mergeProps({ 'data-slot': 'card-title', className: slots.title({ className }) }, props),
  });
}
CardTitle.displayName = 'Card.Title';

export interface CardDescriptionProps extends ComponentProps<'p'> {}

/** A line under the title. */
function CardDescription({ className, render, ...props }: CardDescriptionProps & RenderProp<'p'>) {
  const slots = cardVariants();
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps({ 'data-slot': 'card-description', className: slots.description({ className }) }, props),
  });
}
CardDescription.displayName = 'Card.Description';

export interface CardActionProps extends ComponentProps<'div'> {}

/** A control for the whole card, held in the header's top trailing corner. */
function CardAction({ className, render, ...props }: CardActionProps & RenderProp<'div'>) {
  const slots = cardVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'card-action', className: slots.action({ className }) }, props),
  });
}
CardAction.displayName = 'Card.Action';

export interface CardContentProps extends ComponentProps<'div'> {}

/** The body. */
function CardContent({ className, render, ...props }: CardContentProps & RenderProp<'div'>) {
  const slots = cardVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'card-content', className: slots.content({ className }) }, props),
  });
}
CardContent.displayName = 'Card.Content';

export interface CardFooterProps extends ComponentProps<'div'> {
  /**
   * `plain` continues the card. `panel` is a darker band set into its bottom,
   * for actions. Default `plain`.
   */
  variant?: 'plain' | 'panel';
}

/** The row at the bottom, usually the card's actions. */
function CardFooter({ variant = 'plain', className, render, ...props }: CardFooterProps & RenderProp<'div'>) {
  const slots = cardVariants({ footer: variant });
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'card-footer', className: slots.footer({ className }) }, props),
  });
}
CardFooter.displayName = 'Card.Footer';

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Action: CardAction,
  Content: CardContent,
  Footer: CardFooter,
});

export { CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
