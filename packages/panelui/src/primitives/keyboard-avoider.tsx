/**
 * KeyboardAvoider — a view that keeps itself clear of the keyboard.
 *
 * A thin wrapper over `useKeyboardAvoidance` for the common case of "keep this
 * box visible", so a form does not have to wire the ref, layout handler and
 * animated style by hand.
 *
 * ```tsx
 * // In the flow of a scrolling page: lifts by the overlap, follows the scroll.
 * <KeyboardAvoider active={focused}>…</KeyboardAvoider>
 *
 * // Pinned to the bottom edge: rides the keyboard up and back down.
 * <KeyboardAvoider
 *   mode="dock"
 *   bottomInset={insets.bottom}
 *   className="absolute left-0 right-0"
 *   style={{ bottom: insets.bottom + 16 }}
 * >
 *   …
 * </KeyboardAvoider>
 * ```
 */
import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  useKeyboardAvoidance,
  type KeyboardAvoidanceMode,
} from '../hooks/use-keyboard-avoidance';

export interface KeyboardAvoiderProps extends ViewProps {
  className?: string;
  /** Set false to leave the content where it is. */
  enabled?: boolean;
  /**
   * Whether this is the element that should get out of the keyboard's way.
   * Defaults to true, which is right for a composer or a toolbar. Pass a
   * field's focus state when wrapping a single field, so the others on the
   * screen stay put.
   */
  active?: boolean;
  /**
   * `lift` moves in-flow content up by its overlap with the keyboard and keeps
   * tracking it as the page scrolls. `dock` travels with the keyboard, for a
   * bar already pinned near the bottom edge.
   */
  mode?: KeyboardAvoidanceMode;
  /** Gap to keep between the content's bottom edge and the keyboard. `lift` only. */
  offset?: number;
  /**
   * How far above the bottom edge the bar already sits — usually the safe area
   * inset it is positioned by. `dock` only.
   */
  bottomInset?: number;
  children?: ReactNode;
}

export function KeyboardAvoider({
  className,
  enabled = true,
  active = true,
  mode = 'lift',
  offset = 16,
  bottomInset = 0,
  children,
  style,
  onLayout,
  ...props
}: KeyboardAvoiderProps) {
  const avoidance = useKeyboardAvoidance({
    enabled,
    active,
    mode,
    offset,
    bottomInset,
  });

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
