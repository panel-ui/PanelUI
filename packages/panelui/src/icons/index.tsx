/**
 * Icon set.
 *
 * Two families live here:
 * - Stroked 24×24 icons (Lucide geometry, as used by shadcn-ui/ui) for chrome
 *   such as chevrons and the close button.
 * - Filled 16×16 status icons for Alert and Toast indicators.
 *   Adapted from: heroui-inc/heroui-native src/components/alert/{default,success,warning}-icon.tsx
 *
 * Every icon resolves its colour in the same order: an explicit `color` prop,
 * then the colour inherited from an enclosing `IconColorProvider`, then its
 * own fallback. Coloured surfaces such as Button provide the foreground that
 * reads against them, so icons follow the theme without callers hardcoding a
 * hex — which breaks the moment the theme inverts.
 *
 * Brand marks (Google, Facebook, Apple) are the exception: they carry their
 * own colours and ignore the context.
 */
import { createContext, useContext, type ReactNode } from 'react';
import Svg, { Circle, G, Path, type SvgProps } from 'react-native-svg';

export interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

/**
 * The colour icons inherit when they are not given one explicitly.
 *
 * Coloured surfaces (Button, and anything else that paints its own
 * background) provide the foreground that reads against them, so an icon
 * dropped into one follows the theme without the caller hardcoding a hex —
 * which is what breaks the moment the theme inverts.
 */
const IconColorContext = createContext<string | undefined>(undefined);

export function IconColorProvider({
  color,
  children,
}: {
  color: string | undefined;
  children: ReactNode;
}) {
  return <IconColorContext.Provider value={color}>{children}</IconColorContext.Provider>;
}

/** The inherited icon colour, if a surface is providing one. */
export function useIconColor(): string | undefined {
  return useContext(IconColorContext);
}

/** Resolves an icon's colour: explicit prop, then inherited, then fallback. */
function useResolvedColor(explicit: string | undefined, fallback: string): string {
  const inherited = useIconColor();
  return explicit ?? inherited ?? fallback;
}

/** Props for icons that must never be announced by a screen reader. */
const decorative = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/* -------------------------------------------------------------------------- */
/* Stroked chrome icons                                                       */
/* -------------------------------------------------------------------------- */

export function CheckIcon({ size = 14, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#fff');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M20 6 9 17l-5-5"
        stroke={resolved}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="m6 9 6 6 6-6"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="m15 18-6-6 6-6"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="m9 18 6-6-6-6"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function XIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M18 6 6 18M6 6l12 12"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={11} cy={11} r={8} stroke={resolved} strokeWidth={2} />
      <Path
        d="m21 21-4.3-4.3"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowUpRightIcon({ size = 20, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#fff');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M7 17 17 7M8 7h9v9"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SunIcon({ size = 18, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#f5f5f5');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={12} cy={12} r={4} stroke={resolved} strokeWidth={2} />
      <Path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoonIcon({ size = 18, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#262626');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79"
        stroke={resolved}
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
  const resolved = useResolvedColor(color, 'currentColor');
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={resolved} {...decorative} {...props}>
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
  const resolved = useResolvedColor(color, 'currentColor');
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={resolved} {...decorative} {...props}>
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
  const resolved = useResolvedColor(color, 'currentColor');
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={resolved} {...decorative} {...props}>
      <Path
        d="M7.134 2.994L2.217 11.5a1 1 0 0 0 .866 1.5h9.834a1 1 0 0 0 .866-1.5L8.866 2.993a1 1 0 0 0-1.732 0m3.03-.75c-.962-1.665-3.366-1.665-4.329 0L.918 10.749c-.963 1.666.24 3.751 2.165 3.751h9.834c1.925 0 3.128-2.085 2.164-3.751zM8 5a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 8 5m1 5.75a1 1 0 1 1-2 0a1 1 0 0 1 2 0"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Brand marks                                                                */
/* -------------------------------------------------------------------------- */

/*
 * These keep their official colours and so opt out of the icon colour
 * context — recolouring a brand mark to match a button is a trademark
 * problem, not a theming one.
 */

/** Google "G", in the four official brand colours. */
export function GoogleIcon({ size = 18, ...props }: Omit<IconProps, 'color'>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorative} {...props}>
      <G>
        <Path
          fill="#4285F4"
          d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87"
        />
        <Path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.11A12 12 0 0 0 12 24"
        />
        <Path
          fill="#FBBC05"
          d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.29a12 12 0 0 0 0 10.76z"
        />
        <Path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.11C6.22 6.86 8.87 4.75 12 4.75"
        />
      </G>
    </Svg>
  );
}

/** Facebook "f" mark. */
export function FacebookIcon({ size = 18, ...props }: Omit<IconProps, 'color'>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorative} {...props}>
      <Path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07"
      />
    </Svg>
  );
}

/**
 * Apple mark. Monochrome by design, so unlike the other brand marks it does
 * follow the icon colour context — Apple's guidelines require it to match the
 * button's text colour.
 */
export function AppleIcon({ size = 18, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#000000');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorative} {...props}>
      <Path
        fill={resolved}
        d="M17.05 12.54c-.03-2.85 2.33-4.22 2.43-4.29-1.32-1.94-3.38-2.2-4.11-2.23-1.75-.18-3.42 1.03-4.31 1.03-.89 0-2.26-1.01-3.72-.98-1.91.03-3.68 1.11-4.66 2.82-1.99 3.45-.51 8.55 1.42 11.35.95 1.37 2.07 2.91 3.55 2.85 1.43-.06 1.97-.92 3.69-.92 1.72 0 2.21.92 3.72.89 1.54-.03 2.51-1.39 3.44-2.77 1.09-1.59 1.53-3.13 1.56-3.21-.03-.01-2.99-1.15-3.01-4.54M14.27 4.2c.79-.96 1.32-2.28 1.17-3.6-1.14.05-2.51.76-3.32 1.71-.73.85-1.37 2.2-1.2 3.5 1.27.1 2.57-.65 3.35-1.61"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Event icons (Timeline and other status surfaces)                           */
/* -------------------------------------------------------------------------- */

export function PlusSquareIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM12 8v8M8 12h8"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Three connected nodes — a branch, a share, a fan-out. */
export function ShareNodesIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx={18} cy={5} r={2.5} stroke={resolved} strokeWidth={2} />
      <Circle cx={6} cy={12} r={2.5} stroke={resolved} strokeWidth={2} />
      <Circle cx={18} cy={19} r={2.5} stroke={resolved} strokeWidth={2} />
      <Path
        d="m8.6 10.7 6.8-4M8.6 13.3l6.8 4"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Shield with an exclamation — a tripped guardrail. */
export function ShieldAlertIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10v-6z"
        stroke={resolved}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M12 8v4" stroke={resolved} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={15.5} r={1} fill={resolved} />
    </Svg>
  );
}

/** Shield with a check — a passed verification. */
export function ShieldCheckIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10v-6z"
        stroke={resolved}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="m9 12 2 2 4-4"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BellIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PackageIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="m12 2.5 8 4.5v10l-8 4.5-8-4.5V7zM4 7l8 4.5L20 7M12 11.5V21"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CardIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ReceiptIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M5 3h14v18l-2.3-1.6L14.4 21l-2.4-1.6L9.6 21l-2.3-1.6L5 21zM9 8h6M9 12h6"
        stroke={resolved}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Paper plane — sent, submitted, approved-and-forwarded. */
export function SendIcon({ size = 16, color, ...props }: IconProps) {
  const resolved = useResolvedColor(color, '#737373');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M21.5 2.5 2.5 10l7.5 3 3 7.5z"
        stroke={resolved}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
