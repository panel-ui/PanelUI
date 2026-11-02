/**
 * Post — a card carrying something somebody said, and what everyone did about it.
 *
 * Four shapes, because a feed is not one thing. `feed` is the full card: author,
 * body, media and a row of counts. `vote` puts a score pill beside a headline
 * and a thumbnail, the way a ranked community reads. `compact` drops the media
 * and puts the name and handle on one line, for a dense timeline. `media` gives
 * the image the whole card and lays the author over it.
 *
 * What they share is the anatomy — the same `Post.Header`, `Post.Body`,
 * `Post.Footer` in every one — so moving between them is a prop rather than a
 * rewrite. The variant decides padding, media shape and where the author sits;
 * it does not decide which parts exist.
 *
 * ```tsx
 * <Post variant="feed">
 *   <Post.Header>
 *     <Post.Author name="Dwayne F. White" verified timestamp="3m ago" avatar={face} />
 *     <Post.Action><EllipsisIcon /></Post.Action>
 *   </Post.Header>
 *   <Post.Body>I've been paying off my credit card #FinancialFreedom</Post.Body>
 *   <Post.Media source={photo} />
 *   <Post.Footer>
 *     <Post.Stat icon={EyeIcon} value="5,874" />
 *     <Post.Stat icon={HeartIcon} value="215" tone="like" />
 *     <Post.Stat icon={MessageCircleIcon} value="11" />
 *     <Post.Stat icon={BookmarkIcon} value="Save" align="end" />
 *   </Post.Footer>
 * </Post>
 * ```
 *
 * ## Counts change under the finger
 *
 * Every control here is a toggle over a number, and the number is the point: a
 * like that lights up but leaves `215` sitting there has not told you it
 * counted. So a stat that changes animates the old value out and the new one in
 * along the direction of the change, and `Post.Votes` does the same with its
 * arrows. The alternative — repainting the digits in place — is indisting-
 * uishable from a re-render, which is exactly the doubt the animation exists to
 * remove.
 */
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  Image,
  Pressable,
  View,
  type ImageSourcePropType,
  type PressableProps,
  type ViewProps,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BadgeCheckIcon,
  type IconProps,
} from '../../icons';
import { usePrevious } from '../../hooks/use-previous';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import { Avatar } from '../avatar';
import type { ViewRef } from '../../primitives/refs';

/** Long enough to see the value move, short enough to keep up with a fast tap. */
const COUNT_DURATION = 160;

/** The pop on a toggle: past 1 and back, so the press has a shape. */
const POP = { mass: 0.4, damping: 12, stiffness: 320 } as const;

const postVariants = tv({
  slots: {
    root: 'w-full overflow-hidden rounded-2xl border border-border bg-card',
    header: 'flex-row items-start gap-3',
    author: 'min-w-0 flex-1 gap-0.5',
    authorLine: 'flex-row items-center gap-1.5',
    name: 'font-semibold text-card-foreground',
    handle: 'text-muted-foreground',
    meta: 'text-sm text-muted-foreground',
    // As tall as the name's own line box, so at `items-start` the menu lands on
    // the username's line rather than somewhere between the two lines of the
    // author block — and lands there identically in all four variants.
    action: 'h-6 shrink-0 items-center justify-center',
    // `flex-1` for the same reason `Post.Author` has it: it is the header's
    // flexible side, and without it the row is only as wide as the group's
    // name — so `Post.Action` sits against the name instead of at the edge.
    community: 'min-w-0 h-6 flex-1 flex-row items-center gap-2',
    communityName: 'text-xs font-semibold text-card-foreground',
    communityMeta: 'text-xs text-muted-foreground',
    title: 'text-base font-semibold leading-snug text-card-foreground',
    body: 'text-card-foreground',
    media: 'overflow-hidden bg-muted',
    footer: 'flex-row items-center',
    stat: 'flex-row items-center gap-1.5 rounded-full',
    statLabel: 'text-sm text-muted-foreground',
    votes: 'flex-row items-center gap-0.5 rounded-full bg-muted',
    voteButton: 'h-8 w-8 items-center justify-center rounded-full',
    voteScore: 'text-sm font-semibold tabular-nums',
  },
  variants: {
    variant: {
      /** The full card — author, body, media, counts. */
      feed: {
        header: 'p-4 pb-3',
        body: 'px-4 pb-3 text-base leading-relaxed',
        media: 'mx-4 rounded-xl',
        footer: 'gap-5 p-4',
      },
      /** A headline with a score beside it, the way a ranked community reads. */
      vote: {
        header: 'px-4 pb-2 pt-3.5',
        body: 'px-4 pb-3 text-sm leading-relaxed',
        media: 'mx-4 rounded-xl',
        footer: 'gap-2 px-4 pb-3.5',
      },
      /** No media, name and handle on one line — for a dense timeline. */
      compact: {
        root: 'rounded-xl',
        header: 'p-3.5 pb-2',
        body: 'px-3.5 pb-2.5 text-sm leading-relaxed',
        media: 'mx-3.5 rounded-lg',
        footer: 'gap-6 px-3.5 pb-3',
      },
      /** The image is the card; the author is laid over it. */
      media: {
        header: 'absolute inset-x-0 top-0 z-10 p-3',
        body: 'px-4 pb-3 pt-3 text-sm leading-relaxed',
        media: 'rounded-none',
        footer: 'gap-5 px-4 pb-4',
      },
    },
    size: {
      default: {},
      sm: { name: 'text-sm', meta: 'text-xs', statLabel: 'text-xs' },
    },
  },
  defaultVariants: {
    variant: 'feed',
    size: 'default',
  },
});

type PostVariant = 'feed' | 'vote' | 'compact' | 'media';

const PostContext = createContext<{ variant: PostVariant; size: 'default' | 'sm' }>({
  variant: 'feed',
  size: 'default',
});

function usePost() {
  return useContext(PostContext);
}

export interface PostProps
  extends Omit<ViewProps, 'children'>,
    VariantProps<typeof postVariants> {
  className?: string;
  /** Which of the four shapes. */
  variant?: PostVariant;
  /** `sm` tightens the type for a card in a sidebar or a preview. */
  size?: 'default' | 'sm';
  /** Opening the post itself. The parts inside keep their own presses. */
  onPress?: PressableProps['onPress'];
  children?: ReactNode;
}

const PostRoot = forwardRef<ViewRef, PostProps>(
  ({ className, variant = 'feed', size = 'default', onPress, children, ...props }, ref) => {
    const { root } = postVariants({ variant, size });
    const context = useMemo(() => ({ variant, size }), [variant, size]);

    const body = (
      <PostContext.Provider value={context}>{children}</PostContext.Provider>
    );

    if (!onPress) {
      return (
        <View ref={ref} {...props} className={root({ className })}>
          {body}
        </View>
      );
    }

    return (
      // `article` rather than `button`: the card opens, but the row of controls
      // inside it is the reason anyone is here, and announcing the whole thing
      // as one button buries them.
      <AnimatedPressable
        ref={ref}
        {...props}
        accessibilityRole="link"
        onPress={onPress}
        className={root({ className })}
      >
        {body}
      </AnimatedPressable>
    );
  }
);
PostRoot.displayName = 'Post';

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

export interface PostHeaderProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The author row. `Post.Action` is pulled to the trailing edge, so the overflow
 * menu stays in the corner as a long display name wraps rather than riding down
 * with it.
 */
const PostHeader = forwardRef<ViewRef, PostHeaderProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, size } = usePost();
    const { header } = postVariants({ variant, size });

    const content: ReactNode[] = [];
    const actions: ReactNode[] = [];
    for (const child of Array.isArray(children) ? children : [children]) {
      if (isType(child, PostAction)) actions.push(child);
      else content.push(child);
    }

    return (
      <View ref={ref} className={header({ className })} {...props}>
        {content}
        {actions}
      </View>
    );
  }
);
PostHeader.displayName = 'Post.Header';

function isType(child: ReactNode, type: unknown): boolean {
  return (
    typeof child === 'object' &&
    child !== null &&
    'type' in child &&
    (child as { type?: unknown }).type === type
  );
}

export interface PostAuthorProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** Display name. */
  name: string;
  /** `@handle`, shown beside the name in `compact` and under it elsewhere. */
  handle?: string;
  avatar?: ImageSourcePropType;
  /** Initials behind a missing or broken avatar. */
  fallback?: string;
  /** Draws the verification rosette after the name. */
  verified?: boolean;
  /** "Posted 3m ago" — whatever the caller wants to call the time. */
  timestamp?: ReactNode;
  children?: ReactNode;
}

/**
 * Who posted it.
 *
 * The handle sits beside the name in `compact` and beneath it everywhere else,
 * which is the difference between a timeline row and a card: a dense row cannot
 * afford a second line, and a card looks starved without one.
 */
const PostAuthor = forwardRef<ViewRef, PostAuthorProps>(
  (
    { className, name, handle, avatar, fallback, verified, timestamp, children, ...props },
    ref
  ) => {
    const { variant, size } = usePost();
    const { author, authorLine, name: nameSlot, handle: handleSlot, meta } = postVariants({
      variant,
      size,
    });
    const verifiedColor = useCSSVariable('--color-primary');
    const onVerified = useCSSVariable('--color-primary-foreground');

    const inline = variant === 'compact';
    const overlaid = variant === 'media';

    return (
      // Top-aligned, not centred. The name is the first line of the block, and
      // aligning to the top is what puts it — and therefore the menu opposite
      // it — on the same rule in every variant, whether the block below the
      // name is one line, two, or none.
      <View ref={ref} className="min-w-0 flex-1 flex-row items-start gap-2.5" {...props}>
        <Avatar
          size={variant === 'compact' ? 'sm' : 'md'}
          source={avatar}
          fallback={fallback ?? initials(name)}
          className={overlaid ? 'border-white/30' : undefined}
        />
        <View className={author({ className })}>
          {/* `h-6` fixes the name's line box, so the block below it starts at
              the same offset whatever the type scale rounds the line height
              to — which is what the menu opposite is aligning against. */}
          <View className={authorLine({ className: 'h-6' })}>
            <Text
              numberOfLines={1}
              className={nameSlot({ className: cn('shrink', overlaid && 'text-white') })}
            >
              {name}
            </Text>
            {verified ? (
              <BadgeCheckIcon
                size={15}
                color={typeof verifiedColor === 'string' ? verifiedColor : '#2563eb'}
                checkColor={typeof onVerified === 'string' ? onVerified : '#ffffff'}
              />
            ) : null}
            {inline && handle ? (
              <Text
                size="sm"
                numberOfLines={1}
                className={handleSlot({ className: 'shrink' })}
              >
                {handle}
              </Text>
            ) : null}
            {inline && timestamp !== undefined ? (
              <>
                <Text size="sm" className={handleSlot()}>
                  ·
                </Text>
                {textChildren(timestamp, (text) => (
                  <Text size="sm" className={handleSlot()}>
                    {text}
                  </Text>
                ))}
              </>
            ) : null}
          </View>

          {!inline && (handle || timestamp !== undefined) ? (
            <Text
              numberOfLines={1}
              className={meta({ className: overlaid ? 'text-white/80' : undefined })}
            >
              {[handle, typeof timestamp === 'string' ? timestamp : undefined]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          {!inline && timestamp !== undefined && typeof timestamp !== 'string'
            ? timestamp
            : null}
          {children}
        </View>
      </View>
    );
  }
);
PostAuthor.displayName = 'Post.Author';

/** First letters of the first two words — enough to tell two people apart. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}

export interface PostActionProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The header's trailing slot — an overflow menu, a follow button, a badge. */
const PostAction = forwardRef<ViewRef, PostActionProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, size } = usePost();
    const { action } = postVariants({ variant, size });
    return (
      <View ref={ref} className={action({ className })} {...props}>
        {children}
      </View>
    );
  }
);
PostAction.displayName = 'Post.Action';

export interface PostCommunityProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The group's name — "r/reactnative", "#design". */
  name: string;
  avatar?: ImageSourcePropType;
  /** How long ago, and anything else that belongs on the line. */
  meta?: ReactNode;
  children?: ReactNode;
}

/**
 * The group a post was made in, above its headline.
 *
 * Smaller and quieter than an author row, because in a ranked community the
 * post's subject is the headline — the group is where it came from, not who
 * said it.
 */
const PostCommunity = forwardRef<ViewRef, PostCommunityProps>(
  ({ className, name, avatar, meta, children, ...props }, ref) => {
    const { variant, size } = usePost();
    const {
      community,
      communityName,
      communityMeta,
    } = postVariants({ variant, size });

    return (
      <View ref={ref} className={community({ className })} {...props}>
        <Avatar
          size="sm"
          source={avatar}
          fallback={name.replace(/^[^a-z0-9]*/i, '').slice(0, 1).toUpperCase()}
          className="h-6 w-6"
        />
        <Text numberOfLines={1} className={communityName({ className: 'shrink' })}>
          {name}
        </Text>
        {meta !== undefined ? (
          <>
            <Text className={communityMeta()}>·</Text>
            {textChildren(meta, (text) => (
              <Text className={communityMeta()}>{text}</Text>
            ))}
          </>
        ) : null}
        {children}
      </View>
    );
  }
);
PostCommunity.displayName = 'Post.Community';

/* -------------------------------------------------------------------------- */
/* Body                                                                       */
/* -------------------------------------------------------------------------- */

export interface PostTitleProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The headline of a post whose subject is a headline rather than a person. */
const PostTitle = forwardRef<ViewRef, PostTitleProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, size } = usePost();
    const { title } = postVariants({ variant, size });
    return (
      <View ref={ref} className={cn('px-4 pb-2', className)} {...props}>
        {textChildren(children, (text) => <Text className={title()}>{text}</Text>)}
      </View>
    );
  }
);
PostTitle.displayName = 'Post.Title';

export interface PostBodyProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** How many lines before it is cut off. Unlimited by default. */
  numberOfLines?: number;
  /** Called with the tag, without its `#`. Makes hashtags pressable. */
  onTagPress?: (tag: string) => void;
  /** Called with the handle, without its `@`. */
  onMentionPress?: (handle: string) => void;
  children?: ReactNode;
}

/**
 * What was written.
 *
 * Hashtags and mentions inside a string child are picked out and coloured. They
 * are found in the text rather than declared, because a post body arrives as
 * one string from wherever it was typed — asking the caller to pre-split it
 * would mean every caller writing the same tokeniser.
 *
 * A non-string child is left entirely alone: it has already been laid out by
 * someone who knew more than we do.
 */
const PostBody = forwardRef<ViewRef, PostBodyProps>(
  (
    { className, numberOfLines, onTagPress, onMentionPress, children, ...props },
    ref
  ) => {
    const { variant, size } = usePost();
    const { body } = postVariants({ variant, size });

    if (typeof children !== 'string') {
      return (
        <View ref={ref} className={cn(body(), className)} {...props}>
          {children}
        </View>
      );
    }

    return (
      <View ref={ref} className={cn(body({ className }))} {...props}>
        <Text numberOfLines={numberOfLines} className={body({ className: 'p-0' })}>
          {tokenize(children).map((token, index) =>
            token.kind === 'text' ? (
              token.value
            ) : (
              <Text
                key={index}
                className="text-primary"
                onPress={
                  token.kind === 'tag'
                    ? onTagPress && (() => onTagPress(token.value.slice(1)))
                    : onMentionPress && (() => onMentionPress(token.value.slice(1)))
                }
              >
                {token.value}
              </Text>
            )
          )}
        </Text>
      </View>
    );
  }
);
PostBody.displayName = 'Post.Body';

interface Token {
  kind: 'text' | 'tag' | 'mention';
  value: string;
}

/**
 * Splits a body into plain runs, hashtags and mentions.
 *
 * The tag pattern stops at whitespace and at punctuation that ends a sentence,
 * so "#DebtSnowball." highlights the tag and leaves the full stop black — the
 * naive `\S+` swallows it and the sentence loses its ending.
 */
function tokenize(text: string): Token[] {
  const pattern = /[#@][\w-]+/g;
  const tokens: Token[] = [];
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) tokens.push({ kind: 'text', value: text.slice(last, start) });
    tokens.push({
      kind: match[0].startsWith('#') ? 'tag' : 'mention',
      value: match[0],
    });
    last = start + match[0].length;
  }
  if (last < text.length) tokens.push({ kind: 'text', value: text.slice(last) });
  return tokens;
}

export interface PostMediaProps extends Omit<ViewProps, 'children'> {
  className?: string;
  source: ImageSourcePropType;
  /** Width over height. `16 / 10` by default — wide enough not to eat the feed. */
  aspectRatio?: number;
  /**
   * Darkens an edge of the image so type laid over it stays legible.
   *
   * A gradient rather than a panel: a flat rectangle over the top of a
   * photograph has an edge of its own, and that edge reads as a bar covering
   * the picture rather than as shading. `media` posts default to `top`, where
   * the author sits; everything else to `none`.
   */
  scrim?: 'none' | 'top' | 'bottom' | 'both';
  /** Laid over the image: an expand affordance, a duration, a gallery count. */
  overlay?: ReactNode;
  /** Described for a screen reader. An image with nothing to say is decorative. */
  alt?: string;
  onPress?: PressableProps['onPress'];
  children?: ReactNode;
}

/**
 * Black, fading to nothing.
 *
 * Three stops rather than two: a straight linear ramp from 55% to nothing has a
 * visible shoulder where it meets the picture, and the eye reads that shoulder
 * as an edge — which is the whole thing a scrim exists to avoid.
 */
const SCRIM_COLOURS: readonly [string, string, string] = [
  'rgba(0,0,0,0.55)',
  'rgba(0,0,0,0.28)',
  'rgba(0,0,0,0)',
];

/**
 * The picture.
 *
 * A fixed aspect ratio rather than the image's own, because a feed of cards
 * whose heights are decided by whatever was uploaded scrolls like a broken
 * staircase. The image covers the box and is cropped by it.
 */
const PostMedia = forwardRef<ViewRef, PostMediaProps>(
  (
    {
      className,
      source,
      aspectRatio = 16 / 10,
      scrim,
      overlay,
      alt,
      onPress,
      children,
      ...props
    },
    ref
  ) => {
    const { variant, size } = usePost();
    const { media } = postVariants({ variant, size });
    // The media variant lays the author over the image, so it needs shading by
    // default — the caller should not have to remember what makes their own
    // layout readable.
    const shade = scrim ?? (variant === 'media' ? 'top' : 'none');

    const picture = (
      <>
        <Image
          source={source}
          resizeMode="cover"
          accessible={!!alt}
          accessibilityLabel={alt}
          accessibilityRole={alt ? 'image' : undefined}
          className="h-full w-full"
        />
        {shade === 'top' || shade === 'both' ? (
          <LinearGradient
            pointerEvents="none"
            colors={SCRIM_COLOURS}
            // A fixed height, not a fraction. The scrim is there to carry one
            // row of type, and a fraction of a 4:5 portrait shades half the
            // photograph to do a job that needs the top 112 points of it.
            className="absolute inset-x-0 top-0 h-28"
          />
        ) : null}
        {shade === 'bottom' || shade === 'both' ? (
          <LinearGradient
            pointerEvents="none"
            colors={[SCRIM_COLOURS[2], SCRIM_COLOURS[1], SCRIM_COLOURS[0]]}
            className="absolute inset-x-0 bottom-0 h-32"
          />
        ) : null}
        {overlay ? (
          <View pointerEvents="box-none" className="absolute inset-0">
            {overlay}
          </View>
        ) : null}
        {children}
      </>
    );

    if (!onPress) {
      return (
        <View ref={ref} {...props} className={media({ className })} style={{ aspectRatio }}>
          {picture}
        </View>
      );
    }

    return (
      <Pressable
        ref={ref}
        {...props}
        accessibilityRole="imagebutton"
        accessibilityLabel={alt}
        onPress={onPress}
        className={media({ className })}
        style={{ aspectRatio }}
      >
        {picture}
      </Pressable>
    );
  }
);
PostMedia.displayName = 'Post.Media';

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

export interface PostFooterProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The row of counts and controls under the post. */
const PostFooter = forwardRef<ViewRef, PostFooterProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, size } = usePost();
    const { footer } = postVariants({ variant, size });
    return (
      <View ref={ref} className={footer({ className })} {...props}>
        {children}
      </View>
    );
  }
);
PostFooter.displayName = 'Post.Footer';

/** What lighting up means. A like is red, a save is the accent, a repost green. */
const statTone: Record<'default' | 'like' | 'save' | 'repost', string> = {
  default: '--color-primary',
  like: '--color-destructive',
  save: '--color-primary',
  repost: '--color-success',
};

export interface PostStatProps extends Omit<PressableProps, 'children' | 'style'> {
  className?: string;
  /** The icon component itself, not an element — it is re-rendered on toggle. */
  icon?: ComponentType<IconProps & { filled?: boolean }>;
  /** The number, or a word where a number would be meaningless ("Save"). */
  value?: ReactNode;
  /** Lit, and filled. */
  active?: boolean;
  /** Which colour "lit" is. */
  tone?: 'default' | 'like' | 'save' | 'repost';
  /** Pushes this stat and everything after it to the trailing edge. */
  align?: 'start' | 'end';
  children?: ReactNode;
}

/**
 * One count in the footer, and the control that changes it.
 *
 * Pressing it pops the icon past its own size and settles back, fills it, and
 * animates the value: the old number leaves upwards and the new one arrives
 * from below when the count goes up, and the other way when it comes down.
 * Repainting the digits in place is indistinguishable from a re-render, which
 * is the doubt this exists to remove.
 */
const PostStat = forwardRef<ViewRef, PostStatProps>(
  (
    {
      className,
      icon: Icon,
      value,
      active = false,
      tone = 'default',
      align = 'start',
      onPress,
      children,
      ...props
    },
    ref
  ) => {
    const { variant, size } = usePost();
    const { stat, statLabel } = postVariants({ variant, size });
    const litColor = useCSSVariable(statTone[tone]);
    const restColor = useCSSVariable('--color-muted-foreground');
    const reducedMotion = useReducedMotion();

    const pop = useSharedValue(1);
    const first = useRef(true);

    useEffect(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (reducedMotion) return;
      // Past 1 and back. A toggle that only grows reads as a state that got
      // bigger; one that overshoots reads as a press.
      pop.value = withSequence(
        withTiming(active ? 1.25 : 0.85, { duration: 90 }),
        withSpring(1, POP)
      );
    }, [active, reducedMotion, pop]);

    const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

    const colour = active
      ? typeof litColor === 'string'
        ? litColor
        : '#e11d48'
      : typeof restColor === 'string'
        ? restColor
        : '#737373';

    const inner = (
      <>
        {Icon ? (
          <Animated.View style={iconStyle}>
            <Icon size={variant === 'compact' ? 15 : 17} color={colour} filled={active} />
          </Animated.View>
        ) : null}
        {value !== undefined ? (
          <PostCount
            value={value}
            className={statLabel({ className: active ? '' : undefined })}
            color={active ? colour : undefined}
          />
        ) : null}
        {children}
      </>
    );

    const classes = stat({ className: cn(align === 'end' && 'ms-auto', className) });

    if (!onPress) {
      return (
        <View ref={ref} className={classes}>
          {inner}
        </View>
      );
    }

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        // The row is dense, so the targets overlap their own boxes rather than
        // being spaced far enough apart to be hit — spacing them would be a
        // footer twice as wide as the numbers in it.
        hitSlop={10}
        onPress={(event) => {
          selectionTick();
          onPress(event);
        }}
        className={classes}
        {...props}
      >
        {inner}
      </Pressable>
    );
  }
);
PostStat.displayName = 'Post.Stat';

/**
 * A number that moves when it changes.
 *
 * The new value arrives from the direction the count travelled — rising into
 * place when it went up, dropping in when it came down — while the old one
 * fades. `215 → 216` then reads as a count going up rather than as text being
 * replaced, which is the doubt worth removing: repainting digits in place is
 * indistinguishable from a re-render.
 *
 * Only the entering half carries the direction. The element leaving was
 * rendered before anyone knew which way the number would go, so asking it to
 * animate knowingly would mean knowing the future.
 *
 * A value that is not a number — "Save" — cross-fades, since there is no
 * direction for a word to go.
 */
function PostCount({
  value,
  className,
  color,
}: {
  value: ReactNode;
  className?: string;
  color?: string;
}) {
  const reducedMotion = useReducedMotion();
  // Read during the render the value changes on, not after it: an effect would
  // settle the direction one frame after the animation had already started.
  const before = numeric(usePrevious(value));
  const after = numeric(value);
  const direction =
    before === null || after === null || before === after ? 0 : after > before ? 1 : -1;

  const label = (
    <Text className={className} style={color ? { color } : undefined}>
      {value}
    </Text>
  );

  if (reducedMotion) return label;

  return (
    <Animated.View
      // Keyed on the value, so React tears the old one down and builds the new
      // one — which is what gives the two of them an entering and an exiting
      // animation to run at all.
      key={String(value)}
      entering={
        direction === 1
          ? FadeInUp.duration(COUNT_DURATION)
          : direction === -1
            ? FadeInDown.duration(COUNT_DURATION)
            : FadeIn.duration(COUNT_DURATION)
      }
      exiting={FadeOut.duration(COUNT_DURATION)}
    >
      {label}
    </Animated.View>
  );
}

/** The value as a number, where it is one. `"5,874"` counts; `"Save"` does not. */
function numeric(value: ReactNode): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/[,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/* -------------------------------------------------------------------------- */
/* Votes                                                                      */
/* -------------------------------------------------------------------------- */

export type PostVote = 'up' | 'down' | null;

export interface PostVotesProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The score as it stands, with the reader's own vote already in it. */
  score: number | string;
  /** Which way this reader voted, if either. */
  vote?: PostVote;
  /**
   * Called with the new vote. Pressing the arrow already cast clears it, so
   * `null` arrives as often as the other two — a vote you cannot take back is
   * a vote people hesitate over.
   */
  onVote?: (vote: PostVote) => void;
  /** `vertical` stacks the arrows beside a thumbnail, the way a ranked list reads. */
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
}

/**
 * The score, and the two arrows that move it.
 *
 * Both arrows fill and take a colour when cast, and the whole pill tints with
 * them — the arrow alone is 16pt of a card, which is not enough to notice from
 * arm's length. The score rolls in the direction of the change.
 *
 * Pressing the arrow already cast clears the vote. This is not a nicety: a
 * score is a thing people change their minds about, and a vote that cannot be
 * withdrawn is one they think twice before casting.
 */
const PostVotes = forwardRef<ViewRef, PostVotesProps>(
  (
    {
      className,
      score,
      vote = null,
      onVote,
      orientation = 'horizontal',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const { variant, size } = usePost();
    const { votes, voteButton, voteScore } = postVariants({ variant, size });
    const upColor = useCSSVariable('--color-success');
    const downColor = useCSSVariable('--color-destructive');
    const restColor = useCSSVariable('--color-muted-foreground');

    const up = typeof upColor === 'string' ? upColor : '#16a34a';
    const down = typeof downColor === 'string' ? downColor : '#dc2626';
    const rest = typeof restColor === 'string' ? restColor : '#737373';

    const cast = (next: 'up' | 'down') => {
      selectionTick();
      onVote?.(vote === next ? null : next);
    };

    const scoreColour = vote === 'up' ? up : vote === 'down' ? down : undefined;

    return (
      <View
        ref={ref}
        accessibilityRole="adjustable"
        accessibilityLabel="Score"
        accessibilityValue={{ text: String(score) }}
        className={votes({
          className: cn(
            orientation === 'vertical' && 'flex-col gap-0',
            vote === 'up' && 'bg-success/12',
            vote === 'down' && 'bg-destructive/12',
            className
          ),
        })}
        {...props}
      >
        <VoteArrow
          direction="up"
          active={vote === 'up'}
          color={vote === 'up' ? up : rest}
          disabled={disabled}
          className={voteButton()}
          onPress={() => cast('up')}
        />
        <PostCount
          value={score}
          className={voteScore({ className: 'min-w-6 text-center' })}
          color={scoreColour}
        />
        <VoteArrow
          direction="down"
          active={vote === 'down'}
          color={vote === 'down' ? down : rest}
          disabled={disabled}
          className={voteButton()}
          onPress={() => cast('down')}
        />
      </View>
    );
  }
);
PostVotes.displayName = 'Post.Votes';

/**
 * One arrow.
 *
 * It travels along its own axis as it is cast — up for the up arrow, down for
 * the down one — and springs back. The direction of the throw is the whole
 * point: an arrow that merely scales says *something happened*, one that moves
 * the way it points says *which way*.
 */
function VoteArrow({
  direction,
  active,
  color,
  disabled,
  className,
  onPress,
}: {
  direction: 'up' | 'down';
  active: boolean;
  color: string;
  disabled: boolean;
  className: string;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const shift = useSharedValue(0);
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reducedMotion) return;
    const travel = direction === 'up' ? -5 : 5;
    shift.value = withSequence(
      withTiming(active ? travel : -travel * 0.4, { duration: 100 }),
      withSpring(0, POP)
    );
    scale.value = withSequence(
      withTiming(active ? 1.2 : 0.9, { duration: 100 }),
      withSpring(1, POP)
    );
  }, [active, direction, reducedMotion, shift, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: shift.value }, { scale: scale.value }],
  }));

  const Arrow = direction === 'up' ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'up' ? 'Upvote' : 'Downvote'}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      className={cn(className, disabled && 'opacity-[0.64]')}
    >
      <Animated.View style={style}>
        <Arrow size={17} color={color} filled={active} />
      </Animated.View>
    </Pressable>
  );
}

export const Post = Object.assign(PostRoot, {
  Header: PostHeader,
  Author: PostAuthor,
  Action: PostAction,
  Community: PostCommunity,
  Title: PostTitle,
  Body: PostBody,
  Media: PostMedia,
  Footer: PostFooter,
  Stat: PostStat,
  Votes: PostVotes,
});
