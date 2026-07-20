/**
 * Typography — semantic text presets.
 *
 * Adapted from: heroui-inc/heroui-native (Typography `type` scale and the
 * Heading / Paragraph / Code compound parts), built on PanelUI's Text
 * primitive so every preset keeps `className` passthrough and theme colours.
 */
import { forwardRef } from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text, type TextProps } from '../../primitives/text';

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
      body: 'text-base font-normal',
      'body-sm': 'text-sm font-normal',
      'body-xs': 'text-xs font-normal',
      code: 'font-mono text-sm text-foreground',
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

export interface TypographyProps
  extends Omit<TextProps, 'size' | 'weight'>,
    VariantProps<typeof typographyVariants> {
  className?: string;
}

/** Heading levels, for `Typography.Heading`. */
type HeadingType = Extract<TypographyType, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>;
/** Body sizes, for `Typography.Paragraph`. */
type ParagraphType = Extract<TypographyType, 'body' | 'body-sm' | 'body-xs'>;

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
  ({ className, type, muted, ...props }, ref) => (
    <Text ref={ref} className={typographyVariants({ type, muted, className })} {...props} />
  )
);
TypographyRoot.displayName = 'Typography';

export interface TypographyHeadingProps extends Omit<TypographyProps, 'type'> {
  type?: HeadingType;
}

/** Heading text, wired up with the matching accessibility heading level. */
const TypographyHeading = forwardRef<RNText, TypographyHeadingProps>(
  ({ className, type = 'h2', muted, ...props }, ref) => (
    <Text
      ref={ref}
      accessibilityRole="header"
      aria-level={HEADING_LEVEL[type]}
      className={typographyVariants({ type, muted, className })}
      {...props}
    />
  )
);
TypographyHeading.displayName = 'Typography.Heading';

export interface TypographyParagraphProps extends Omit<TypographyProps, 'type'> {
  type?: ParagraphType;
}

const TypographyParagraph = forwardRef<RNText, TypographyParagraphProps>(
  ({ className, type = 'body', muted, ...props }, ref) => (
    <Text ref={ref} className={typographyVariants({ type, muted, className })} {...props} />
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
      className={`self-start rounded-md bg-muted px-1.5 py-1 ${containerClassName ?? ''}`}
    >
      <Text className={typographyVariants({ type: 'code', muted, className })} {...props} />
    </View>
  )
);
TypographyCode.displayName = 'Typography.Code';

export const Typography = Object.assign(TypographyRoot, {
  Heading: TypographyHeading,
  Paragraph: TypographyParagraph,
  Code: TypographyCode,
});
