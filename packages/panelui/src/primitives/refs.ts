import type { ComponentRef } from 'react';
import type { Text, TextInput, View } from 'react-native';

/*
 * The types a forwarded ref points at.
 *
 * React Native's `View`, `Text` and `TextInput` were declared as classes up to
 * 0.86 and as function components from 0.88, so naming one as a ref's type —
 * `forwardRef<View, …>` — compiles on one and fails on the other.
 * `ComponentRef<typeof X>` reads the instance type off whichever declaration is
 * installed, so these compile on both and keep the instance methods (`focus`,
 * `blur`, `measure`, …) on the ref.
 */

/** What a ref on a `View`-rooted component points at. */
export type ViewRef = ComponentRef<typeof View>;

/** What a ref on a `Text`-rooted component points at. */
export type TextRef = ComponentRef<typeof Text>;

/** What a ref on a `TextInput`-rooted component points at: `focus()`, `clear()`, `isFocused()`. */
export type TextInputRef = ComponentRef<typeof TextInput>;
