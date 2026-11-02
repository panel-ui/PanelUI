/**
 * InputGroup — an Input with leading and/or trailing decorators.
 *
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
import { textChildren } from '../../primitives/text';
import {
  useInputGroupDecoratorMeasurement,
  useInputGroupMeasurements,
  type InputGroupDecoratorOwner,
  type InputGroupDecoratorSide,
} from './input-group-measurements';
import type { TextInputRef, ViewRef } from '../../primitives/refs';

const inputGroupVariants = tv({
  slots: {
    root: 'w-full',
    prefix: 'absolute bottom-0 start-0 top-0 z-10 flex-row items-center justify-center gap-2 px-3',
    suffix: 'absolute bottom-0 end-0 top-0 z-10 flex-row items-center justify-center gap-2 px-3',
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
  measureDecorator: (
    side: InputGroupDecoratorSide,
    owner: InputGroupDecoratorOwner,
    width: number
  ) => void;
  removeDecorator: (
    side: InputGroupDecoratorSide,
    owner: InputGroupDecoratorOwner
  ) => void;
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

const InputGroupRoot = forwardRef<ViewRef, InputGroupProps>(
  ({ className, isDisabled = false, children, ...props }, ref) => {
    const { root } = inputGroupVariants();
    const { prefixWidth, suffixWidth, measureDecorator, removeDecorator } =
      useInputGroupMeasurements();

    const value = useMemo<InputGroupState>(
      () => ({
        isDisabled,
        prefixWidth,
        suffixWidth,
        measureDecorator,
        removeDecorator,
      }),
      [
        isDisabled,
        prefixWidth,
        suffixWidth,
        measureDecorator,
        removeDecorator,
      ]
    );

    return (
      <InputGroupContext.Provider value={value}>
        <View ref={ref} className={root({ className })} {...props}>
          {textChildren(children)}
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
  const Decorator = forwardRef<ViewRef, InputGroupDecoratorProps>(
    ({ className, isDecorative = false, onLayout, children, ...props }, ref) => {
      const group = useInputGroup();
      const slots = inputGroupVariants({ isDisabled: group?.isDisabled ?? false });
      const measure = useInputGroupDecoratorMeasurement(
        side,
        group?.measureDecorator,
        group?.removeDecorator
      );

      const handleLayout = useCallback(
        (event: LayoutChangeEvent) => {
          measure(event.nativeEvent.layout.width);
          onLayout?.(event);
        },
        [measure, onLayout]
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
          {textChildren(children)}
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
const InputGroupInput = forwardRef<TextInputRef, InputGroupInputProps>(
  ({ style, disabled, ...props }, ref) => {
    const group = useInputGroup();

    return (
      <Input
        ref={ref}
        disabled={disabled ?? group?.isDisabled}
        style={[
          // Only override padding on the side that actually has a decorator —
          // a 0 here would wipe out the field's default horizontal padding.
          //
          // `paddingStart`/`paddingEnd`, not left/right: the decorators are
          // inset with `start-0`/`end-0`, so under `Direction dir="rtl"` Yoga
          // moves them to the other edge. Physical padding stays where it was
          // written and leaves the value running underneath them.
          group?.prefixWidth ? { paddingStart: group.prefixWidth } : null,
          group?.suffixWidth ? { paddingEnd: group.suffixWidth } : null,
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
