/**
 * Support — the screen a person arrives on when they need help.
 *
 * It is the front of a support section, not the conversation itself. What a
 * reader needs here is four answers, in this order: is anyone there, how do I
 * reach them, what is this about, and what happened to the thing I already
 * asked. Each is a part, because an app that has no help centre should not
 * have to pass `articles={null}` to say so.
 *
 * The transcript is deliberately somewhere else. A support thread is a chat
 * transcript with a name on it, and this library already has the pieces —
 * compose `MessageScroller`, `Message` and `AIInput` behind whichever channel
 * the reader picks, rather than growing a second set of bubbles in here that
 * would drift away from the first.
 *
 * `availability` is the one thing the root decides, and everything downstream
 * reads it from context: the dot beside the status line, the wording it falls
 * back to, and whether a channel that needs someone at the other end presents
 * itself as open.
 *
 * ```tsx
 * <Support availability="online">
 *   <Support.Header title="Support" />
 *   <Support.Status replyTime="Typically replies in under an hour" />
 *   <Support.Channels>
 *     <Support.Channel icon={<MessageCircleIcon />} label="Message us" />
 *   </Support.Channels>
 * </Support>
 * ```
 */
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';

/** Whether anyone is at the other end. */
export type SupportAvailability = 'online' | 'away' | 'offline';

/**
 * Where a request has got to, in the words the person who made it sees.
 *
 * Shorter than the set a support desk runs internally, and deliberately: the
 * states a helpdesk distinguishes for its own routing are not distinctions the
 * person waiting can act on, and offering them invites a question about the
 * difference that nobody wants to answer.
 */
export type SupportConversationStatus = 'open' | 'pending' | 'solved' | 'closed';

const supportVariants = tv({
  slots: {
    root: 'w-full gap-5',
    header: 'w-full flex-row items-center justify-between gap-3',
    headerText: 'shrink gap-0.5',
    status: 'w-full flex-row items-center gap-2 rounded-xl bg-muted px-3 py-2.5',
    statusDot: 'size-2 rounded-full',
    group: 'w-full gap-2',
    groupTitle: 'text-xs font-medium text-muted-foreground',
    channel:
      'w-full flex-row items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3',
    channelIcon: 'size-9 items-center justify-center rounded-lg bg-muted',
    channelText: 'shrink grow gap-0.5',
    topic: 'w-full flex-row items-center gap-3 rounded-xl border px-3.5 py-3',
    topicText: 'shrink grow gap-0.5',
    conversation:
      'w-full flex-row items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3',
    article: 'w-full flex-row items-center gap-3 rounded-xl bg-muted px-3.5 py-3',
    badge: 'rounded-full px-2 py-0.5',
  },
  variants: {
    availability: {
      online: { statusDot: 'bg-success' },
      away: { statusDot: 'bg-warning' },
      offline: { statusDot: 'bg-muted-foreground' },
    },
    selected: {
      true: { topic: 'border-primary bg-primary/10' },
      false: { topic: 'border-border bg-card' },
    },
    disabled: {
      true: { channel: 'opacity-50', topic: 'opacity-50' },
    },
  },
  defaultVariants: {
    availability: 'online',
    selected: false,
  },
});

/** What a status badge says and how it is coloured, per state. */
const STATUS_STYLE: Record<
  SupportConversationStatus,
  { label: string; className: string; textClassName: string }
> = {
  open: { label: 'Open', className: 'bg-info/15', textClassName: 'text-info' },
  pending: { label: 'Waiting on you', className: 'bg-warning/15', textClassName: 'text-warning' },
  solved: { label: 'Solved', className: 'bg-success/15', textClassName: 'text-success' },
  closed: { label: 'Closed', className: 'bg-muted', textClassName: 'text-muted-foreground' },
};

interface SupportContextValue {
  availability: SupportAvailability;
}

const SupportContext = createContext<SupportContextValue>({ availability: 'online' });

/** The availability set by the nearest Support. */
export function useSupport(): SupportContextValue {
  return useContext(SupportContext);
}

interface TopicsContextValue {
  value: string | null;
  select: (value: string) => void;
}

const TopicsContext = createContext<TopicsContextValue | null>(null);

export interface SupportProps extends ViewProps {
  className?: string;
  /**
   * Whether anyone is at the other end. Read by every part below rather than
   * passed to each — a screen that is half "we're here" and half "we're not"
   * is worse than either.
   */
  availability?: SupportAvailability;
  children?: ReactNode;
}

const SupportRoot = forwardRef<View, SupportProps>(function SupportRoot(
  { className, availability = 'online', children, ...props },
  ref
) {
  const { root } = supportVariants();
  const context = useMemo(() => ({ availability }), [availability]);

  return (
    <SupportContext.Provider value={context}>
      <View ref={ref} className={root({ className })} {...props}>
        {textChildren(children)}
      </View>
    </SupportContext.Provider>
  );
});
SupportRoot.displayName = 'Support';

export interface SupportHeaderProps extends ViewProps {
  className?: string;
  /** The screen's own name. */
  title?: string;
  /** One line under it — who answers, or what this section covers. */
  description?: string;
  /** Trailing slot: the faces of the people who answer, or a close button. */
  children?: ReactNode;
}

/** The screen's title, and room beside it for whoever is answering. */
const SupportHeader = forwardRef<View, SupportHeaderProps>(function SupportHeader(
  { className, title, description, children, ...props },
  ref
) {
  const { header, headerText } = supportVariants();

  return (
    <View ref={ref} className={header({ className })} {...props}>
      <View className={headerText()}>
        {title ? (
          <Text size="xl" weight="bold" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text size="sm" muted numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {children ? <View className="shrink-0">{textChildren(children)}</View> : null}
    </View>
  );
});
SupportHeader.displayName = 'Support.Header';

export interface SupportStatusProps extends ViewProps {
  className?: string;
  /** Overrides the availability the root published. */
  availability?: SupportAvailability;
  /**
   * How long a reply takes, in your own words — "Typically replies in under an
   * hour", "Back on Monday". Left unset, the availability alone is stated.
   *
   * A string rather than a number of minutes, because the honest version of
   * this is a median somebody measured and the rounding is a judgement about
   * tone: "a few minutes" and "4 minutes" promise different things.
   */
  replyTime?: string;
  children?: ReactNode;
}

/** Whether anyone is there, and how long an answer takes. */
const SupportStatus = forwardRef<View, SupportStatusProps>(function SupportStatus(
  { className, availability: availabilityProp, replyTime, children, ...props },
  ref
) {
  const { availability: inherited } = useSupport();
  const availability = availabilityProp ?? inherited;
  const { status, statusDot } = supportVariants({ availability });

  const fallback =
    availability === 'online'
      ? 'Someone is here now'
      : availability === 'away'
        ? 'Away at the moment'
        : 'Nobody is here right now';

  return (
    <View ref={ref} className={status({ className })} {...props}>
      <View className={statusDot()} />
      {children ? (
        textChildren(children)
      ) : (
        <Text size="sm" numberOfLines={2} className="shrink">
          {replyTime ?? fallback}
        </Text>
      )}
    </View>
  );
});
SupportStatus.displayName = 'Support.Status';

export interface SupportGroupProps extends ViewProps {
  className?: string;
  /** Small heading above the rows. */
  title?: string;
  children?: ReactNode;
}

/** A titled run of rows. Shared by Channels, Conversations and Articles. */
function group(name: string) {
  const Group = forwardRef<View, SupportGroupProps>(function Group(
    { className, title, children, ...props },
    ref
  ) {
    const { group: groupClass, groupTitle } = supportVariants();
    return (
      <View ref={ref} className={groupClass({ className })} {...props}>
        {title ? <Text className={groupTitle()}>{title}</Text> : null}
        {textChildren(children)}
      </View>
    );
  });
  Group.displayName = name;
  return Group;
}

const SupportChannels = group('Support.Channels');
const SupportConversations = group('Support.Conversations');
const SupportArticles = group('Support.Articles');

export interface SupportChannelProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The glyph on the left. Tinted to match the row. */
  icon?: ReactNode;
  /** What the channel is called — the thing pressed, so write it as an action. */
  label: string;
  /** One line under it: what it is for, or the address behind it. */
  description?: string;
  /** Trailing note — a wait time, an opening hour. */
  detail?: string;
  disabled?: boolean;
  onPress?: () => void;
}

/**
 * One way of reaching somebody.
 *
 * A row rather than a tile. Each channel is a sentence — what it is, and what
 * it costs you in waiting — and a grid of icons with one word under each puts
 * the reader in front of a quiz about which one is right.
 */
const SupportChannel = forwardRef<View, SupportChannelProps>(function SupportChannel(
  { className, icon, label, description, detail, disabled = false, onPress, ...props },
  ref
) {
  const { channel, channelIcon, channelText } = supportVariants({ disabled });

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      accessibilityHint={description}
      disabled={disabled || !onPress}
      onPress={onPress}
      className={channel({ className })}
      {...props}
    >
      {icon ? (
        <View className={channelIcon()}>{icon}</View>
      ) : null}
      <View className={channelText()}>
        <Text size="sm" weight="medium" numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text size="xs" muted numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {detail ? (
        <Text size="xs" muted numberOfLines={1} className="shrink-0">
          {detail}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
});
SupportChannel.displayName = 'Support.Channel';

export interface SupportTopicsProps extends ViewProps {
  className?: string;
  /** Small heading above the list. */
  title?: string;
  /** The selected topic. Leave unset to let the group track it. */
  value?: string | null;
  /** The topic selected before anybody pressed anything. */
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

/**
 * What the problem is about, as a list of one-line choices.
 *
 * Optional, and meant to stay that way — plenty of support screens are better
 * without one, and the ones that need it are the ones routing to different
 * teams. Single-select: a request goes to one queue.
 */
const SupportTopics = forwardRef<View, SupportTopicsProps>(function SupportTopics(
  { className, title, value: valueProp, defaultValue = null, onValueChange, children, ...props },
  ref
) {
  const { group: groupClass, groupTitle } = supportVariants();
  const [internal, setInternal] = useState<string | null>(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : internal;

  const context = useMemo<TopicsContextValue>(
    () => ({
      value: value ?? null,
      select: (next: string) => {
        if (!controlled) setInternal(next);
        onValueChange?.(next);
      },
    }),
    [value, controlled, onValueChange]
  );

  return (
    <TopicsContext.Provider value={context}>
      <View
        ref={ref}
        accessibilityRole="radiogroup"
        className={groupClass({ className })}
        {...props}
      >
        {title ? <Text className={groupTitle()}>{title}</Text> : null}
        {textChildren(children)}
      </View>
    </TopicsContext.Provider>
  );
});
SupportTopics.displayName = 'Support.Topics';

export interface SupportTopicProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** What this topic is worth to the group's `value`. */
  value: string;
  icon?: ReactNode;
  label: string;
  /** One line of what belongs under it, for the ones whose name is not enough. */
  description?: string;
  disabled?: boolean;
  onPress?: () => void;
}

/** One thing the problem could be about. */
const SupportTopic = forwardRef<View, SupportTopicProps>(function SupportTopic(
  { className, value, icon, label, description, disabled = false, onPress, ...props },
  ref
) {
  const group = useContext(TopicsContext);
  const selected = group?.value === value;
  const { topic, topicText, channelIcon } = supportVariants({ selected, disabled });

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={() => {
        group?.select(value);
        onPress?.();
      }}
      className={topic({ className })}
      {...props}
    >
      {icon ? <View className={channelIcon()}>{icon}</View> : null}
      <View className={topicText()}>
        <Text size="sm" weight="medium" numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text size="xs" muted numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
});
SupportTopic.displayName = 'Support.Topic';

export interface SupportConversationProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** What it was about. */
  title: string;
  /** The last thing said in it. */
  preview?: string;
  /** Where it has got to. */
  status?: SupportConversationStatus;
  /** When it last moved, in your own words — "2h", "Yesterday". */
  timestamp?: string;
  /**
   * There is a reply here the reader has not seen.
   *
   * Separate from `updated`, because they are different facts: a thread can
   * move without anything being addressed to you, and a dot that means both
   * means neither.
   */
  unread?: boolean;
  /** The thread moved since it was last opened, with nothing new to read. */
  updated?: boolean;
  /** Reference for the request, shown beside the status. */
  reference?: string;
  onPress?: () => void;
}

/** One request the reader already made, and what has happened to it. */
const SupportConversation = forwardRef<View, SupportConversationProps>(
  function SupportConversation(
    {
      className,
      title,
      preview,
      status = 'open',
      timestamp,
      unread = false,
      updated = false,
      reference,
      onPress,
      ...props
    },
    ref
  ) {
    const { conversation, badge } = supportVariants();
    const tone = STATUS_STYLE[status];

    return (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={[
          title,
          tone.label,
          unread ? 'unread' : updated ? 'updated' : null,
          timestamp,
        ]
          .filter(Boolean)
          .join(', ')}
        disabled={!onPress}
        onPress={onPress}
        className={conversation({ className })}
        {...props}
      >
        {/*
          * The dot is at the top rather than centred, so it stays level with
          * the subject on a row whose preview runs to two lines.
          */}
        {unread || updated ? (
          <View
            className={cn(
              'mt-1.5 size-2 shrink-0 rounded-full',
              unread ? 'bg-primary' : 'bg-muted-foreground'
            )}
          />
        ) : null}
        <View className="shrink grow gap-1">
          <View className="flex-row items-baseline gap-2">
            <Text size="sm" weight={unread ? 'semibold' : 'medium'} numberOfLines={1} className="shrink grow">
              {title}
            </Text>
            {timestamp ? (
              <Text size="xs" muted numberOfLines={1} className="shrink-0">
                {timestamp}
              </Text>
            ) : null}
          </View>
          {preview ? (
            <Text size="xs" muted numberOfLines={2}>
              {preview}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2 pt-0.5">
            <View className={badge({ className: tone.className })}>
              <Text size="xs" weight="medium" className={tone.textClassName}>
                {tone.label}
              </Text>
            </View>
            {reference ? (
              <Text size="xs" muted numberOfLines={1}>
                {reference}
              </Text>
            ) : null}
          </View>
        </View>
      </AnimatedPressable>
    );
  }
);
SupportConversation.displayName = 'Support.Conversation';

export interface SupportArticleProps extends Omit<ViewProps, 'children'> {
  className?: string;
  icon?: ReactNode;
  /** The article's own title. */
  title: string;
  /** Which part of the help centre it came from. */
  collection?: string;
  onPress?: () => void;
}

/** A page from the help centre, for the questions that have a written answer. */
const SupportArticle = forwardRef<View, SupportArticleProps>(function SupportArticle(
  { className, icon, title, collection, onPress, ...props },
  ref
) {
  const { article, channelText } = supportVariants();

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="link"
      accessibilityLabel={collection ? `${title}, in ${collection}` : title}
      disabled={!onPress}
      onPress={onPress}
      className={article({ className })}
      {...props}
    >
      {icon ? <View className="shrink-0">{icon}</View> : null}
      <View className={channelText()}>
        <Text size="sm" numberOfLines={2}>
          {title}
        </Text>
        {collection ? (
          <Text size="xs" muted numberOfLines={1}>
            {collection}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
});
SupportArticle.displayName = 'Support.Article';

export const Support = Object.assign(SupportRoot, {
  Header: SupportHeader,
  Status: SupportStatus,
  Channels: SupportChannels,
  Channel: SupportChannel,
  Topics: SupportTopics,
  Topic: SupportTopic,
  Conversations: SupportConversations,
  Conversation: SupportConversation,
  Articles: SupportArticles,
  Article: SupportArticle,
});

export type SupportVariants = VariantProps<typeof supportVariants>;
