'use client';

/**
 * Frame — a widget shell: a panel of rows sitting in a tray, with the tray's
 * one exposed strip along the top carrying the title.
 *
 * ```tsx
 * <Frame>
 *   <Frame.Header>
 *     <Frame.Title>Deploys</Frame.Title>
 *     <Frame.Action>Last 24 hours</Frame.Action>
 *   </Frame.Header>
 *   <Frame.Panel>
 *     <Frame.Row>
 *       <Frame.Media><RocketIcon /></Frame.Media>
 *       <Frame.Content>
 *         <Frame.Title>main · a41c2e9</Frame.Title>
 *         <Frame.Description>Production · 2 minutes ago</Frame.Description>
 *       </Frame.Content>
 *       <Frame.Actions><Badge>Ready</Badge></Frame.Actions>
 *     </Frame.Row>
 *   </Frame.Panel>
 * </Frame>
 * ```
 *
 * ## Two surfaces, one exposed edge
 *
 * The panel sits flush against the shell's left, right and bottom, so the
 * shell reads as something the panel is set into rather than as a border
 * round it — and the strip left at the top is the header, which is why the
 * header needs no rule under it and no background of its own. The panel's
 * bottom corners are not drawn at all: the shell clips them to its own radius.
 *
 * ## Four ways to nest them
 *
 * `default` is the tray. `band` holds a bordered card in a thin muted band,
 * with the band's top strip naming what is inside — the frame for a widget
 * with one thing to show, a figure or a chart, rather than a list of rows.
 * `inset` floats the panel clear of the shell on all four sides, at the radius
 * that keeps the two curves concentric, and the band left round it is a recess
 * — darker than the panel in a light theme and a dark one alike — that
 * `Frame.Footer` puts its actions in. `plain` drops the shell, for a frame
 * inside something that already draws an edge, where a second one just inside
 * it reads as a double line.
 *
 * ## Rows divide themselves
 *
 * The panel draws the hairline between its children, so no row has to know
 * whether it is first. Under `band` it draws none: a figure and its chart are
 * one thing, not two rows. A row with `href` is a link and one with `onClick`
 * is a button, each with the hover and focus a pressable row should have, and
 * `chevron` marks one that leads somewhere.
 *
 * ## It renders on the server
 *
 * The variant reaches the parts through a data attribute and CSS rather than
 * through context, so a frame has no client JavaScript of its own.
 */
import type { ComponentProps, MouseEventHandler, ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/*
 * `inset` geometry. The panel's radius is the shell's less the shell's padding,
 * so the two curves are concentric — a panel radius that ignored the band
 * would leave a crescent of shell thicker at the corners than along the sides.
 */
const frameVariants = tv({
  slots: {
    root: 'group/frame flex flex-col text-foreground',
    header: [
      'grid grid-cols-[minmax(0,1fr)] items-center gap-x-3 px-4 pt-2.5 pb-3',
      'has-data-[slot=frame-action]:grid-cols-[minmax(0,1fr)_auto]',
      // The action spans two rows, so with no description the second is empty
      // and a gap under the title would only add height.
      'has-data-[slot=frame-description]:gap-y-0.5',
      'group-data-[variant=inset]/frame:px-3 group-data-[variant=inset]/frame:pt-1 group-data-[variant=inset]/frame:pb-2.5',
      'group-data-[variant=plain]/frame:px-1',
      'group-data-[variant=band]/frame:px-3.5 group-data-[variant=band]/frame:py-2.5',
    ],
    /*
     * One part in two places. In the header it labels the tray, so it stays
     * quiet; inside a row's content it is the row's subject, so it takes the
     * foreground and the weight, and truncates rather than pushing the row's
     * trailing slot out of view.
     */
    title: [
      'text-sm font-medium text-muted-foreground',
      'in-data-[slot=frame-content]:truncate in-data-[slot=frame-content]:text-foreground',
      // A band names one thing rather than captioning a list, so its title reads first.
      'group-data-[variant=band]/frame:text-foreground',
    ],
    description: 'text-sm text-muted-foreground in-data-[slot=frame-content]:truncate',
    action: 'col-start-2 row-span-2 row-start-1 text-sm text-muted-foreground',
    // The panel's shape follows the root's variant, read from its data attribute.
    panel: [
      'flex flex-col divide-y overflow-hidden bg-card text-card-foreground',
      // A band holds one figure, not a list of rows, so nothing in it is ruled off.
      'group-data-[variant=band]/frame:divide-y-0',
      'group-data-[variant=default]/frame:rounded-t-2xl group-data-[variant=default]/frame:border-t',
      'group-data-[variant=plain]/frame:rounded-3xl group-data-[variant=plain]/frame:border group-data-[variant=plain]/frame:shadow-xs',
      'group-data-[variant=inset]/frame:rounded-[30px] group-data-[variant=inset]/frame:bg-popover group-data-[variant=inset]/frame:text-popover-foreground group-data-[variant=inset]/frame:shadow-xs',
      // 18px is the band's 24 less its 6px of padding: one corner, two curves.
      'group-data-[variant=band]/frame:rounded-[1.125rem] group-data-[variant=band]/frame:border group-data-[variant=band]/frame:shadow-xs',
    ],
    row: 'flex w-full items-center gap-3 px-4 py-3 text-start',
    rowPressable: [
      'cursor-pointer outline-none transition-colors hover:bg-muted/60',
      'focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    ],
    chevron: 'size-4 shrink-0 text-muted-foreground/70 rtl:-scale-x-100',
    media: 'flex shrink-0 items-center justify-center',
    content: 'flex min-w-0 flex-1 flex-col gap-0.5',
    actions: 'flex shrink-0 items-center gap-1.5',
    section: 'flex flex-col divide-y',
    sectionTitle: 'bg-muted/40 px-4 pt-2.5 pb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground',
    footer: [
      'flex items-center gap-2 px-4 pt-3 pb-3.5',
      // Under `inset` the band is a row of equal decisions: equal widths, full pills.
      'group-data-[variant=inset]/frame:gap-3.5 group-data-[variant=inset]/frame:px-[18px] group-data-[variant=inset]/frame:pt-4 group-data-[variant=inset]/frame:pb-2.5',
      'group-data-[variant=inset]/frame:*:h-11 group-data-[variant=inset]/frame:*:flex-1 group-data-[variant=inset]/frame:*:rounded-full',
      'group-data-[variant=plain]/frame:px-1',
      'group-data-[variant=band]/frame:px-3.5 group-data-[variant=band]/frame:pt-2.5 group-data-[variant=band]/frame:pb-1',
    ],
  },
  variants: {
    variant: {
      default: {
        // `overflow-hidden` is what gives the panel the shell's bottom corners.
        root: 'overflow-hidden rounded-3xl border bg-muted',
      },
      plain: {},
      band: {
        root: 'rounded-3xl bg-muted p-1.5',
      },
      inset: {
        // The band is the popover surface with black mixed in, so it is the
        // darker of the two in either theme, which a step on a grey scale
        // cannot promise: those run darker one way and lighter the other.
        root: [
          'rounded-[38px] p-2 ring-1 ring-foreground/[0.06]',
          'bg-[color-mix(in_oklab,var(--popover),black_5%)] dark:bg-[color-mix(in_oklab,var(--popover),black_14%)]',
        ],
      },
    },
  },
  defaultVariants: { variant: 'default' },
});

export type FrameVariant = 'default' | 'band' | 'inset' | 'plain';

export interface FrameProps extends ComponentProps<'div'> {
  /**
   * `default` sets the panel in a tray. `band` holds a bordered card in a
   * thin muted band, for a widget showing one figure or chart, and its panel
   * draws no rule between its children. `inset` floats
   * the panel in a recessed band and gives `Frame.Footer` somewhere to sit.
   * `plain` drops the shell, for a frame inside a container that already draws
   * its own edge.
   */
  variant?: FrameVariant;
}

function FrameRoot({ variant = 'default', className, render, ...props }: FrameProps & RenderProp<'div'>) {
  const slots = frameVariants({ variant });
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'frame', 'data-variant': variant, className: slots.root({ className }) }, props),
  });
}
FrameRoot.displayName = 'Frame';

export interface FrameHeaderProps extends ComponentProps<'div'> {}

/**
 * The strip of shell above the panel: a title, an optional description under
 * it, and `Frame.Action` on the trailing side.
 */
function FrameHeader({ className, render, ...props }: FrameHeaderProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'frame-header', className: frameVariants().header({ className }) }, props),
  });
}
FrameHeader.displayName = 'Frame.Header';

export interface FrameTitleProps extends ComponentProps<'h3'> {
  /** The heading level in a header. Default `h3`; a row title is always a `p`. */
  as?: 'h2' | 'h3' | 'h4' | 'p';
}

/** A caption in the header; the subject line inside `Frame.Content`. */
function FrameTitle({ as: Tag = 'h3', className, ...props }: FrameTitleProps) {
  return <Tag data-slot="frame-title" className={frameVariants().title({ className })} {...props} />;
}
FrameTitle.displayName = 'Frame.Title';

export interface FrameDescriptionProps extends ComponentProps<'p'> {}

/** A line under a title, in the header or in a row. */
function FrameDescription({ className, render, ...props }: FrameDescriptionProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      { 'data-slot': 'frame-description', className: frameVariants().description({ className }) },
      props
    ),
  });
}
FrameDescription.displayName = 'Frame.Description';

export interface FrameActionProps extends ComponentProps<'div'> {}

/** The header's trailing side: a short status, a link, a small button. */
function FrameAction({ className, render, ...props }: FrameActionProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'frame-action', className: frameVariants().action({ className }) }, props),
  });
}
FrameAction.displayName = 'Frame.Action';

export interface FramePanelProps extends ComponentProps<'div'> {}

/** The card the rows sit on. It draws the hairline between its children, except under `band`. */
function FramePanel({ className, render, ...props }: FramePanelProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'frame-panel', className: frameVariants().panel({ className }) }, props),
  });
}
FramePanel.displayName = 'Frame.Panel';

export interface FrameRowProps extends Omit<ComponentProps<'div'>, 'onClick'> {
  /** Make the row a link to this address. */
  href?: string;
  /** Where a link row opens, as on an `<a>`. */
  target?: string;
  /** The relationship of a link row's target, as on an `<a>`. */
  rel?: string;
  /** Make the row a button that calls this. Ignored when `href` is set. */
  onClick?: MouseEventHandler<HTMLElement>;
  /** A trailing chevron, for a row that leads somewhere. */
  chevron?: boolean;
}

const Chevron = ({ className }: { className: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/**
 * One line of the panel: `Frame.Media`, `Frame.Content` and `Frame.Actions`
 * side by side. With `href` it is a link and with `onClick` a button.
 */
function FrameRow({
  className,
  children,
  chevron = false,
  href,
  target,
  rel,
  render,
  ...props
}: FrameRowProps & RenderProp<'div'>) {
  const slots = frameVariants();
  const inside = (
    <>
      {children}
      {chevron ? <Chevron className={slots.chevron()} /> : null}
    </>
  );
  // Called before any branch, so a prop that changes later cannot change the hook count.
  const rendered = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'frame-row', className: slots.row({ className }), children: <>{inside}</> },
      props
    ),
  });
  if (href !== undefined) {
    return (
      <a
        data-slot="frame-row"
        href={href}
        target={target}
        rel={rel}
        className={slots.row({ className: [slots.rowPressable(), className] })}
        {...(props as ComponentProps<'a'>)}
      >
        {inside}
      </a>
    );
  }
  // `onClick` stays in `props`, so it reaches whichever element is rendered.
  if (props.onClick !== undefined) {
    return (
      <button
        type="button"
        data-slot="frame-row"
        className={slots.row({ className: [slots.rowPressable(), className] })}
        {...(props as ComponentProps<'button'>)}
      >
        {inside}
      </button>
    );
  }
  return rendered;
}
FrameRow.displayName = 'Frame.Row';

export interface FrameMediaProps extends ComponentProps<'div'> {}

/** A row's leading icon, avatar or picture. Holds its size. */
function FrameMedia({ className, render, ...props }: FrameMediaProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'frame-media', className: frameVariants().media({ className }) }, props),
  });
}
FrameMedia.displayName = 'Frame.Media';

export interface FrameContentProps extends ComponentProps<'div'> {}

/**
 * The flexible middle of a row, usually a title over a description. It takes
 * what the media and actions leave and may shrink past its content, which is
 * what keeps a long line from pushing the rest of the row off the edge.
 */
function FrameContent({ className, render, ...props }: FrameContentProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'frame-content', className: frameVariants().content({ className }) }, props),
  });
}
FrameContent.displayName = 'Frame.Content';

export interface FrameActionsProps extends ComponentProps<'div'> {}

/** A row's trailing side: a badge, a value, a switch, a small button. Holds its size. */
function FrameActions({ className, render, ...props }: FrameActionsProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'frame-actions', className: frameVariants().actions({ className }) }, props),
  });
}
FrameActions.displayName = 'Frame.Actions';

export interface FrameSectionProps extends Omit<ComponentProps<'section'>, 'title'> {
  /** The heading over the section's rows. */
  title?: ReactNode;
}

/** A labelled group of rows, for a panel holding more than one. */
function FrameSection({ title, className, children, render, ...props }: FrameSectionProps & RenderProp<'section'>) {
  const slots = frameVariants();
  return useRender({
    defaultTagName: 'section',
    render,
    props: mergeProps(
      {
        'data-slot': 'frame-section',
        className: slots.section({ className }),
        children: (
          <>
            {title !== undefined ? <h4 className={slots.sectionTitle()}>{title}</h4> : null}
            {children}
          </>
        ),
      },
      props
    ),
  });
}
FrameSection.displayName = 'Frame.Section';

export interface FrameFooterProps extends ComponentProps<'div'> {}

/**
 * The strip below the panel. Under `inset` its children become equal pills in
 * the recessed band, the shape a row of decisions takes.
 */
function FrameFooter({ className, render, ...props }: FrameFooterProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'frame-footer', className: frameVariants().footer({ className }) }, props),
  });
}
FrameFooter.displayName = 'Frame.Footer';

export const Frame = Object.assign(FrameRoot, {
  Header: FrameHeader,
  Title: FrameTitle,
  Description: FrameDescription,
  Action: FrameAction,
  Panel: FramePanel,
  Row: FrameRow,
  Media: FrameMedia,
  Content: FrameContent,
  Actions: FrameActions,
  Section: FrameSection,
  Footer: FrameFooter,
});

export {
  FrameHeader,
  FrameTitle,
  FrameDescription,
  FrameAction,
  FramePanel,
  FrameRow,
  FrameMedia,
  FrameContent,
  FrameActions,
  FrameSection,
  FrameFooter,
};
