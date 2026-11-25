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
 * ## The inset variant
 *
 * `variant="inset"` splits the card into two surfaces: the header sits on the
 * card's outer shell, and the content is a raised well inside it, held off the
 * sides and the bottom by a few pixels and carrying its own radius. The header
 * then reads as the label of what is in the well (a language, a source, a
 * filter) rather than as a heading above it. A `Card.Action` placed inside the
 * content goes to the well's top trailing corner, and `Card.Meta` pins a small
 * reading to its bottom trailing corner.
 *
 * ## It renders on the server
 *
 * No state, no effects, no handlers of its own: everything that changes with
 * `size` or with the parts present is done in CSS, so a page of cards costs no
 * JavaScript.
 */
import { createContext, useContext } from 'react';
import type { ComponentProps, ReactNode } from 'react';
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
    meta: 'mt-auto flex flex-col items-end gap-0.5 self-end pt-6 text-right text-xs leading-none text-muted-foreground tabular-nums',
    metaLabel: 'text-[0.6875rem] text-muted-foreground/70',
  },
  variants: {
    variant: {
      default: {},
      /**
       * Two surfaces: the header on the card's shell, the content in a raised
       * well inset from its sides and bottom. In light the shell is a step
       * greyer than the well; in dark the well is a step lighter, which is how
       * a raised surface reads there.
       */
      inset: {
        root: 'bg-[color-mix(in_oklab,var(--card),var(--foreground)_3.5%)] p-1.5 shadow-xs dark:bg-card',
        // A fixed height, so two inset cards side by side start their wells on
        // one line whether or not a header holds a select.
        header: [
          'min-h-12 content-center items-center px-4.5 py-1.5 group-data-[size=sm]/card:min-h-10 group-data-[size=sm]/card:px-3.5 group-data-[size=sm]/card:py-1',
          '[&_[data-slot=card-title]]:text-sm [&_[data-slot=card-title]]:font-medium [&_[data-slot=card-title]]:tracking-normal',
          '[&>[data-slot=card-action]]:row-span-1 [&>[data-slot=card-action]]:-mr-2 [&>[data-slot=card-action]]:self-center',
        ],
        // The well. Its radius is the card's less the shell's padding, so the
        // two curves stay concentric.
        content: [
          'relative flex flex-1 flex-col rounded-[calc(var(--radius-2xl)-0.375rem)] border bg-card p-5 shadow-xs',
          'first:pt-5 has-[>[data-slot=card-action]]:pr-14 dark:bg-[color-mix(in_oklab,var(--card),white_4%)]',
          'group-data-[size=sm]/card:p-3.5 group-data-[size=sm]/card:first:pt-3.5',
          '[&>[data-slot=card-action]]:absolute [&>[data-slot=card-action]]:top-2.5 [&>[data-slot=card-action]]:right-2.5',
        ],
        footer: '',
      },
    },
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
  /**
   * `default` is one surface. `inset` puts the header on the card's shell and
   * the content in a raised well inside it, for a card whose header labels
   * what the content holds. Default `default`.
   */
  variant?: 'default' | 'inset';
}

const CardVariantContext = createContext<'default' | 'inset'>('default');

function CardRoot({
  size = 'default',
  as = 'div',
  variant = 'default',
  render,
  className,
  ...props
}: CardProps & RenderProp<'div'>) {
  const slots = cardVariants({ variant });
  const element = useRender({
    defaultTagName: as,
    render,
    props: mergeProps(
      { 'data-slot': 'card', 'data-size': size, 'data-variant': variant, className: slots.root({ className }) },
      props,
    ),
  });
  return <CardVariantContext.Provider value={variant}>{element}</CardVariantContext.Provider>;
}
CardRoot.displayName = 'Card';

export interface CardHeaderProps extends ComponentProps<'div'> {}

/** The title, the line under it, and the action beside them. */
function CardHeader({ className, render, ...props }: CardHeaderProps & RenderProp<'div'>) {
  const slots = cardVariants({ variant: useContext(CardVariantContext) });
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
  const slots = cardVariants({ variant: useContext(CardVariantContext) });
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

export interface CardMetaProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** A small word over the value: "Characters", "Updated". */
  label?: ReactNode;
  /** The reading itself: "412 / 2,000", "2m ago". */
  children?: ReactNode;
}

/**
 * A small reading pinned to the bottom trailing corner of the content: a
 * count against a limit, when it was last saved. Place it last in
 * `Card.Content`; it takes whatever height is left above it.
 */
function CardMeta({ label, children, className, render, ...props }: CardMetaProps & RenderProp<'div'>) {
  const slots = cardVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'card-meta',
        className: slots.meta({ className }),
        children: (
          <>
            {label != null && <span className={slots.metaLabel()}>{label}</span>}
            <span>{children}</span>
          </>
        ),
      },
      props,
    ),
  });
}
CardMeta.displayName = 'Card.Meta';

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Action: CardAction,
  Content: CardContent,
  Footer: CardFooter,
  Meta: CardMeta,
});

export { CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, CardMeta };
