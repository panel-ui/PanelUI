import { Children, forwardRef, type ReactElement, type ReactNode } from 'react';
import { Text as RNText, type Text as RNTextType, type TextProps as RNTextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useDirection } from '../hooks/use-direction';

const textVariants = tv({
  base: 'text-foreground',
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    muted: {
      true: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    size: 'base',
    weight: 'normal',
  },
});

export interface TextProps extends RNTextProps, VariantProps<typeof textVariants> {
  className?: string;
}

export const Text = forwardRef<RNTextType, TextProps>(
  ({ className, size, weight, muted, style, ...props }, ref) => {
    /*
     * `direction` is a Yoga *layout* property, and React Native resolves a
     * paragraph's own alignment from the process-wide `I18nManager.isRTL`
     * instead — so a `<Direction dir="rtl">` mirrors the furniture around this
     * text and leaves the text itself left-aligned inside it. Setting
     * `writingDirection` is what closes that gap, and it also puts bidi
     * punctuation on the correct end of a mixed line.
     *
     * Only the direction, not the alignment: `textAlign` stays whatever the
     * caller asked for, or unset. A component that centres its label means it
     * in both directions.
     */
    const direction = useDirection();

    return (
      <RNText
        ref={ref}
        className={textVariants({ size, weight, muted, className })}
        style={[{ writingDirection: direction }, style]}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';

/**
 * Wraps the bare text among `children` so it can live in a plain view.
 *
 * React Native will not render a string outside a `<Text>`, and a component
 * that takes `children` has no say in whether it is handed one — so anything
 * putting `children` into a `View`, a `Pressable` or a scroller has to allow
 * for it. Every part in the library that does runs its children through here.
 *
 * Per child, and not all-or-nothing. A part is nearly always given an element
 * and some text together — an icon and a label, an arrow and a line of text —
 * which makes `children` an *array*, so a `typeof children === 'string'` check
 * never matches and the text underneath reaches the view bare. That is the
 * shape this exists to make impossible.
 *
 * `render` is there because the wrapper is rarely the plain default: a button
 * wants its own label variant, a sheet header wants a heading. Pass one, and
 * the text arrives dressed the way the part would have dressed it anyway.
 */
export function textChildren(
  children: ReactNode,
  render: (text: string | number) => ReactElement = (text) => <Text>{text}</Text>
): ReactNode {
  return Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' ? render(child) : child
  );
}

/**
 * The words among `children`, for a part that needs an accessibility label of
 * its own — or `undefined` when the children are not all text.
 *
 * Android needs the label. React Native writes a state such as `busy` into a
 * view's content description, and it rebuilds that description only when
 * there is something to put in it. A view with no label that stops being busy
 * has nothing to rebuild from, so it keeps saying "busy" and never reads its
 * text again.
 *
 * All or nothing, unlike `textChildren`. An element among the children might
 * carry words of its own, such as a count in a badge. A label built from the
 * text beside it would leave those out, and a screen reader that already reads
 * them would stop.
 */
export function textLabel(children: ReactNode): string | undefined {
  const parts = Children.toArray(children);
  if (!parts.length) return undefined;
  if (!parts.every((part) => typeof part === 'string' || typeof part === 'number')) {
    return undefined;
  }
  const label = parts.join('').trim();
  return label || undefined;
}
