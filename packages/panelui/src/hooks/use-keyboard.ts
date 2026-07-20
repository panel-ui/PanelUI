import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export interface UseKeyboardResult {
  /** Height of the keyboard in px, or 0 when hidden. */
  height: number;
  isVisible: boolean;
}

/**
 * Keyboard height and visibility, on the JS thread.
 *
 * Use this when the value drives rendering — showing a hint, swapping a
 * layout. For *animating* against the keyboard, use Reanimated's
 * `useAnimatedKeyboard` instead: it runs on the UI thread and tracks the
 * keyboard frame-for-frame, where this fires once per show/hide.
 *
 * ```tsx
 * const { isVisible } = useKeyboard();
 * {isVisible ? null : <Footer />}
 * ```
 */
export function useKeyboard(): UseKeyboardResult {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS reports the frame before it animates; Android only on completion.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) =>
      setHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { height, isVisible: height > 0 };
}
