import { useWindowDimensions } from 'react-native';

/** Tailwind's breakpoints, minus the ones no phone or tablet reaches. */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export interface UseBreakpointResult {
  /** Largest breakpoint the window currently satisfies, or `base`. */
  current: Breakpoint | 'base';
  /** True when the window is at least this wide. */
  isAtLeast: (breakpoint: Breakpoint) => boolean;
  width: number;
  height: number;
  isLandscape: boolean;
}

/**
 * Responsive state from the window size — the React Native answer to
 * coss.com/ui's `useMediaQuery`, which has no equivalent here.
 *
 * For styling, prefer Uniwind's responsive class prefixes (`md:flex-row`).
 * Reach for this when the *behaviour* changes, not just the look — rendering
 * a sheet on a phone and a dialog on a tablet, say.
 *
 * ```tsx
 * const { isAtLeast } = useBreakpoint();
 * return isAtLeast('md') ? <Dialog …/> : <BottomSheet …/>;
 * ```
 */
export function useBreakpoint(): UseBreakpointResult {
  const { width, height } = useWindowDimensions();

  const current: Breakpoint | 'base' =
    width >= BREAKPOINTS.xl
      ? 'xl'
      : width >= BREAKPOINTS.lg
        ? 'lg'
        : width >= BREAKPOINTS.md
          ? 'md'
          : width >= BREAKPOINTS.sm
            ? 'sm'
            : 'base';

  return {
    current,
    isAtLeast: (breakpoint) => width >= BREAKPOINTS[breakpoint],
    width,
    height,
    isLandscape: width > height,
  };
}
