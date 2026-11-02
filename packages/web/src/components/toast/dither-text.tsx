'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { prefersReducedMotion } from './dither';

/*
 * Text that changes by dissolving through dither.
 *
 * Every character of the old text goes dim and monospace, flickers through a
 * few stand-in glyphs and is eaten by an ordered dither, densest first, until
 * it is a solid cell. The new text then resolves from the start: a head moves
 * along it, each cell behind the head thins out through the same dither and
 * settles into its letter, and a caret rides the head. Characters are drawn as
 * spans rather than on a canvas, so the type is the page's own, crisp at any
 * zoom, and the cells take `currentColor`.
 *
 * The dither cells are CSS: four Bayer-like densities built from conic and
 * radial gradients on a 2–3px tile, plus a solid block. No image, no canvas.
 */

/** Ordered densities, from the sparsest dust to a solid cell. */
const CELL: readonly CSSProperties[] = [
  { backgroundImage: 'radial-gradient(currentColor 0.55px, transparent 0.75px)', backgroundSize: '3px 3px' },
  { backgroundImage: 'conic-gradient(currentColor 0 25%, transparent 0)', backgroundSize: '2px 2px' },
  { backgroundImage: 'repeating-conic-gradient(currentColor 0 25%, transparent 0 50%)', backgroundSize: '2px 2px' },
  { backgroundImage: 'conic-gradient(transparent 0 25%, currentColor 0)', backgroundSize: '2px 2px' },
  { backgroundColor: 'currentColor' },
];

const SCRAMBLE = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Milliseconds between one character starting to go and the next. */
const OUT_STAGGER = 14;
/** How long one character takes from letter to solid cell. */
const OUT_SPAN = 240;
/** When the new text starts arriving, after the old started going. */
const IN_DELAY = 150;
/** Milliseconds between one new character starting to arrive and the next, for a short line. */
const IN_STAGGER = 30;
/** The longest a whole line takes to start arriving; a long line's characters come closer together. */
const IN_SWEEP = 560;

/** The gap between characters arriving, so that a long line takes no longer than `IN_SWEEP`. */
function staggerFor(length: number) {
  return length > 1 ? Math.min(IN_STAGGER, IN_SWEEP / (length - 1)) : IN_STAGGER;
}
/** How long one new character takes from cell to letter. */
const IN_SPAN = 210;
/** How long the caret stays once the text has arrived. */
const CARET_HOLD = 520;

type Glyph =
  | { kind: 'char'; char: string }
  | { kind: 'mono'; char: string }
  | { kind: 'cell'; level: number }
  | { kind: 'gap' };

function scramble(seed: number) {
  return SCRAMBLE[Math.abs(Math.floor(seed)) % SCRAMBLE.length]!;
}

/** What the character at `index` looks like `elapsed` ms into a change from `from` to `to`. */
function glyphAt(from: string, to: string, index: number, elapsed: number): Glyph {
  const incoming = elapsed - IN_DELAY - index * staggerFor(to.length);
  const target = to[index];

  if (target !== undefined && incoming >= 0) {
    if (target === ' ') return { kind: 'gap' };
    const p = incoming / IN_SPAN;
    if (p >= 1) return { kind: 'char', char: target };
    // Arriving: a solid cell thins out, flickers as a letter, then settles.
    if (p < 0.72) return { kind: 'cell', level: CELL.length - 1 - Math.floor((p / 0.72) * (CELL.length - 1)) };
    return { kind: 'mono', char: p < 0.86 ? scramble(index * 7 + elapsed / 40) : target };
  }

  const source = from[index];
  if (source === undefined) {
    // A position only the new text has, which the head has not reached.
    return target === undefined ? { kind: 'gap' } : { kind: 'cell', level: 0 };
  }
  if (source === ' ') return { kind: 'gap' };
  const p = (elapsed - index * Math.min(OUT_STAGGER, IN_SWEEP / Math.max(1, from.length - 1))) / OUT_SPAN;
  if (p < 0) return { kind: 'char', char: source };
  // Going: dim and monospace, a few stand-in letters, then dither fills it in.
  if (p < 0.3) return { kind: 'mono', char: p < 0.12 ? source : scramble(index * 13 + elapsed / 45) };
  const level = Math.min(CELL.length - 1, Math.floor(((p - 0.3) / 0.7) * CELL.length));
  // A position the new text does not reach thins back to nothing once solid.
  if (target === undefined && p >= 1) {
    const fade = (p - 1) * CELL.length;
    return fade >= CELL.length ? { kind: 'gap' } : { kind: 'cell', level: Math.max(0, CELL.length - 1 - Math.floor(fade)) };
  }
  return { kind: 'cell', level };
}

function durationOf(from: string, to: string) {
  const arrive = to.length > 0 ? IN_DELAY + (to.length - 1) * staggerFor(to.length) + IN_SPAN : 0;
  // A tail of the old text that the new one does not cover goes solid and then thins away.
  const leave =
    from.length > to.length ? (from.length - 1) * Math.min(OUT_STAGGER, IN_SWEEP / Math.max(1, from.length - 1)) + OUT_SPAN * 2 : 0;
  return Math.max(arrive, leave);
}

export interface DitherTextProps {
  /** The text to show. A change dissolves the old text into the new. */
  text: string;
  /** Whether the first text arrives through dither, as a change from nothing does. Default `true`. */
  animateOnMount?: boolean;
  /** Draws a caret at the arriving edge while the text changes. Default `true`. */
  caret?: boolean;
  /** The colour the dither cells and the caret are drawn in. Settled letters keep the text colour. */
  accent?: string;
  className?: string;
}

/** A line of text whose changes dissolve through ordered dither. */
export function DitherText({ text, animateOnMount = true, caret = true, accent, className }: DitherTextProps) {
  const [shown, setShown] = useState(animateOnMount ? '' : text);
  const transition = useRef<{ from: string; to: string; start: number } | null>(null);
  const [now, setNow] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (text === shown && !transition.current) return;
    if (prefersReducedMotion()) {
      transition.current = null;
      setShown(text);
      return;
    }
    // An effect run again for the same text (as React does in development)
    // carries on with the change already under way, rather than restarting it.
    if (transition.current?.to !== text) {
      // A change mid-change starts from what is on screen now, as near as text allows.
      const from = transition.current ? transition.current.to : shown;
      transition.current = { from, to: text, start: performance.now() };
    }
    const { from } = transition.current;
    const total = durationOf(from, text) + (caret ? CARET_HOLD : 0);

    const tick = (time: number) => {
      const current = transition.current;
      if (!current) return;
      if (time - current.start >= total) {
        transition.current = null;
        setShown(current.to);
        return;
      }
      setNow(time);
      frame.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // `shown` is read as the starting point only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, caret]);

  const active = transition.current;
  const label = <span className="sr-only">{text}</span>;

  if (!active) {
    return (
      <span data-slot="dither-text" className={className}>
        {shown}
      </span>
    );
  }

  const elapsed = Math.max(0, now - active.start);
  const length = Math.max(active.from.length, active.to.length);
  const head = Math.min(
    active.to.length,
    Math.max(0, Math.floor((elapsed - IN_DELAY) / staggerFor(active.to.length)) + 1)
  );
  const arriving = elapsed < durationOf(active.from, active.to);
  const glyphs = Array.from({ length }, (_, index) => glyphAt(active.from, active.to, index, elapsed));

  return (
    <span data-slot="dither-text" data-changing="" className={className}>
      {label}
      <span aria-hidden="true" className="whitespace-pre" style={accent ? ({ '--dither-accent': accent } as CSSProperties) : undefined}>
        {glyphs.map((glyph, index) => (
          <span key={index} className="relative">
            {glyph.kind === 'char' ? glyph.char : null}
            {glyph.kind === 'gap' ? ' ' : null}
            {glyph.kind === 'mono' ? (
              <span className="font-mono text-[0.92em] text-(--dither-accent,currentColor) opacity-55">{glyph.char}</span>
            ) : null}
            {glyph.kind === 'cell' ? (
              <span
                className="inline-block h-[0.82em] w-[0.6em] align-[-0.06em] text-(--dither-accent,currentColor)"
                style={CELL[glyph.level]}
              />
            ) : null}
            {caret && index === head - 1 && (arriving || Math.floor(elapsed / 260) % 2 === 0) ? (
              <span className="absolute inset-y-[0.08em] -end-[0.08em] w-[0.09em] bg-(--dither-accent,currentColor)" />
            ) : null}
          </span>
        ))}
        {caret && head === 0 ? (
          <span className="inline-block h-[0.84em] w-[0.09em] align-[-0.06em] bg-(--dither-accent,currentColor)" />
        ) : null}
      </span>
    </span>
  );
}
