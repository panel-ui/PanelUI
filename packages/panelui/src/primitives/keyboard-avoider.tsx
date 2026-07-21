/**
 * KeyboardAvoider — a view that lifts itself just clear of the keyboard.
 *
 * A thin wrapper over `useKeyboardAvoidance` for the common case of "keep this
 * box visible", so a form does not have to wire the ref, layout handler and
 * animated style by hand.
 */
import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useKeyboardAvoidance } from '../hooks/use-keyboard-avoidance';

export interface KeyboardAvoiderProps extends ViewProps {
  className?: string;
  /** Set false to leave the content where it is. */
  enabled?: boolean;
  /** Gap to keep between the content's bottom edge and the keyboard. */
  offset?: number;
  children?: ReactNode;
}

export function KeyboardAvoider({
  className,
  enabled = true,
  offset = 16,
  children,
  style,
  onLayout,
  ...props
}: KeyboardAvoiderProps) {
  const avoidance = useKeyboardAvoidance({ enabled, offset });

  return (
    <Animated.View
      {...props}
      ref={avoidance.ref}
      onLayout={(event) => {
        avoidance.onLayout(event);
        onLayout?.(event);
      }}
      className={className}
      style={[style, avoidance.animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

KeyboardAvoider.displayName = 'KeyboardAvoider';
