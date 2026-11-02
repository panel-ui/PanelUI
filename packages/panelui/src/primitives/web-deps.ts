import { Platform } from 'react-native';

/**
 * A dependency list for a Reanimated hook, on the web only.
 *
 * On iOS and Android the Babel plugin works out what a worklet closes over,
 * and Reanimated ignores a dependency list there; from 4.7 it also warns about
 * one in development. On the web there is no plugin, and the list is how the
 * hook knows to rebuild. Passing the list through this keeps the web right and
 * the native console quiet.
 */
export function webDeps(deps: unknown[]): unknown[] | undefined {
  return Platform.OS === 'web' ? deps : undefined;
}
