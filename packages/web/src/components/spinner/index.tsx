/**
 * Spinner — shows that something is working and has not finished.
 *
 * ```tsx
 * <Spinner />
 * <Spinner variant="dots" size="lg" label="Sending" />
 * ```
 *
 * ## Six looks
 *
 * `ring` is an arc running round a faint track, for most waits. `spokes` is
 * twelve lines stepping round, the shape people read as "loading" from a
 * desktop. `dots` raises three dots in turn and sits on a line of text.
 * `orbit` sends two dots round one circle, meeting and parting. `pulse`
 * breathes a ring out of a dot, for waiting on somebody else rather than on
 * a computer. `dither` fills a three-by-three cell in ordered-dither order,
 * the collection's own pattern.
 *
 * ## Speed
 *
 * The motion is quick on purpose: a fast spinner makes the same wait feel
 * shorter. With reduced motion asked for it slows to a third of its speed
 * instead of stopping, because a spinner that stands still reads as frozen.
 *
 * ## Colour and size
 *
 * It draws in `currentColor`, so it takes the text colour of whatever it is
 * in. `size` gives three steps; a `size-*` class sets any other.
 */
import type { ComponentProps } from 'react';
import { tv } from 'tailwind-variants';

/*
 * Every look runs on keyframes of its own, shipped with the component so it
 * needs nothing added to a stylesheet. `--panelui-spinner-pace` stretches all
 * of them at once, which is how reduced motion slows them.
 */
const KEYFRAMES =
  '@keyframes panelui-spinner-turn{to{transform:rotate(360deg)}}' +
  '@keyframes panelui-spinner-rise{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-4px);opacity:1}}' +
  '@keyframes panelui-spinner-orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}' +
  '@keyframes panelui-spinner-breathe{0%{transform:scale(.35);opacity:.9}100%{transform:scale(1);opacity:0}}' +
  '@keyframes panelui-spinner-beat{0%,100%{transform:scale(.8)}50%{transform:scale(1)}}' +
  // One cycle per cell of the dither: it lights when the fill reaches its
  // rank and goes out when the fill falls back past it, so the cell fills in
  // ordered-dither order and empties in reverse.
  Array.from({ length: 9 }, (_, rank) => {
    const on = 4 + rank * 5;
    return `@keyframes panelui-spinner-cell-${rank}{0%,${on - 3}%{opacity:.14}${on}%,${100 - on}%{opacity:1}${103 - on}%,100%{opacity:.14}}`;
  }).join('') +
  '[data-slot=spinner]{--panelui-spinner-pace:1}' +
  '@media (prefers-reduced-motion:reduce){[data-slot=spinner]{--panelui-spinner-pace:3}}';

const spinnerVariants = tv({
  base: 'inline-block shrink-0 align-middle',
  variants: {
    size: {
      sm: 'size-3.5',
      md: 'size-4',
      lg: 'size-6',
    },
  },
  defaultVariants: { size: 'md' },
});

/** How long one cycle takes at normal speed, in seconds, multiplied by the pace. */
const pace = (seconds: number) => `calc(${seconds}s * var(--panelui-spinner-pace))`;

/** Lays the cells of a 3×3 ordered-dither matrix out in the order they light. */
const BAYER_3 = [
  [0, 7, 3],
  [6, 5, 2],
  [4, 1, 8],
] as const;

function Ring() {
  return (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <g style={{ transformOrigin: '12px 12px', animation: `panelui-spinner-turn ${pace(0.7)} linear infinite` }}>
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </>
  );
}

function Spokes() {
  // Twelve spokes fading from the leading one, turned a twelfth at a time, so
  // the fade appears to run round them without any spoke changing.
  return (
    <g style={{ transformOrigin: '12px 12px', animation: `panelui-spinner-turn ${pace(0.9)} steps(12) infinite` }}>
      {Array.from({ length: 12 }, (_, index) => (
        <line
          key={index}
          x1="12"
          y1="2.5"
          x2="12"
          y2="7"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          opacity={1 - index * 0.07}
          transform={`rotate(${-index * 30} 12 12)`}
        />
      ))}
    </g>
  );
}

function Dots() {
  return (
    <>
      {[5, 12, 19].map((cx, index) => (
        <circle
          key={cx}
          cx={cx}
          cy="13"
          r="2.4"
          fill="currentColor"
          style={{
            animation: `panelui-spinner-rise ${pace(0.9)} ease-in-out infinite`,
            animationDelay: `calc(${index * 0.14}s * var(--panelui-spinner-pace))`,
          }}
        />
      ))}
    </>
  );
}

function Orbit() {
  // Two dots on one circle, each eased round on its own clock: they bunch up
  // where the curve is slow and pull apart where it is fast.
  return (
    <>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.18" />
      {[0, 0.18].map((delay, index) => (
        <g
          key={delay}
          style={{
            transformOrigin: '12px 12px',
            animation: `panelui-spinner-orbit ${pace(1.1)} cubic-bezier(0.65, 0, 0.35, 1) infinite`,
            animationDelay: `calc(${delay}s * var(--panelui-spinner-pace))`,
          }}
        >
          <circle cx="12" cy="4" r={index === 0 ? 2.6 : 1.9} fill="currentColor" />
        </g>
      ))}
    </>
  );
}

function Pulse() {
  return (
    <>
      {[0, 0.6].map((delay) => (
        <circle
          key={delay}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="1.75"
          style={{
            transformOrigin: '12px 12px',
            animation: `panelui-spinner-breathe ${pace(1.2)} cubic-bezier(0.23, 1, 0.32, 1) infinite`,
            animationDelay: `calc(${delay}s * var(--panelui-spinner-pace))`,
          }}
        />
      ))}
      <circle
        cx="12"
        cy="12"
        r="3.5"
        fill="currentColor"
        style={{ transformOrigin: '12px 12px', animation: `panelui-spinner-beat ${pace(1.2)} ease-in-out infinite` }}
      />
    </>
  );
}

function Dither() {
  // Each cell runs its own window of the cycle; see the keyframes above.
  return (
    <>
      {BAYER_3.flatMap((row, y) =>
        row.map((rank, x) => (
          <rect
            key={`${x}-${y}`}
            x={2 + x * 7}
            y={2 + y * 7}
            width="6"
            height="6"
            rx="1.25"
            fill="currentColor"
            style={{ animation: `panelui-spinner-cell-${rank} ${pace(1.6)} linear infinite` }}
          />
        ))
      )}
    </>
  );
}

const LOOKS = { ring: Ring, spokes: Spokes, dots: Dots, orbit: Orbit, pulse: Pulse, dither: Dither } as const;

export type SpinnerVariant = keyof typeof LOOKS;

export interface SpinnerProps extends Omit<ComponentProps<'svg'>, 'children'> {
  /** Its look: `ring`, `spokes`, `dots`, `orbit`, `pulse` or `dither`. Default `ring`. */
  variant?: SpinnerVariant;
  /** `sm` is 14px, `md` 16px and `lg` 24px. A `size-*` class sets any other. Default `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** What a screen reader announces. Default `Loading`. */
  label?: string;
  className?: string;
}

/** A spinner in the colour of the text around it. Every attribute of `<svg>` passes through. */
export function Spinner({ variant = 'ring', size, label = 'Loading', className, ...props }: SpinnerProps) {
  const Look = LOOKS[variant];
  return (
    <svg
      role="status"
      aria-label={label}
      data-slot="spinner"
      data-variant={variant}
      viewBox="0 0 24 24"
      fill="none"
      className={spinnerVariants({ size, className })}
      {...props}
    >
      <style>{KEYFRAMES}</style>
      <Look />
    </svg>
  );
}
Spinner.displayName = 'Spinner';
