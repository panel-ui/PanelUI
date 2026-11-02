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
 */
import { Tooltip } from '@base-ui/react/tooltip';
import {
  createContext,
  useContext,
  useEffect,
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
  return (
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
  if (src) {
    return (
      <div data-slot="message-attachment" className={slots.attachment({ className })} {...props}>
        <img src={src} alt={name} className={slots.attachmentImage()} />
      </div>
    );
  }
  return useRender({
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
};
