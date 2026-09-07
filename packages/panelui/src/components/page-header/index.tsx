/**
 * PageHeader — the top of a profile screen: a cover, the face over it, who it
 * belongs to, and what you can do about them.
 *
 * Every social app opens a profile the same way, and rebuilding it per screen
 * is how the cover ends up a different height on each one. The parts here are
 * the pieces that arrangement is made of, and the two variants are the two
 * places it lives: `card`, a self-contained surface in a scroll of other
 * cards, and `page`, the header of the screen itself.
 *
 * ```tsx
 * <PageHeader>
 *   <PageHeader.Cover />
 *   <PageHeader.Avatar source={face} fallback="OR" verified />
 *   <PageHeader.Content>
 *     <PageHeader.Title>Olivia Rhye</PageHeader.Title>
 *     <PageHeader.Description>@oliviarhye</PageHeader.Description>
 *   </PageHeader.Content>
 *   <PageHeader.Actions>
 *     <Button className="flex-1">Follow</Button>
 *   </PageHeader.Actions>
 * </PageHeader>
 * ```
 *
 * The cover in `card` is held off the card's edges and rounded on its top
 * corners only, so its bottom edge meets the content rather than floating
 * above it. The radius pair is `rounded-3xl` on the card and `rounded-2xl` on
 * the cover, one step apart on the theme's own scale — which is the same 8
 * points the card is padded by, so the two curves stay concentric without a
 * hardcoded number that would be wrong in half the themes.
 *
 * The avatar lifts itself over the cover's bottom edge, and it works out
 * whether to: the root looks for a `PageHeader.Cover` among its children and
 * says so through context, because a header with no cover has nothing to
 * overlap and an avatar that lifted anyway would hang off the top of it.
 *
 * The ring around the face is drawn in the surface behind it — the card, or
 * the page — rather than in a border colour, so the face reads as punched out
 * of the cover instead of outlined on top of it.
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  Image,
  View,
  type ImageSourcePropType,
  type PressableProps,
  type Text as RNText,
  type ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { BadgeCheckIcon, IconColorProvider } from '../../icons';
import { Avatar, AVATAR_SIZE_POINTS, type AvatarProps, type AvatarSizeName } from '../avatar';

/** Height of a cover that is not given one. Two lines of nothing, and enough
 * of a band for a face to sit half over. */
const COVER_HEIGHT = 120;

/** Points of surface drawn around the face. */
const AVATAR_RING = 4;

/** The rosette, as a share of the face it sits on. */
const BADGE_RATIO = 0.3;

/** The cover gradient, when no image is given. Both are series tokens, so an
 * app that puts its charts on brand puts this on brand with them. */
const GRADIENT = ['--color-chart-2', '--color-chart-5'] as const;
const GRADIENT_FALLBACK = ['#3b82f6', '#8b5cf6'] as const;

const pageHeaderVariants = tv({
  slots: {
    root: 'w-full',
    cover: 'overflow-hidden bg-muted',
    avatar: 'self-start',
    ring: 'overflow-hidden rounded-full',
    row: 'flex-row items-center gap-5',
    content: 'gap-1',
    meta: 'flex-row items-center gap-1.5',
    stats: 'flex-row items-center',
    actions: 'flex-row items-center gap-2',
  },
  variants: {
    variant: {
      // `overflow-hidden` clips the cover's own square bottom corners to the
      // card's radius on the way down; `p-2` is what holds the cover off the
      // card's edges, and is the difference between the two radii above.
      card: {
        root: 'overflow-hidden rounded-3xl border border-border bg-card p-2',
        cover: 'rounded-t-2xl',
        ring: 'border-card',
        avatar: 'px-3',
        row: 'px-3',
        content: 'px-3 pt-3',
        actions: 'px-3 pb-2 pt-4',
      },
      // No surface of its own, and the cover runs to the screen's edges.
      page: {
        root: 'bg-background',
        ring: 'border-background',
        avatar: 'px-4',
        row: 'px-4',
        content: 'px-4 pt-3',
        actions: 'px-4 pb-4 pt-4',
      },
    },
    align: {
      start: {},
      center: {
        avatar: 'self-center',
        row: 'justify-center',
        content: 'items-center',
        meta: 'justify-center',
        stats: 'justify-center',
        actions: 'justify-center',
      },
    },
  },
  defaultVariants: {
    variant: 'card',
    align: 'center',
  },
});

type PageHeaderVariantProps = VariantProps<typeof pageHeaderVariants>;

/** Where the header lives: a card in a scroll, or the top of the screen. */
export type PageHeaderVariant = NonNullable<PageHeaderVariantProps['variant']>;

/** Which edge the face and the text line up on. */
export type PageHeaderAlign = NonNullable<PageHeaderVariantProps['align']>;

interface PageHeaderContextValue {
  variant: PageHeaderVariant;
  align: PageHeaderAlign;
  hasCover: boolean;
}

const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined);

function usePageHeader(component: string): PageHeaderContextValue {
  const context = useContext(PageHeaderContext);
  if (!context) throw new Error(`${component} must be used within a <PageHeader>`);
  return context;
}

/**
 * True inside a `PageHeader.Row`. The avatar carries the body's inset and its
 * own alignment when it stands alone, and neither when something else is
 * already holding the row it sits in.
 */
const PageHeaderRowContext = createContext(false);

/** How a stats row reads its numbers out. */
const PageHeaderStatsContext = createContext<PageHeaderStatsLayout>('stacked');

export interface PageHeaderProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

export interface PageHeaderRootProps extends PageHeaderProps {
  /**
   * `card` is a surface of its own, with the cover held off its edges. `page`
   * drops the surface and lets the cover run to the screen's edges.
   */
  variant?: PageHeaderVariant;
  /**
   * Which edge the face, the text and the actions line up on. `center` is the
   * profile card; `start` is the screen header, where the name is the first
   * thing on the line rather than the middle of it.
   */
  align?: PageHeaderAlign;
}

const PageHeaderRoot = forwardRef<View, PageHeaderRootProps>(
  ({ className, variant = 'card', align = 'center', children, ...props }, ref) => {
    // Whether the avatar has anything to overlap. Read off the children rather
    // than asked for, because a caller who has written a cover should not also
    // have to say that they have.
    const hasCover = Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === PageHeaderCover
    );

    const context = useMemo(
      () => ({ variant, align, hasCover }),
      [variant, align, hasCover]
    );

    return (
      <View
        {...props}
        ref={ref}
        className={pageHeaderVariants({ variant, align }).root({ className })}
      >
        <PageHeaderContext.Provider value={context}>{children}</PageHeaderContext.Provider>
      </View>
    );
  }
);
PageHeaderRoot.displayName = 'PageHeader';

export interface PageHeaderCoverProps extends ViewProps {
  className?: string;
  /** The banner. Left out, the cover draws a gradient instead. */
  source?: ImageSourcePropType;
  /** How tall the band is. */
  height?: number;
  /**
   * The gradient, when there is no image. Two colours or more, as real colour
   * strings — this is painted rather than classed.
   */
  colors?: readonly [string, string, ...string[]];
  /** What the banner shows. Left out, it is treated as decoration. */
  alt?: string;
  children?: ReactNode;
}

/**
 * The banner. An image when given one, a gradient when not — a header with no
 * banner still has to read as a header, and an empty band reads as a bug.
 */
const PageHeaderCover = forwardRef<View, PageHeaderCoverProps>(
  ({ className, source, height = COVER_HEIGHT, colors, alt, style, children, ...props }, ref) => {
    const { variant } = usePageHeader('PageHeader.Cover');
    const from = useCSSVariable(GRADIENT[0]);
    const to = useCSSVariable(GRADIENT[1]);

    // `useCSSVariable` can hand back something that is not a colour string, and
    // a gradient given one paints nothing at all.
    const ramp =
      colors ??
      ([
        typeof from === 'string' ? from : GRADIENT_FALLBACK[0],
        typeof to === 'string' ? to : GRADIENT_FALLBACK[1],
      ] as const);

    return (
      <View
        {...props}
        ref={ref}
        className={pageHeaderVariants({ variant }).cover({ className })}
        style={[{ height }, style]}
      >
        {source ? (
          <Image
            source={source}
            resizeMode="cover"
            className="h-full w-full"
            accessible={!!alt}
            accessibilityRole={alt ? 'image' : undefined}
            accessibilityLabel={alt}
          />
        ) : (
          <LinearGradient
            colors={ramp}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="h-full w-full"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        )}
        {children}
      </View>
    );
  }
);
PageHeaderCover.displayName = 'PageHeader.Cover';

export interface PageHeaderAvatarProps extends Omit<AvatarProps, 'size' | 'children'> {
  className?: string;
  /** How big the face is. */
  size?: AvatarSizeName;
  /** Draws the verification rosette in the face's bottom corner. */
  verified?: boolean;
  /**
   * Anything else for that corner — a camera button, a presence dot, a "+".
   * Wins over `verified`.
   */
  badge?: ReactNode;
  /**
   * Whether the face lifts over the cover's bottom edge. Set by the presence
   * of a `PageHeader.Cover`; pass it to override that either way.
   */
  overlap?: boolean;
}

/**
 * The face, in a ring of whatever surface is behind it.
 *
 * The badge is drawn here rather than with `Avatar.Badge` because that one is
 * pinned to the top corner, where an unread count belongs. A verification mark
 * belongs at the bottom, beside the name it is vouching for.
 */
const PageHeaderAvatar = forwardRef<View, PageHeaderAvatarProps>(
  (
    { className, size = 'xl', verified, badge, overlap, source, fallback, imageProps, style, ...props },
    ref
  ) => {
    const { variant, align, hasCover } = usePageHeader('PageHeader.Avatar');
    const inRow = useContext(PageHeaderRowContext);
    const slots = pageHeaderVariants({ variant, align });
    const primary = useCSSVariable('--color-primary');
    const onPrimary = useCSSVariable('--color-primary-foreground');

    const diameter = AVATAR_SIZE_POINTS[size] ?? AVATAR_SIZE_POINTS.xl;
    const lifts = overlap ?? hasCover;
    const mark = badge ?? (verified ? (
      <BadgeCheckIcon
        size={Math.round(diameter * BADGE_RATIO)}
        color={typeof primary === 'string' ? primary : '#2563eb'}
        checkColor={typeof onPrimary === 'string' ? onPrimary : '#ffffff'}
      />
    ) : null);

    return (
      <View
        {...props}
        ref={ref}
        // Inside a row the row is already holding the inset and the alignment;
        // repeating them here would indent the face past the text under it.
        className={inRow ? cn('self-start', className) : slots.avatar({ className })}
        style={[lifts ? { marginTop: -Math.round(diameter / 2) } : null, style]}
      >
        {/*
          Two views, because the ring clips. A badge hung on the clipping one
          would be cut in half by the circle it is meant to sit against.
        */}
        <View className={slots.ring()} style={{ borderWidth: AVATAR_RING }}>
          <Avatar
            size={size}
            source={source}
            fallback={fallback}
            imageProps={imageProps}
            className="border-0"
          />
        </View>
        {mark ? <View className="absolute bottom-0.5 end-0.5">{mark}</View> : null}
      </View>
    );
  }
);
PageHeaderAvatar.displayName = 'PageHeader.Avatar';

export interface PageHeaderRowProps extends PageHeaderProps {
  children?: ReactNode;
}

/**
 * The face, and whatever sits beside it. For the profile that puts its counts
 * next to the picture rather than under the name.
 */
const PageHeaderRow = forwardRef<View, PageHeaderRowProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, align } = usePageHeader('PageHeader.Row');
    return (
      <View
        {...props}
        ref={ref}
        className={pageHeaderVariants({ variant, align }).row({ className })}
      >
        <PageHeaderRowContext.Provider value>{children}</PageHeaderRowContext.Provider>
      </View>
    );
  }
);
PageHeaderRow.displayName = 'PageHeader.Row';

export interface PageHeaderContentProps extends PageHeaderProps {
  children?: ReactNode;
}

/** The text block: the name, the handle, and anything under them. */
const PageHeaderContent = forwardRef<View, PageHeaderContentProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, align } = usePageHeader('PageHeader.Content');
    return (
      <View
        {...props}
        ref={ref}
        className={pageHeaderVariants({ variant, align }).content({ className })}
      >
        {textChildren(children)}
      </View>
    );
  }
);
PageHeaderContent.displayName = 'PageHeader.Content';

/** Whose page it is. Announces itself as a heading. */
const PageHeaderTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
  <Text
    {...props}
    ref={ref}
    size="xl"
    weight="semibold"
    accessibilityRole="header"
    className={cn('text-foreground', className)}
  />
));
PageHeaderTitle.displayName = 'PageHeader.Title';

/** The handle, the email, the bio — the quiet line under the name. */
const PageHeaderDescription = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
  <Text {...props} ref={ref} size="sm" muted className={className} />
));
PageHeaderDescription.displayName = 'PageHeader.Description';

export interface PageHeaderMetaProps extends PageHeaderProps {
  /** A glyph before the line. Takes the muted colour without being told. */
  icon?: ReactNode;
  children?: ReactNode;
}

/**
 * One fact about the account — a link, a location, the month it was opened.
 */
const PageHeaderMeta = forwardRef<View, PageHeaderMetaProps>(
  ({ className, icon, children, ...props }, ref) => {
    const { variant, align } = usePageHeader('PageHeader.Meta');
    const muted = useCSSVariable('--color-muted-foreground');
    return (
      <View
        {...props}
        ref={ref}
        className={pageHeaderVariants({ variant, align }).meta({ className })}
      >
        {icon ? (
          <IconColorProvider color={typeof muted === 'string' ? muted : undefined}>
            {icon}
          </IconColorProvider>
        ) : null}
        {textChildren(children, (text) => (
          <Text size="sm" muted>
            {text}
          </Text>
        ))}
      </View>
    );
  }
);
PageHeaderMeta.displayName = 'PageHeader.Meta';

/** How a stats row reads its numbers out. */
export type PageHeaderStatsLayout = 'stacked' | 'inline';

export interface PageHeaderStatsProps extends PageHeaderProps {
  /**
   * `stacked` puts the label under the figure, for a row of counts read as a
   * set. `inline` runs them together — "533 Followers" — for counts read as
   * part of a sentence.
   */
  layout?: PageHeaderStatsLayout;
  /** Rule between each count and the next. */
  divided?: boolean;
  children?: ReactNode;
}

/**
 * The row of counts. `stacked` spreads them evenly, because a row of figures
 * that are read against each other has to be measured against each other.
 */
const PageHeaderStats = forwardRef<View, PageHeaderStatsProps>(
  ({ className, layout = 'stacked', divided, children, ...props }, ref) => {
    const { variant, align } = usePageHeader('PageHeader.Stats');
    const spread = layout === 'stacked';

    // React Native has no `:first-child`, so the rule between two counts
    // cannot be a style rule. Place it on every count but the first.
    const items = divided
      ? Children.map(children, (child, index) => {
          if (!isValidElement<PageHeaderStatProps>(child)) return child;
          if (child.type !== PageHeaderStat) return child;
          if (child.props.divided !== undefined) return child;
          return cloneElement(child, { divided: index > 0 });
        })
      : children;

    return (
      <View
        {...props}
        ref={ref}
        className={pageHeaderVariants({ variant, align }).stats({
          className: cn(spread ? 'gap-6' : 'gap-4', className),
        })}
      >
        <PageHeaderStatsContext.Provider value={layout}>
          {items}
        </PageHeaderStatsContext.Provider>
      </View>
    );
  }
);
PageHeaderStats.displayName = 'PageHeader.Stats';

export interface PageHeaderStatProps extends Omit<PressableProps, 'children'> {
  className?: string;
  /** The figure. */
  value: ReactNode;
  /** What it counts. */
  label: ReactNode;
  /** Rule before this count. `PageHeader.Stats` sets it; pass it to override. */
  divided?: boolean;
}

/**
 * One count. Announced as a single thing — "533 Followers" — because a figure
 * and its label read apart are two pieces of nothing.
 */
const PageHeaderStat = forwardRef<View, PageHeaderStatProps>(
  ({ className, value, label, divided, onPress, accessibilityLabel, ...props }, ref) => {
    const layout = useContext(PageHeaderStatsContext);
    const inline = layout === 'inline';

    const spoken =
      accessibilityLabel ??
      (isSpeakable(value) && isSpeakable(label) ? `${value} ${label}` : undefined);

    const classes = cn(
      inline ? 'flex-row items-center gap-1' : 'items-center gap-0.5',
      divided && 'border-s border-border ps-4',
      className
    );

    const body = (
      <>
        <Text size="sm" weight="semibold">
          {value}
        </Text>
        <Text size="sm" muted>
          {label}
        </Text>
      </>
    );

    if (!onPress) {
      return (
        <View
          {...(props as ViewProps)}
          ref={ref}
          accessible
          accessibilityLabel={spoken}
          className={classes}
        >
          {body}
        </View>
      );
    }

    return (
      <AnimatedPressable
        {...props}
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        onPress={onPress}
        className={classes}
      >
        {body}
      </AnimatedPressable>
    );
  }
);
PageHeaderStat.displayName = 'PageHeader.Stat';

/** Whether a node can be read into an accessibility label as it stands. */
function isSpeakable(node: ReactNode): node is string | number {
  return typeof node === 'string' || typeof node === 'number';
}

export interface PageHeaderActionsProps extends PageHeaderProps {
  children?: ReactNode;
}

/**
 * What you can do about the account. Give the buttons `className="flex-1"` for
 * the pair that splits the width evenly.
 */
const PageHeaderActions = forwardRef<View, PageHeaderActionsProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, align } = usePageHeader('PageHeader.Actions');
    return (
      <View
        {...props}
        ref={ref}
        className={pageHeaderVariants({ variant, align }).actions({ className })}
      >
        {textChildren(children)}
      </View>
    );
  }
);
PageHeaderActions.displayName = 'PageHeader.Actions';

export const PageHeader = Object.assign(PageHeaderRoot, {
  Cover: PageHeaderCover,
  Avatar: PageHeaderAvatar,
  Row: PageHeaderRow,
  Content: PageHeaderContent,
  Title: PageHeaderTitle,
  Description: PageHeaderDescription,
  Meta: PageHeaderMeta,
  Stats: PageHeaderStats,
  Stat: PageHeaderStat,
  Actions: PageHeaderActions,
});
