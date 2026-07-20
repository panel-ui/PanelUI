/**
 * Minimal declaration for `expo-clipboard`, which `useCopyToClipboard` loads
 * lazily.
 *
 * It is an *optional* peer dependency: React Native removed Clipboard from
 * core, and requiring a native module for one hook would cost every consumer
 * who never calls it. Without this shim the library would not typecheck
 * unless the package were installed here.
 *
 * It lives outside `src/` on purpose — bob compiles `src` only, so this is
 * never emitted to `lib/typescript/` and cannot shadow the real types in a
 * consumer's project.
 */
declare module 'expo-clipboard' {
  export function setStringAsync(text: string): Promise<boolean>;
  export function getStringAsync(): Promise<string>;
}
