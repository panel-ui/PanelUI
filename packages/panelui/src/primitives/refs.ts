import type { ComponentRef } from 'react';
import type { FlatListProps, ScrollView, Text, TextInput, TextInputProps, View } from 'react-native';

/*
 * The types a forwarded ref points at.
 *
 * React Native's `View`, `Text` and `TextInput` were declared as classes up to
 * 0.86 and as function components from 0.88, so naming one as a ref's type —
 * `forwardRef<View, …>` — compiles on one and fails on the other.
 * `ComponentRef<typeof X>` reads the instance type off whichever declaration is
 * installed, so these compile on both and keep the instance methods (`focus`,
 * `blur`, `measure`, …) on the ref.
 *
 * They are interfaces rather than type aliases so the published declarations
 * can name them: on 0.88 the type they resolve to lives in a private path of
 * React Native that a declaration file cannot import.
 */

/** What a ref on a `View`-rooted component points at. */
export interface ViewRef extends ComponentRef<typeof View> {}

/** What a ref on a `Text`-rooted component points at. */
export interface TextRef extends ComponentRef<typeof Text> {}

/** What a ref on a `TextInput`-rooted component points at: `focus()`, `clear()`, `isFocused()`. */
export interface TextInputRef extends ComponentRef<typeof TextInput> {}

/** What a ref on a `ScrollView` points at: `scrollTo`, `scrollToEnd`, `flashScrollIndicators`. */
export interface ScrollViewRef extends ComponentRef<typeof ScrollView> {}

/*
 * Event and list types React Native 0.88 renamed or removed. Each is read off
 * a prop both versions share, so the library compiles against either.
 */

/** The event `TextInput`'s `onKeyPress` receives. */
export type KeyPressEvent = Parameters<NonNullable<TextInputProps['onKeyPress']>>[0];
/** The event `TextInput`'s `onSubmitEditing` receives. */
export type SubmitEditingEvent = Parameters<NonNullable<TextInputProps['onSubmitEditing']>>[0];
/** The event `TextInput`'s `onSelectionChange` receives. */
export type SelectionChangeEvent = Parameters<NonNullable<TextInputProps['onSelectionChange']>>[0];
/** The event `TextInput`'s `onContentSizeChange` receives. */
export type ContentSizeChangeEvent = Parameters<NonNullable<TextInputProps['onContentSizeChange']>>[0];
/** One entry of what a list reports as visible. */
export type ViewTokenOf<T> = Parameters<NonNullable<FlatListProps<T>['onViewableItemsChanged']>>[0]['viewableItems'][number];
