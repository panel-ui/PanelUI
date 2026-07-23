/**
 * Typography — semantic text presets, and the marks that go on them.
 *
 * The type scale in one place, so headings stay consistent instead of being
 * rebuilt out of size and weight classes at each call site. Built on the Text
 * primitive, so every preset keeps `className` passthrough and theme colours.
 *
 * ```tsx
 * <Typography type="h2">Billing</Typography>
 * <Typography>Your plan renews on the 1st.</Typography>
 * <Typography underline>Terms of service</Typography>
 * ```
 *
 * A preset sets size, weight and tracking together; the marks — `underline`,
 * `italic`, `strike` — and `weight`, `align` and `transform` layer on top of
 * whichever preset is in force. They are props rather than class names because
 * the point of this component is that a screen never has to know which
 * utilities add up to "a bolded lead paragraph".
 *
 * React Native draws no list markers and has no blockquote, so
 * `Typography.List` and `Typography.Blockquote` build both out of a row and a
 * rule — which is exactly the kind of thing this component exists to stop
 * people rebuilding per screen.
 */
import { Children, forwardRef, type ReactNode } from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

const typographyVariants = tv({
  base: 'text-foreground',
  variants: {
    type: {
      h1: 'text-4xl font-bold tracking-tight',
      h2: 'text-3xl font-semibold tracking-tight',
      h3: 'text-2xl font-semibold tracking-tight',
      h4: 'text-xl font-semibold',
      h5: 'text-lg font-semibold',
      h6: 'text-base font-semibold',
      /** The sentence under a heading, set larger and quieter than body. */
      lead: 'text-xl font-normal text-muted-foreground',
      body: 'text-base font-normal',
      'body-sm': 'text-sm font-normal',
      'body-xs': 'text-xs font-normal',
      /** Body, one step up — for a number or a name that carries the row. */
      large: 'text-lg font-semibold',
      /** Body, one step down and tighter — captions, footnotes, meta. */
      small: 'text-sm font-medium leading-none',
      blockquote: 'text-base font-normal italic',
      code: 'font-mono text-sm text-foreground',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    transform: {
      uppercase: 'uppercase',
      lowercase: 'lowercase',
      capitalize: 'capitalize',
    },
    underline: {
      true: 'underline',
    },
    italic: {
      true: 'italic',
    },
    strike: {
      true: 'line-through',
    },
    muted: {
      true: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    type: 'body',
  },
});

export type TypographyType = NonNullable<
  VariantProps<typeof typographyVariants>['type']
>;

export type TypographyWeight = NonNullable<
  VariantProps<typeof typographyVariants>['weight']
>;

export interface TypographyProps
  extends Omit<TextProps, 'size' | 'weight'>,
    VariantProps<typeof typographyVariants> {
  className?: string;
  /**
   * Overrides the weight the preset sets. This is the one to reach for when a
   * paragraph needs a bolded run and a heading would be wrong.
   */
  weight?: TypographyWeight;
  /** Underlines the text — a link, a defined term, a signature line. */
  underline?: boolean;
  /** Slants the text. */
  italic?: boolean;
  /** Strikes the text through: an old price, a completed task. */
  strike?: boolean;
  /** Horizontal alignment within whatever the text is laid out in. */
  align?: 'left' | 'center' | 'right';
  /** Case, applied for display without changing the string underneath. */
  transform?: 'uppercase' | 'lowercase' | 'capitalize';
}

/** Heading levels, for `Typography.Heading`. */
type HeadingType = Extract<TypographyType, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>;
/** Body sizes, for `Typography.Paragraph`. */
type ParagraphType = Extract<
  TypographyType,
  'body' | 'body-sm' | 'body-xs' | 'lead' | 'large' | 'small'
>;

/** Maps a heading preset to its accessibility heading level. */
const HEADING_LEVEL: Record<HeadingType, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

const TypographyRoot = forwardRef<RNText, TypographyProps>(
  (
    { className, type, muted, weight, align, transform, underline, italic, strike, ...props },
    ref
  ) => (
    <Text
      ref={ref}
      className={typographyVariants({
        type,
        muted,
        weight,
        align,
        transform,
        underline,
        italic,
        strike,
        className,
      })}
      {...props}
    />
  )
);
TypographyRoot.displayName = 'Typography';

export interface TypographyHeadingProps extends Omit<TypographyProps, 'type'> {
  type?: HeadingType;
}

/** Heading text, wired up with the matching accessibility heading level. */
const TypographyHeading = forwardRef<RNText, TypographyHeadingProps>(
  (
    { className, type = 'h2', muted, weight, align, transform, underline, italic, strike, ...props },
    ref
  ) => (
    <Text
      ref={ref}
      accessibilityRole="header"
      aria-level={HEADING_LEVEL[type]}
      className={typographyVariants({
        type,
        muted,
        weight,
        align,
        transform,
        underline,
        italic,
        strike,
        className,
      })}
      {...props}
    />
  )
);
TypographyHeading.displayName = 'Typography.Heading';

export interface TypographyParagraphProps extends Omit<TypographyProps, 'type'> {
  type?: ParagraphType;
}

const TypographyParagraph = forwardRef<RNText, TypographyParagraphProps>(
  (
    { className, type = 'body', muted, weight, align, transform, underline, italic, strike, ...props },
    ref
  ) => (
    <Text
      ref={ref}
      className={typographyVariants({
        type,
        muted,
        weight,
        align,
        transform,
        underline,
        italic,
        strike,
        className,
      })}
      {...props}
    />
  )
);
TypographyParagraph.displayName = 'Typography.Paragraph';

export interface TypographyCodeProps extends Omit<TypographyProps, 'type'> {
  /** Classes for the surface behind the code text. */
  containerClassName?: string;
}

/** Inline code on a muted surface. */
const TypographyCode = forwardRef<View, TypographyCodeProps & Pick<ViewProps, 'testID'>>(
  ({ className, containerClassName, muted, testID, ...props }, ref) => (
    <View
      ref={ref}
      testID={testID}
      className={cn('self-start rounded-md bg-muted px-1.5 py-1', containerClassName)}
    >
      <Text className={typographyVariants({ type: 'code', muted, className })} {...props} />
    </View>
  )
);
TypographyCode.displayName = 'Typography.Code';

export interface TypographyBlockquoteProps extends Omit<TypographyProps, 'type'> {
  /** Classes for the row that carries the rule. */
  containerClassName?: string;
}

/**
 * A quotation, marked by a rule down its leading edge.
 *
 * The rule uses `border-s`, so it moves to the right-hand side under a
 * right-to-left `Direction` without the quote having to know.
 */
const TypographyBlockquote = forwardRef<View, TypographyBlockquoteProps>(
  ({ className, containerClassName, muted, weight, align, transform, underline, italic = true, strike, children, ...props }, ref) => (
    <View ref={ref} className={cn('border-s-2 border-border ps-4', containerClassName)}>
      <Text
        className={typographyVariants({
          type: 'blockquote',
          muted,
          weight,
          align,
          transform,
          underline,
          italic,
          strike,
          className,
        })}
        {...props}
      >
        {children}
      </Text>
    </View>
  )
);
TypographyBlockquote.displayName = 'Typography.Blockquote';

export interface TypographyListProps extends ViewProps {
  className?: string;
  /** Numbered rather than bulleted. The numbers are drawn, not counted by CSS. */
  ordered?: boolean;
  children?: ReactNode;
}

/**
 * A bulleted or numbered list.
 *
 * React Native has no list markers at all, so each row is a marker and a text
 * block side by side. The marker is drawn here rather than in the item, because
 * only the list knows whether it is a bullet or a number — and only the list
 * knows which number.
 */
const TypographyList = forwardRef<View, TypographyListProps>(
  ({ className, ordered = false, children, ...props }, ref) => (
    <View ref={ref} accessibilityRole="list" className={cn('gap-2', className)} {...props}>
      {Children.map(children, (child, index) => (
        <View className="w-full flex-row gap-2">
          {ordered ? (
            <Text className="text-base text-muted-foreground">{index + 1}.</Text>
          ) : (
            // A dot rather than "•": the character's size and baseline vary by
            // platform font, and a view does not.
            <View className="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
          )}
          <View className="flex-1">{child}</View>
        </View>
      ))}
    </View>
  )
);
TypographyList.displayName = 'Typography.List';

export interface TypographyListItemProps extends Omit<TypographyProps, 'type'> {
  type?: ParagraphType;
}

/** One line of a list. The marker beside it belongs to the list. */
const TypographyListItem = forwardRef<RNText, TypographyListItemProps>(
  (
    { className, type = 'body', muted, weight, align, transform, underline, italic, strike, ...props },
    ref
  ) => (
    <Text
      ref={ref}
      className={typographyVariants({
        type,
        muted,
        weight,
        align,
        transform,
        underline,
        italic,
        strike,
        className,
      })}
      {...props}
    />
  )
);
TypographyListItem.displayName = 'Typography.ListItem';

export const Typography = Object.assign(TypographyRoot, {
  Heading: TypographyHeading,
  Paragraph: TypographyParagraph,
  Code: TypographyCode,
  Blockquote: TypographyBlockquote,
  List: TypographyList,
  ListItem: TypographyListItem,
});
