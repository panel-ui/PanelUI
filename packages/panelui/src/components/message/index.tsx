/**
 * Message — a chat turn: avatar, bubble, and the metadata around it.
 *
 * The pieces are separate because conversations differ in which ones they
 * need. A support thread wants a sender name and a read receipt; an assistant
 * transcript wants neither, but does want the bubble to carry tool output and
 * actions. Composing them beats a component with a dozen optional props.
 *
 * `align` is the only thing the root decides, and everything downstream reads
 * it from context: which side the row sits on, which way the avatar goes,
 * which corner of the bubble is squared off, and which colour it takes.
 *
 * ```tsx
 * <Message align="end">
 *   <Message.Content>
 *     <Message.Bubble>
 *       <Message.BubbleContent>How can I help?</Message.BubbleContent>
 *     </Message.Bubble>
 *   </Message.Content>
 * </Message>
 * ```
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type ReactNode,
} from 'react';
import { View, type GestureResponderEvent, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

const messageVariants = tv({
  slots: {
    root: 'w-full flex-row items-end gap-2',
    avatar: 'shrink-0',
    content: 'max-w-[85%] gap-1',
    header: 'text-xs font-medium text-muted-foreground',
    bubble: 'rounded-2xl px-3.5 py-2.5',
    bubbleContent: 'text-base',
    footer: 'text-xs text-muted-foreground',
    group: 'w-full gap-1',
  },
  variants: {
    align: {
      start: {
        root: 'flex-row justify-start',
        content: 'items-start',
        // A squared corner on the side the message comes from points the
        // bubble back at its sender.
        bubble: 'rounded-bl-md bg-muted',
        bubbleContent: 'text-foreground',
        header: 'text-left',
        footer: 'text-left',
      },
      end: {
        root: 'flex-row-reverse justify-start',
        content: 'items-end',
        bubble: 'rounded-br-md bg-primary',
        bubbleContent: 'text-primary-foreground',
        header: 'text-right',
        footer: 'text-right',
      },
    },
  },
  defaultVariants: {
    align: 'start',
  },
});

type Align = 'start' | 'end';

interface MessageContextValue {
  align: Align;
  /** True when the message is not the first in its group. */
  stacked: boolean;
}

const MessageContext = createContext<MessageContextValue>({
  align: 'start',
  stacked: false,
});

/** Reads the alignment set by the nearest Message. */
function useMessageContext() {
  return useContext(MessageContext);
}

const GroupContext = createContext<{ align: Align } | null>(null);

export interface MessageProps
  extends ViewProps,
    VariantProps<typeof messageVariants> {
  className?: string;
  /**
   * Which side of the conversation this turn belongs to. `end` is the
   * outgoing side — the person holding the device.
   */
  align?: Align;
  /**
   * Continuation of the message above it: tighter spacing, and the avatar slot
   * is reserved but left empty so bubbles stay aligned. `Message.Group` sets
   * this for you.
   */
  stacked?: boolean;
  /**
   * Fires on a long press anywhere on the turn — the gesture a chat uses to
   * surface per-message actions (copy, reply, react). Open a menu from it; the
   * component only exposes the press. When set, the whole row gains press
   * feedback. A plain tap should still do nothing, so there is no `onPress`.
   */
  onLongPress?: (event: GestureResponderEvent) => void;
  children?: ReactNode;
}

const MessageRoot = forwardRef<View, MessageProps>(
  ({ className, align, stacked = false, onLongPress, children, ...props }, ref) => {
    const group = useContext(GroupContext);
    const resolvedAlign = align ?? group?.align ?? 'start';
    const { root } = messageVariants({ align: resolvedAlign });

    const body = onLongPress ? (
      // A long-press target, not a button — a tap does nothing, so no role is
      // announced. The feedback matches every other pressable in the library.
      <AnimatedPressable
        ref={ref}
        onLongPress={onLongPress}
        delayLongPress={300}
        className={root({ className })}
        {...props}
      >
        {children}
      </AnimatedPressable>
    ) : (
      <View ref={ref} className={root({ className })} {...props}>
        {children}
      </View>
    );

    return (
      <MessageContext.Provider value={{ align: resolvedAlign, stacked }}>
        {body}
      </MessageContext.Provider>
    );
  }
);
MessageRoot.displayName = 'Message';

export interface MessageGroupProps extends ViewProps {
  className?: string;
  /** Alignment applied to every Message inside that does not set its own. */
  align?: Align;
  children?: ReactNode;
}

/**
 * Consecutive turns from one sender. Tightens the spacing between them and
 * marks every message after the first as `stacked`, so only the first shows an
 * avatar and the rest stay aligned with it.
 */
const MessageGroup = forwardRef<View, MessageGroupProps>(
  ({ className, align = 'start', children, ...props }, ref) => {
    const { group } = messageVariants({ align });

    // Every turn after the first is a continuation, so it drops its avatar and
    // sits tight against the one above. A child that sets `stacked` itself
    // wins — grouping is a default, not a rule.
    const stackedChildren = Children.map(children, (child, index) =>
      isValidElement<MessageProps>(child) && child.props.stacked === undefined
        ? cloneElement(child, { stacked: index > 0 })
        : child
    );

    return (
      <GroupContext.Provider value={{ align }}>
        <View ref={ref} className={group({ className })} {...props}>
          {stackedChildren}
        </View>
      </GroupContext.Provider>
    );
  }
);
MessageGroup.displayName = 'Message.Group';

export interface MessageAvatarProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Slot for the sender's avatar. On a stacked message the slot is rendered but
 * left empty, which keeps the bubbles in a column instead of letting the
 * second one slide under the first one's avatar.
 */
const MessageAvatar = forwardRef<View, MessageAvatarProps>(
  ({ className, children, ...props }, ref) => {
    const { stacked } = useMessageContext();
    const { avatar } = messageVariants();

    return (
      <View ref={ref} className={avatar({ className })} {...props}>
        {stacked ? <View className="opacity-0">{children}</View> : children}
      </View>
    );
  }
);
MessageAvatar.displayName = 'Message.Avatar';

export interface MessageContentProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Column holding the header, bubble and footer. */
const MessageContent = forwardRef<View, MessageContentProps>(
  ({ className, children, ...props }, ref) => {
    const { align } = useMessageContext();
    const { content } = messageVariants({ align });

    return (
      <View ref={ref} className={content({ className })} {...props}>
        {children}
      </View>
    );
  }
);
MessageContent.displayName = 'Message.Content';

export interface MessageHeaderProps extends TextProps {
  className?: string;
}

/** Sender name or timestamp above the bubble. */
const MessageHeader = forwardRef<React.ElementRef<typeof Text>, MessageHeaderProps>(
  ({ className, ...props }, ref) => {
    const { align } = useMessageContext();
    const { header } = messageVariants({ align });

    return <Text ref={ref} size="xs" className={header({ className })} {...props} />;
  }
);
MessageHeader.displayName = 'Message.Header';

export interface MessageBubbleProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The speech bubble. Takes its colour and squared corner from `align`. */
const MessageBubble = forwardRef<View, MessageBubbleProps>(
  ({ className, children, ...props }, ref) => {
    const { align } = useMessageContext();
    const { bubble } = messageVariants({ align });

    return (
      <View ref={ref} className={bubble({ className })} {...props}>
        {children}
      </View>
    );
  }
);
MessageBubble.displayName = 'Message.Bubble';

export interface MessageBubbleContentProps extends TextProps {
  className?: string;
}

/** Text inside the bubble, in whichever colour reads against it. */
const MessageBubbleContent = forwardRef<
  React.ElementRef<typeof Text>,
  MessageBubbleContentProps
>(({ className, ...props }, ref) => {
  const { align } = useMessageContext();
  const { bubbleContent } = messageVariants({ align });

  return <Text ref={ref} className={bubbleContent({ className })} {...props} />;
});
MessageBubbleContent.displayName = 'Message.BubbleContent';

export interface MessageFooterProps extends TextProps {
  className?: string;
}

/** Delivery state, timestamp or actions below the bubble. */
const MessageFooter = forwardRef<React.ElementRef<typeof Text>, MessageFooterProps>(
  ({ className, ...props }, ref) => {
    const { align } = useMessageContext();
    const { footer } = messageVariants({ align });

    return <Text ref={ref} size="xs" className={footer({ className })} {...props} />;
  }
);
MessageFooter.displayName = 'Message.Footer';

export interface MessageActionsProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Row of controls under the bubble — copy, retry, feedback. */
const MessageActions = forwardRef<View, MessageActionsProps>(
  ({ className, children, ...props }, ref) => {
    const { align } = useMessageContext();

    return (
      <View
        ref={ref}
        className={cn(
          'flex-row items-center gap-1',
          align === 'end' && 'flex-row-reverse',
          className
        )}
        {...props}
      >
        {children}
      </View>
    );
  }
);
MessageActions.displayName = 'Message.Actions';

export const Message = Object.assign(MessageRoot, {
  Group: MessageGroup,
  Avatar: MessageAvatar,
  Content: MessageContent,
  Header: MessageHeader,
  Bubble: MessageBubble,
  BubbleContent: MessageBubbleContent,
  Footer: MessageFooter,
  Actions: MessageActions,
});
