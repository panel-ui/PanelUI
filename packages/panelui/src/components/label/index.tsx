/**
 * Label — text that names a form field.
 *
 * Adapted from: heroui-inc/heroui-native src/components/label/ (root +
 * Label.Text anatomy, string children auto-wrapping, the required asterisk,
 * and the isInvalid / isDisabled recolouring).
 */
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { Text, type TextProps } from '../../primitives/text';

const labelVariants = tv({
  slots: {
    root: 'flex-row items-center gap-1',
    text: 'text-sm font-medium text-foreground',
    asterisk: 'text-sm font-medium text-destructive',
  },
  variants: {
    isDisabled: {
      true: {
        root: 'opacity-[0.64]',
        asterisk: 'text-muted-foreground',
      },
    },
    isInvalid: {
      true: { text: 'text-destructive' },
    },
  },
});

interface LabelState {
  isRequired: boolean;
  isInvalid: boolean;
  isDisabled: boolean;
}

const LabelContext = createContext<LabelState>({
  isRequired: false,
  isInvalid: false,
  isDisabled: false,
});

export interface LabelProps extends ViewProps {
  className?: string;
  /** Appends an asterisk marking the field as required. */
  isRequired?: boolean;
  /** Recolours the label to signal a validation error. */
  isInvalid?: boolean;
  isDisabled?: boolean;
  children?: ReactNode;
}

const LabelRoot = forwardRef<View, LabelProps>(
  (
    {
      className,
      isRequired = false,
      isInvalid = false,
      isDisabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const { root } = labelVariants({ isDisabled, isInvalid });
    const state = useMemo(
      () => ({ isRequired, isInvalid, isDisabled }),
      [isRequired, isInvalid, isDisabled]
    );

    return (
      <LabelContext.Provider value={state}>
        <View
          ref={ref}
          className={root({ className })}
          accessibilityState={{ disabled: isDisabled }}
          {...props}
        >
          {/* Bare strings are the common case — wrap them so callers don't have to. */}
          {typeof children === 'string' ? <LabelText>{children}</LabelText> : children}
        </View>
      </LabelContext.Provider>
    );
  }
);
LabelRoot.displayName = 'Label';

export interface LabelTextProps extends TextProps {
  className?: string;
  /** Classes for the required asterisk. */
  asteriskClassName?: string;
}

const LabelText = forwardRef<RNText, LabelTextProps>(
  ({ className, asteriskClassName, children, ...props }, ref) => {
    const { isRequired, isInvalid, isDisabled } = useContext(LabelContext);
    const { text, asterisk } = labelVariants({ isDisabled, isInvalid });

    return (
      <>
        <Text ref={ref} className={text({ className })} {...props}>
          {children}
        </Text>
        {isRequired ? (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className={asterisk({ className: asteriskClassName })}
          >
            *
          </Text>
        ) : null}
      </>
    );
  }
);
LabelText.displayName = 'Label.Text';

export const Label = Object.assign(LabelRoot, {
  Text: LabelText,
});
