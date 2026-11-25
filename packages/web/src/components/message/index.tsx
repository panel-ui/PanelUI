'use client';

/**
 * Message — one turn of a conversation with an assistant.
 *
 * ```tsx
 * <Message from="user">
 *   <Message.Content>
 *     <Message.Bubble>
 *       <Message.BubbleContent>What changed in the Q3 numbers?</Message.BubbleContent>
 *     </Message.Bubble>
 *   </Message.Content>
 * </Message>
 *
 * <Message from="assistant">
 *   <Message.Content>
 *     <Message.Bubble>
 *       <Message.BubbleContent>Revenue rose 12%…</Message.BubbleContent>
 *     </Message.Bubble>
 *     <Message.Actions>
 *       <Message.Action label="Copy" copy={text} />
 *     </Message.Actions>
 *   </Message.Content>
 * </Message>
 * ```
 *
 * ## Two kinds of turn, drawn differently
 *
 * What the person writes is short and is theirs, so it sits in a bubble on
 * the trailing side, the way a sent message does. What the assistant writes is
 * long, has paragraphs, lists and code, and is the thing being read, so it is
 * not boxed at all: it runs the full width as prose, and the page is its
 * surface. A bubble round a page of text only narrows it.
 *
 * ## Actions under the answer
 *
 * Copy, retry, rate and the switcher between versions of an answer sit in a
 * row under it. On the latest answer they stay in view, because that is the
 * one they are for. On earlier ones, `reveal="hover"` keeps them out of the
 * way until the turn is hovered or focused, and on a touch screen, where
 * there is no hover, they always show.
 *
 * ## While it is being written
 *
 * `streaming` puts a caret after the last word and marks the turn busy, so a
 * screen reader waits for it to finish. Before the first word arrives,
 * `Message.Status` says what the assistant is doing, as a line that shimmers.
 *
 * ## Citations
 *
 * A sentence an answer takes from somewhere is wrapped in `Message.Cite`, and
 * a `Message.Citation` after it names the source: a small chip with the
 * site's mark and domain. Pointing at the chip, or focusing it, lights the
 * sentence it supports and opens a card with the passage it was taken from.
 * `Message.Sources` under the answer lists every source once; pointing at a
 * row there lights every sentence that cites it. Sources are matched by `id`,
 * so the same source can back several sentences.
 */
import { PreviewCard } from '@base-ui/react/preview-card';
import { Tooltip } from '@base-ui/react/tooltip';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type MessageFrom = 'user' | 'assistant';

const messageVariants = tv({
  slots: {
    root: 'group/message flex w-full gap-3',
    group: 'flex w-full flex-col gap-1.5',
    avatar: 'flex w-8 shrink-0 justify-center pt-0.5 empty:invisible',
    content: 'flex min-w-0 flex-col gap-1.5',
    header: 'flex items-baseline gap-2 text-xs text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground',
    bubble: 'min-w-0',
    bubbleContent: [
      'min-w-0 text-[0.9375rem] leading-7 text-foreground [overflow-wrap:anywhere]',
      // Prose: what an answer is usually made of.
      '[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
      '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:my-1 [&_li]:ps-1 [&_li::marker]:text-muted-foreground',
      // Links in the text; a component's own link inside it keeps its own look.
      '[&_strong]:font-semibold [&_a:not([data-slot])]:underline [&_a:not([data-slot])]:underline-offset-4',
      '[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.8125rem]',
      '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:bg-muted/50 [&_pre]:p-3.5 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-6',
      '[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:font-semibold',
    ],
    // The caret is a soft block that breathes rather than blinks. Written out
    // twice: after the text itself, and inside its last block.
    caret:
      "after:ms-0.5 after:inline-block after:h-[1.05em] after:w-[0.5em] after:translate-y-[0.18em] after:rounded-[3px] after:bg-foreground after:content-[''] after:animate-pulse motion-reduce:after:animate-none",
    caretLast:
      "[&>:last-child]:after:ms-0.5 [&>:last-child]:after:inline-block [&>:last-child]:after:h-[1.05em] [&>:last-child]:after:w-[0.5em] [&>:last-child]:after:translate-y-[0.18em] [&>:last-child]:after:rounded-[3px] [&>:last-child]:after:bg-foreground [&>:last-child]:after:content-[''] [&>:last-child]:after:animate-pulse motion-reduce:[&>:last-child]:after:animate-none",
    footer: 'flex items-center gap-2 text-xs text-muted-foreground',
    actions: [
      '-ms-1.5 flex items-center gap-0.5 text-muted-foreground',
      'transition-opacity duration-200 motion-reduce:transition-none',
    ],
    action: [
      'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg outline-none',
      'transition-[background-color,color,scale] duration-150 hover:bg-muted hover:text-foreground active:scale-90',
      'focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
      'disabled:pointer-events-none disabled:opacity-40',
      'aria-pressed:text-foreground [&_svg]:size-4 [&_svg]:shrink-0',
    ],
    // Copied: the check is drawn in the success colour, then the icon comes back.
    actionDone: 'text-[var(--success)] hover:text-[var(--success)]',
    tooltip: [
      'z-50 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md',
      'origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0',
      'motion-reduce:transition-none',
    ],
    branch: 'flex items-center text-xs tabular-nums text-muted-foreground',
    branchButton: [
      'inline-flex size-7 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors',
      'hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4',
    ],
    status: [
      'inline-flex w-fit items-center gap-2 text-[0.9375rem] leading-7',
      // A highlight sweeping across muted text: working, without a spinner.
      'bg-[linear-gradient(90deg,var(--muted-foreground)_0%,var(--muted-foreground)_40%,var(--foreground)_50%,var(--muted-foreground)_60%,var(--muted-foreground)_100%)] bg-[length:250%_100%] bg-clip-text text-transparent',
      'animate-[message-shimmer_2.2s_linear_infinite] motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-muted-foreground',
    ],
    // The lit sentence: a wash and a hairline under it, carried across lines.
    cite: [
      'rounded-[3px] [box-decoration-break:clone] transition-[background-color,box-shadow,color] duration-200 motion-reduce:transition-none',
      'data-lit:bg-info/12 data-lit:shadow-[inset_0_-1.5px_0_color-mix(in_oklab,var(--info)_70%,transparent)] data-lit:text-foreground',
    ],
    citation: [
      'relative -top-px mx-0.5 inline-flex h-5 max-w-40 cursor-pointer items-center gap-1 rounded-md bg-muted ps-0.5 pe-1.5 align-middle',
      'text-[0.6875rem] font-medium leading-none text-muted-foreground no-underline outline-none',
      'transition-[background-color,color] duration-150 hover:bg-foreground/10 hover:text-foreground data-popup-open:bg-foreground/10 data-popup-open:text-foreground',
      'focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
      'starting:opacity-0 starting:scale-90 transition-[opacity,scale]',
    ],
    citationMore: 'text-muted-foreground/70 tabular-nums',
    mark: [
      'inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-foreground text-[0.5625rem] font-semibold uppercase leading-none text-background',
      '[&_img]:size-full [&_img]:object-cover [&_svg]:size-2.5',
    ],
    card: [
      'z-50 w-80 origin-(--transform-origin) rounded-2xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none',
      'transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
      'data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100',
      'motion-reduce:transition-none',
    ],
    cardBody: 'flex flex-col gap-2 rounded-xl px-3 pt-2.5 pb-3',
    cardSite: 'flex items-center gap-1.5 text-xs text-muted-foreground',
    cardKind: 'ms-auto rounded-full bg-info/10 px-1.5 py-0.5 text-[0.625rem] font-medium text-info-foreground',
    cardTitle: 'text-sm font-medium leading-snug text-foreground',
    // The passage hangs off a rail, the way a quotation is set.
    cardQuote:
      'border-s-2 border-info/40 ps-2.5 text-[0.8125rem] leading-relaxed text-muted-foreground [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-foreground',
    cardFooter: 'flex h-9 items-center gap-1 rounded-xl bg-muted/60 px-1.5 text-xs text-muted-foreground',
    cardPager: 'flex items-center tabular-nums',
    cardPagerButton:
      'inline-flex size-6 cursor-pointer items-center justify-center rounded-md outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-3.5',
    cardOpen:
      'ms-auto inline-flex h-6 items-center gap-1 rounded-md px-1.5 font-medium text-foreground no-underline outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3',
    sources: 'flex flex-col',
    sourcesToggle: [
      '-ms-1 inline-flex h-8 w-fit cursor-pointer items-center gap-2 rounded-lg ps-1 pe-2 text-xs font-medium text-muted-foreground outline-none',
      'transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
    ],
    sourcesMarks: 'flex -space-x-1 [&>*]:ring-2 [&>*]:ring-background',
    sourcesChevron: 'size-3.5 transition-transform duration-200 motion-reduce:transition-none',
    sourcesFold:
      'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
    sourcesList: 'flex flex-col pt-1',
    source: [
      'group/source grid h-8 grid-cols-[1.25rem_1rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1.5 text-[0.8125rem] text-foreground no-underline outline-none',
      'transition-colors duration-100 hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60',
    ],
    sourceIndex: 'text-end text-xs tabular-nums text-muted-foreground',
    sourceTitle: 'truncate',
    sourceDomain: 'ps-3 text-xs text-muted-foreground',
    attachments: 'flex flex-wrap gap-2',
    attachment: 'flex items-center gap-2.5 overflow-hidden rounded-xl border bg-background text-xs',
    attachmentImage: 'size-20 object-cover',
    attachmentFile: 'h-14 max-w-60 py-2 pe-3.5 ps-2',
    attachmentGlyph:
      'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4',
    attachmentName: 'block truncate font-medium text-foreground',
    attachmentMeta: 'block truncate text-muted-foreground',
  },
  variants: {
    from: {
      user: {
        root: 'flex-row-reverse',
        content: 'max-w-[min(80%,36rem)] items-end',
        header: 'justify-end',
        // A squared corner on the sender's side, at the top, where the turn starts.
        bubble: 'rounded-[1.25rem] rounded-se-md bg-muted px-4 py-2.5',
        bubbleContent: 'leading-6 [&_p]:my-2',
        footer: 'flex-row-reverse',
        attachments: 'justify-end',
      },
      assistant: {
        content: 'flex-1',
      },
    },
    reveal: {
      always: {},
      // Earlier answers: out of the way until the turn is hovered or focused,
      // and always there on a touch screen, which has no hover.
      hover: {
        actions:
          'opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100 has-data-popup-open:opacity-100 pointer-coarse:opacity-100',
      },
    },
  },
  defaultVariants: { from: 'assistant', reveal: 'always' },
});

interface MessageContextValue {
  from: MessageFrom;
  streaming: boolean;
}

const MessageContext = createContext<MessageContextValue>({ from: 'assistant', streaming: false });

interface CitationContextValue {
  /** The ids of the sources being pointed at, whose sentences are lit. */
  lit: readonly string[];
  setLit: (ids: readonly string[]) => void;
}

const CitationContext = createContext<CitationContextValue>({ lit: [], setLit: () => {} });
const GroupContext = createContext<{ from: MessageFrom } | null>(null);

/* -------------------------------------------------------------------------- */
/* Message and Group                                                          */
/* -------------------------------------------------------------------------- */

export interface MessageProps extends ComponentProps<'div'> {
  /** Who wrote it. A person's turn is a bubble on the trailing side; the assistant's is prose. */
  from?: MessageFrom;
  /** Still being written: a caret follows the last word and the turn is marked busy. */
  streaming?: boolean;
}

/** One turn. Put `Message.Avatar` and `Message.Content` in it. */
function MessageRoot({ from: fromProp, streaming = false, className, ...props }: MessageProps) {
  const group = useContext(GroupContext);
  const from = fromProp ?? group?.from ?? 'assistant';
  const [lit, setLit] = useState<readonly string[]>([]);
  const citations = useMemo(() => ({ lit, setLit }), [lit]);
  return (
    <CitationContext.Provider value={citations}>
      <MessageContext.Provider value={{ from, streaming }}>
        <div
          data-slot="message"
          data-from={from}
          data-streaming={streaming ? '' : undefined}
          aria-busy={streaming || undefined}
          className={messageVariants({ from }).root({ className })}
          {...props}
        />
      </MessageContext.Provider>
    </CitationContext.Provider>
  );
}
MessageRoot.displayName = 'Message';

export interface MessageGroupProps extends ComponentProps<'div'> {
  /** Who wrote every turn in it. */
  from?: MessageFrom;
}

/**
 * Turns in a row from the same side, set closer together. Give the avatar to
 * the first and an empty `Message.Avatar` to the rest, so they line up.
 */
function MessageGroup({ from = 'assistant', className, ...props }: MessageGroupProps) {
  return (
    <GroupContext.Provider value={{ from }}>
      <div data-slot="message-group" className={messageVariants().group({ className })} {...props} />
    </GroupContext.Provider>
  );
}
MessageGroup.displayName = 'Message.Group';

export interface MessageAvatarProps extends ComponentProps<'div'> {}

/** Who it is from, beside the turn's first line. Leave it empty to keep the space. */
function MessageAvatar({ className, render, ...props }: MessageAvatarProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'message-avatar', className: messageVariants().avatar({ className }) }, props),
  });
}
MessageAvatar.displayName = 'Message.Avatar';

export interface MessageContentProps extends ComponentProps<'div'> {}

/** The column with the header, the bubble, the attachments and the actions. */
function MessageContent({ className, render, ...props }: MessageContentProps & RenderProp<'div'>) {
  const { from } = useContext(MessageContext);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'message-content', className: messageVariants({ from }).content({ className }) },
      props
    ),
  });
}
MessageContent.displayName = 'Message.Content';

export interface MessageHeaderProps extends ComponentProps<'div'> {}

/** A line above the turn: a name in `<strong>`, a time, a model. */
function MessageHeader({ className, render, ...props }: MessageHeaderProps & RenderProp<'div'>) {
  const { from } = useContext(MessageContext);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'message-header', className: messageVariants({ from }).header({ className }) },
      props
    ),
  });
}
MessageHeader.displayName = 'Message.Header';

export interface MessageBubbleProps extends ComponentProps<'div'> {}

/** The surface of a person's turn. On the assistant's it draws nothing, and the text is the page's. */
function MessageBubble({ className, render, ...props }: MessageBubbleProps & RenderProp<'div'>) {
  const { from } = useContext(MessageContext);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'message-bubble', className: messageVariants({ from }).bubble({ className }) },
      props
    ),
  });
}
MessageBubble.displayName = 'Message.Bubble';

export interface MessageBubbleContentProps extends ComponentProps<'div'> {}

/**
 * The text. Paragraphs, lists, inline code, code blocks and headings inside
 * it are set as prose, so rendered Markdown can go straight in.
 */
function MessageBubbleContent({
  className,
  children,
  render,
  ...props
}: MessageBubbleContentProps & RenderProp<'div'>) {
  const { from, streaming } = useContext(MessageContext);
  const slots = messageVariants({ from });
  // The caret follows the last word: after the text itself, or inside the last block.
  const plain = typeof children === 'string' || typeof children === 'number';
  const caret = streaming ? (plain ? slots.caret() : slots.caretLast()) : undefined;
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'message-bubble-content',
        className: slots.bubbleContent({ className: [caret, className] }),
        children: <>{children}</>,
      },
      props
    ),
  });
}
MessageBubbleContent.displayName = 'Message.BubbleContent';

export interface MessageFooterProps extends ComponentProps<'div'> {}

/** A line under the turn: sent, read, a model and how long it took. */
function MessageFooter({ className, render, ...props }: MessageFooterProps & RenderProp<'div'>) {
  const { from } = useContext(MessageContext);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'message-footer', className: messageVariants({ from }).footer({ className }) },
      props
    ),
  });
}
MessageFooter.displayName = 'Message.Footer';

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export interface MessageActionsProps extends ComponentProps<'div'> {
  /**
   * `always`, the default, for the latest answer. `hover` for earlier ones:
   * hidden until the turn is hovered or focused, and always shown on touch.
   */
  reveal?: 'always' | 'hover';
}

/** The row of actions under a turn. */
function MessageActions({ reveal, className, ...props }: MessageActionsProps) {
  return (
    <Tooltip.Provider delay={400} closeDelay={0}>
      <div
        role="toolbar"
        aria-label="Message actions"
        data-slot="message-actions"
        className={messageVariants({ reveal }).actions({ className })}
        {...props}
      />
    </Tooltip.Provider>
  );
}
MessageActions.displayName = 'Message.Actions';

export interface MessageActionProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Said by a screen reader and shown in the tooltip. Required, since the button is an icon. */
  label: string;
  /** The icon. Optional when `copy` is set, which draws its own. */
  children?: ReactNode;
  /**
   * Text to put on the clipboard when pressed. The icon turns to a check for
   * a moment, and the label to "Copied".
   */
  copy?: string | (() => string);
  /** For a toggle such as a thumbs-up: whether it is on. */
  pressed?: boolean;
}

/** An icon button with a tooltip: copy, retry, rate, share. */
function MessageAction({ label, children, copy, pressed, onClick, className, ...props }: MessageActionProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const slots = messageVariants();

  const press = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || copy === undefined) return;
    const text = typeof copy === 'function' ? copy() : copy;
    // A browser can refuse the clipboard by throwing or by rejecting; either way the check still shows.
    try {
      void navigator.clipboard?.writeText(text).catch(() => {});
    } catch {}
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  const shown = copied ? 'Copied' : label;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        aria-label={shown}
        aria-pressed={pressed}
        data-slot="message-action"
        className={slots.action({ className: [copied && slots.actionDone(), className] })}
        onClick={press}
        {...props}
      >
        {copied ? <CheckGlyph /> : (children ?? (copy !== undefined ? <CopyGlyph /> : null))}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="bottom" sideOffset={6} className="z-50">
          <Tooltip.Popup className={slots.tooltip()}>{shown}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
MessageAction.displayName = 'Message.Action';

export interface MessageBranchProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  /** How many versions of the answer there are. */
  count: number;
  /** Which one is shown, from 0. */
  index: number;
  /** Called with the index of the version asked for. */
  onIndexChange: (index: number) => void;
}

/** "‹ 2 / 3 ›": steps between the versions of an answer that was retried or edited. */
function MessageBranch({
  count,
  index,
  onIndexChange,
  className,
  render,
  ...props
}: MessageBranchProps & RenderProp<'div'>) {
  const slots = messageVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: 'group',
        'aria-label': 'Versions',
        'data-slot': 'message-branch',
        className: slots.branch({ className }),
        children: (
          <>
            <button
              type="button"
              aria-label="Previous version"
              className={slots.branchButton()}
              disabled={index <= 0}
              onClick={() => onIndexChange(index - 1)}
            >
              <ChevronGlyph flip />
            </button>
            <span aria-live="polite" className="min-w-9 text-center">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              aria-label="Next version"
              className={slots.branchButton()}
              disabled={index >= count - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              <ChevronGlyph />
            </button>
          </>
        ),
      },
      props
    ),
  });
}
MessageBranch.displayName = 'Message.Branch';

/* -------------------------------------------------------------------------- */
/* Status and attachments                                                     */
/* -------------------------------------------------------------------------- */

export interface MessageStatusProps extends ComponentProps<'div'> {}

/**
 * What the assistant is doing before its first word: "Thinking", "Reading 4
 * files". Announced as it changes. Replace it with the text once that arrives.
 */
function MessageStatus({ className, ...props }: MessageStatusProps) {
  return (
    <>
      {/* The sweep. Inline, so the component brings its own keyframes. */}
      <style href="panelui-message-shimmer" precedence="default">
        {'@keyframes message-shimmer{from{background-position:100% 0}to{background-position:-150% 0}}'}
      </style>
      <div role="status" data-slot="message-status" className={messageVariants().status({ className })} {...props} />
    </>
  );
}
MessageStatus.displayName = 'Message.Status';

export interface MessageAttachmentsProps extends ComponentProps<'div'> {}

/** The files sent with a turn, above its bubble. */
function MessageAttachments({ className, render, ...props }: MessageAttachmentsProps & RenderProp<'div'>) {
  const { from } = useContext(MessageContext);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'message-attachments', className: messageVariants({ from }).attachments({ className }) },
      props
    ),
  });
}
MessageAttachments.displayName = 'Message.Attachments';

export interface MessageAttachmentProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** The file's name. */
  name: string;
  /** A picture to show in place of the file's card. */
  src?: string;
  /** A line under the name: its type and size. */
  meta?: string;
  /** The glyph on a file's card. A page outline when left out. */
  icon?: ReactNode;
}

/** One sent file: a picture, or a card with a glyph, the name and its size. */
function MessageAttachment({
  name,
  src,
  meta,
  icon,
  className,
  render,
  ...props
}: MessageAttachmentProps & RenderProp<'div'>) {
  const slots = messageVariants();
  // Called before any branch, so a prop that changes later cannot change the hook count.
  const rendered = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'message-attachment',
        className: slots.attachment({ className: [slots.attachmentFile(), className] }),
        children: (
          <>
            <span className={slots.attachmentGlyph()}>{icon ?? <FileGlyph />}</span>
            <span className="min-w-0">
              <span className={slots.attachmentName()}>{name}</span>
              {meta ? <span className={slots.attachmentMeta()}>{meta}</span> : null}
            </span>
          </>
        ),
      },
      props
    ),
  });
  if (src) {
    return (
      <div data-slot="message-attachment" className={slots.attachment({ className })} {...props}>
        <img src={src} alt={name} className={slots.attachmentImage()} />
      </div>
    );
  }
  return rendered;
}
MessageAttachment.displayName = 'Message.Attachment';

/* -------------------------------------------------------------------------- */
/* Glyphs                                                                     */
/* -------------------------------------------------------------------------- */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function CopyGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <rect x="8" y="8" width="13" height="13" rx="3" />
      <path d="M16 8V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h2" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function ChevronGlyph({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...STROKE}
      className={flip ? '-scale-x-100 rtl:scale-x-100' : 'rtl:-scale-x-100'}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Citations                                                                  */
/* -------------------------------------------------------------------------- */

export interface MessageSourceItem {
  /** Matches the source to the sentences that cite it. */
  id: string;
  /** The page or document's title. */
  title: string;
  /** Where it is. The citation and the list link to it. */
  url?: string;
  /** The site's name as shown: "nature.com". Default the host of `url`. */
  domain?: string;
  /** The site's mark, as an `<img>` or a glyph. Default the domain's first letter. */
  icon?: ReactNode;
  /**
   * The passage the sentence was taken from. Wrap the words that match it in
   * `<mark>` and they are set in the text's colour, the rest muted.
   */
  quote?: ReactNode;
  /** A word for what the passage is, at the card's top corner: "Exact quote", "Summary". */
  kind?: ReactNode;
}

function domainOf(source: MessageSourceItem) {
  if (source.domain) return source.domain;
  if (!source.url) return '';
  try {
    return new URL(source.url).host.replace(/^www\./, '');
  } catch {
    return source.url;
  }
}

/** The site's mark, or its first letter in a small tile. */
function SourceMark({ source }: { source: MessageSourceItem }) {
  const slots = messageVariants();
  return (
    <span className={slots.mark()} aria-hidden="true">
      {source.icon ?? domainOf(source).charAt(0)}
    </span>
  );
}

export interface MessageCiteProps extends ComponentProps<'span'> {
  /** The id, or ids, of the sources this sentence comes from. */
  source: string | readonly string[];
}

/**
 * A sentence taken from a source. It is lit while that source's citation or
 * its row in `Message.Sources` is pointed at or focused.
 */
function MessageCite({ source, className, ...props }: MessageCiteProps) {
  const { lit } = useContext(CitationContext);
  const ids = typeof source === 'string' ? [source] : source;
  const on = ids.some((id) => lit.includes(id));
  return (
    <span
      data-slot="message-cite"
      data-lit={on ? '' : undefined}
      className={messageVariants().cite({ className })}
      {...props}
    />
  );
}
MessageCite.displayName = 'Message.Cite';

export interface MessageCitationProps extends Omit<ComponentProps<'a'>, 'children'> {
  /** The sources for the sentence before it. The chip names the first; the card pages through all of them. */
  sources: readonly MessageSourceItem[];
  /** How long the pointer rests on the chip before the card opens, in ms. Default `350`. */
  delay?: number;
}

/**
 * A chip after a sentence naming where it came from. Pointing at it lights
 * the sentence and opens a card with the passage; with several sources the
 * card pages through them.
 */
function MessageCitation({ sources, delay = 350, className, ...props }: MessageCitationProps) {
  const slots = messageVariants();
  const { setLit } = useContext(CitationContext);
  const [page, setPage] = useState(0);
  const first = sources[0];
  const current = sources[Math.min(page, sources.length - 1)];
  const ids = useMemo(() => sources.map((source) => source.id), [sources]);
  if (!first || !current) return null;

  const show = (open: boolean) => {
    setLit(open ? ids : []);
    if (!open) setPage(0);
  };

  return (
    <PreviewCard.Root onOpenChange={show}>
      <PreviewCard.Trigger
        delay={delay}
        closeDelay={150}
        href={first.url}
        target={first.url ? '_blank' : undefined}
        rel={first.url ? 'noreferrer' : undefined}
        data-slot="message-citation"
        className={slots.citation({ className })}
        onFocus={() => setLit(ids)}
        onBlur={() => setLit([])}
        aria-label={`Source: ${sources.map((source) => source.title).join('; ')}`}
        {...props}
      >
        <SourceMark source={first} />
        <span className="truncate">{domainOf(first)}</span>
        {sources.length > 1 ? <span className={slots.citationMore()}>+{sources.length - 1}</span> : null}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
          <PreviewCard.Popup data-slot="message-citation-card" className={slots.card()}>
            <div className={slots.cardBody()}>
              <div className={slots.cardSite()}>
                <SourceMark source={current} />
                <span className="truncate">{domainOf(current)}</span>
                {current.kind != null ? <span className={slots.cardKind()}>{current.kind}</span> : null}
              </div>
              <div className={slots.cardTitle()}>{current.title}</div>
              {current.quote != null ? <blockquote className={slots.cardQuote()}>{current.quote}</blockquote> : null}
            </div>
            {sources.length > 1 || current.url ? (
              <div className={slots.cardFooter()}>
                {sources.length > 1 ? (
                  <div className={slots.cardPager()}>
                    <button
                      type="button"
                      aria-label="Previous source"
                      disabled={page === 0}
                      onClick={() => setPage((value) => Math.max(0, value - 1))}
                      className={slots.cardPagerButton()}
                    >
                      <ChevronGlyph flip />
                    </button>
                    <span aria-live="polite" className="min-w-8 text-center">
                      {page + 1}/{sources.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Next source"
                      disabled={page === sources.length - 1}
                      onClick={() => setPage((value) => Math.min(sources.length - 1, value + 1))}
                      className={slots.cardPagerButton()}
                    >
                      <ChevronGlyph />
                    </button>
                  </div>
                ) : null}
                {current.url ? (
                  <a href={current.url} target="_blank" rel="noreferrer" className={slots.cardOpen()}>
                    Open source
                    <svg viewBox="0 0 24 24" aria-hidden="true" {...STROKE}>
                      <path d="M7 17 17 7M8 7h9v9" />
                    </svg>
                  </a>
                ) : null}
              </div>
            ) : null}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
MessageCitation.displayName = 'Message.Citation';

export interface MessageSourcesProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Every source the answer cites, once each, in the order they are numbered. */
  sources: readonly MessageSourceItem[];
  /** Whether the list is open, when the caller holds it. */
  open?: boolean;
  /** Whether it starts open, when the caller does not hold it. Default `false`. */
  defaultOpen?: boolean;
  /** Called when the toggle is pressed. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * The answer's sources, as a row of marks and a count that opens into a
 * numbered list. Pointing at a row lights every sentence it backs.
 */
function MessageSources({
  sources,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  ...props
}: MessageSourcesProps) {
  const slots = messageVariants();
  const { setLit } = useContext(CitationContext);
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const listId = useId();
  if (sources.length === 0) return null;
  const toggle = () => {
    if (open === undefined) setInner(!isOpen);
    onOpenChange?.(!isOpen);
  };
  return (
    <div data-slot="message-sources" className={slots.sources({ className })} {...props}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={toggle}
        className={slots.sourcesToggle()}
      >
        <span className={slots.sourcesMarks()}>
          {sources.slice(0, 3).map((source) => (
            <SourceMark key={source.id} source={source} />
          ))}
        </span>
        {sources.length === 1 ? '1 source' : `${sources.length} sources`}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          {...STROKE}
          className={slots.sourcesChevron({ className: isOpen ? 'rotate-180' : undefined })}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id={listId}
        className={slots.sourcesFold({ className: isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] opacity-0' })}
      >
        <div className="min-h-0 overflow-hidden" inert={!isOpen}>
          <ol className={slots.sourcesList()} onMouseLeave={() => setLit([])}>
            {sources.map((source, index) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target={source.url ? '_blank' : undefined}
                  rel={source.url ? 'noreferrer' : undefined}
                  className={slots.source()}
                  onMouseEnter={() => setLit([source.id])}
                  onFocus={() => setLit([source.id])}
                  onBlur={() => setLit([])}
                >
                  <span className={slots.sourceIndex()}>{index + 1}</span>
                  <SourceMark source={source} />
                  <span className={slots.sourceTitle()}>{source.title}</span>
                  <span className={slots.sourceDomain()}>{domainOf(source)}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
MessageSources.displayName = 'Message.Sources';

export const Message = Object.assign(MessageRoot, {
  Group: MessageGroup,
  Avatar: MessageAvatar,
  Content: MessageContent,
  Header: MessageHeader,
  Bubble: MessageBubble,
  BubbleContent: MessageBubbleContent,
  Footer: MessageFooter,
  Actions: MessageActions,
  Action: MessageAction,
  Branch: MessageBranch,
  Status: MessageStatus,
  Attachments: MessageAttachments,
  Attachment: MessageAttachment,
  Cite: MessageCite,
  Citation: MessageCitation,
  Sources: MessageSources,
});

export {
  MessageGroup,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageBubble,
  MessageBubbleContent,
  MessageFooter,
  MessageActions,
  MessageAction,
  MessageBranch,
  MessageStatus,
  MessageAttachments,
  MessageAttachment,
  MessageCite,
  MessageCitation,
  MessageSources,
};
