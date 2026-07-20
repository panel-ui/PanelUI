/**
 * InputGroup — an Input with leading and/or trailing decorators.
 *
 * Adapted from: heroui-inc/heroui-native src/components/input-group/
 * Prefix and Suffix are absolutely positioned and their measured widths become
 * padding on the Input, so text never runs underneath a decorator regardless
 * of how wide that decorator turns out to be.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  View,
  type LayoutChangeEvent,
  type TextInput,
  type ViewProps,
} from 'react-native';
import { tv } from 'tailwind-variants';
import { Input, type InputProps } from '../input';

const inputGroupVariants = tv({
  slots: {
    root: 'w-full',
    prefix: 'absolute bottom-0 left-0 top-0 z-10 flex-row items-center justify-center gap-2 px-3',
    suffix: 'absolute bottom-0 right-0 top-0 z-10 flex-row items-center justify-center gap-2 px-3',
  },
  variants: {
    isDisabled: {
      true: { prefix: 'opacity-[0.64]', suffix: 'opacity-[0.64]' },
    },
  },
});

interface InputGroupState {
  isDisabled: boolean;
  prefixWidth: number;
  suffixWidth: number;
  setPrefixWidth: (width: number) => void;
  setSuffixWidth: (width: number) => void;
}

const InputGroupContext = createContext<InputGroupState | null>(null);

function useInputGroup() {
  return useContext(InputGroupContext);
}

export interface InputGroupProps extends ViewProps {
  className?: string;
  /** Disables the input and dims both decorators. */
  isDisabled?: boolean;
  children?: ReactNode;
}

const InputGroupRoot = forwardRef<View, InputGroupProps>(
  ({ className, isDisabled = false, children, ...props }, ref) => {
    const { root } = inputGroupVariants();
    const [prefixWidth, setPrefixWidth] = useState(0);
    const [suffixWidth, setSuffixWidth] = useState(0);

    const value = useMemo<InputGroupState>(
      () => ({ isDisabled, prefixWidth, suffixWidth, setPrefixWidth, setSuffixWidth }),
      [isDisabled, prefixWidth, suffixWidth]
    );

    return (
      <InputGroupContext.Provider value={value}>
        <View ref={ref} className={root({ className })} {...props}>
          {children}
        </View>
      </InputGroupContext.Provider>
    );
  }
);
InputGroupRoot.displayName = 'InputGroup';

export interface InputGroupDecoratorProps extends ViewProps {
  className?: string;
  /**
   * Marks the decorator as presentation-only: touches fall through to the
   * Input and screen readers skip it. Leave it off when the decorator holds
   * something interactive, such as a show-password toggle.
   */
  isDecorative?: boolean;
  children?: ReactNode;
}

/** Builds Prefix/Suffix, which differ only in which side they measure. */
function createDecorator(side: 'prefix' | 'suffix') {
  const Decorator = forwardRef<View, InputGroupDecoratorProps>(
    ({ className, isDecorative = false, onLayout, children, ...props }, ref) => {
      const group = useInputGroup();
      const slots = inputGroupVariants({ isDisabled: group?.isDisabled ?? false });
      const setWidth = side === 'prefix' ? group?.setPrefixWidth : group?.setSuffixWidth;

      const handleLayout = useCallback(
        (event: LayoutChangeEvent) => {
          setWidth?.(event.nativeEvent.layout.width);
          onLayout?.(event);
        },
        [setWidth, onLayout]
      );

      return (
        <View
          ref={ref}
          onLayout={handleLayout}
          pointerEvents={isDecorative ? 'none' : 'auto'}
          accessibilityElementsHidden={isDecorative}
          importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'auto'}
          className={slots[side]({ className })}
          {...props}
        >
          {children}
        </View>
      );
    }
  );
  Decorator.displayName = side === 'prefix' ? 'InputGroup.Prefix' : 'InputGroup.Suffix';
  return Decorator;
}

const InputGroupPrefix = createDecorator('prefix');
const InputGroupSuffix = createDecorator('suffix');

export type InputGroupInputProps = InputProps;

/**
 * The Input itself. Receives left/right padding matching the measured
 * decorator widths, so its text always clears them.
 */
const InputGroupInput = forwardRef<TextInput, InputGroupInputProps>(
  ({ style, disabled, ...props }, ref) => {
    const group = useInputGroup();

    return (
      <Input
        ref={ref}
        disabled={disabled ?? group?.isDisabled}
        style={[
          // Only override padding on the side that actually has a decorator —
          // a 0 here would wipe out the field's default horizontal padding.
          group?.prefixWidth ? { paddingLeft: group.prefixWidth } : null,
          group?.suffixWidth ? { paddingRight: group.suffixWidth } : null,
          style,
        ]}
        {...props}
      />
    );
  }
);
InputGroupInput.displayName = 'InputGroup.Input';

export const InputGroup = Object.assign(InputGroupRoot, {
  Prefix: InputGroupPrefix,
  Input: InputGroupInput,
  Suffix: InputGroupSuffix,
});
