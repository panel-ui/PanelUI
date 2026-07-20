/**
 * Icon set.
 *
 * Two families live here:
 * - Stroked 24×24 icons (Lucide geometry, as used by shadcn-ui/ui) for chrome
 *   such as chevrons and the close button.
 * - Filled 16×16 status icons for Alert and Toast indicators.
 *   Adapted from: heroui-inc/heroui-native src/components/alert/{default,success,warning}-icon.tsx
 *
 * `color` has no default on the status icons on purpose — callers resolve it
 * from the active theme with `useCSSVariable`, so icons follow the theme
 * instead of a hardcoded hex.
 */
import Svg, { Circle, Path, type SvgProps } from 'react-native-svg';

export interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

/** Props for icons that must never be announced by a screen reader. */
const decorative = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/* -------------------------------------------------------------------------- */
/* Stroked chrome icons                                                       */
/* -------------------------------------------------------------------------- */

export function CheckIcon({ size = 14, color = '#fff', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M20 6 9 17l-5-5"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 16, color = '#737373', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="m6 9 6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 16, color = '#737373', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="m15 18-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 16, color = '#737373', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="m9 18 6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function XIcon({ size = 16, color = '#737373', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M18 6 6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({ size = 16, color = '#737373', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={2} />
      <Path
        d="m21 21-4.3-4.3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowUpRightIcon({ size = 20, color = '#fff', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M7 17 17 7M8 7h9v9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SunIcon({ size = 18, color = '#f5f5f5', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} />
      <Path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoonIcon({ size = 18, color = '#262626', ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Filled status icons (Alert / Toast indicators)                             */
/* -------------------------------------------------------------------------- */

/** Info circle. Used for `default`, `info` and `destructive` status. */
export function InfoIcon({ size = 20, color, ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color} {...decorative} {...props}>
      <Path
        d="M8 13.5a5.5 5.5 0 1 0 0-11a5.5 5.5 0 0 0 0 11M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14m1-9.5a1 1 0 1 1-2 0a1 1 0 0 1 2 0m-.25 3a.75.75 0 0 0-1.5 0V11a.75.75 0 0 0 1.5 0z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
}

/** Check circle. Used for `success` status. */
export function CheckCircleIcon({ size = 20, color, ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color} {...decorative} {...props}>
      <Path
        d="M13.5 8a5.5 5.5 0 1 1-11 0a5.5 5.5 0 0 1 11 0M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0m-3.9-1.55a.75.75 0 1 0-1.2-.9L7.419 8.858L6.03 7.47a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.13-.08z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
}

/** Warning triangle. Used for `warning` status. */
export function AlertTriangleIcon({ size = 20, color, ...props }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={color} {...decorative} {...props}>
      <Path
        d="M7.134 2.994L2.217 11.5a1 1 0 0 0 .866 1.5h9.834a1 1 0 0 0 .866-1.5L8.866 2.993a1 1 0 0 0-1.732 0m3.03-.75c-.962-1.665-3.366-1.665-4.329 0L.918 10.749c-.963 1.666.24 3.751 2.165 3.751h9.834c1.925 0 3.128-2.085 2.164-3.751zM8 5a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 8 5m1 5.75a1 1 0 1 1-2 0a1 1 0 0 1 2 0"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
}
