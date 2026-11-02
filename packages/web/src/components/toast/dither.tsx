'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/*
 * The ordered dither the toast's versions are drawn with.
 *
 * A coverage level picks the cells of the 4×4 Bayer matrix that are on, and
 * one SVG tile of those cells, as a CSS mask, cuts an element down to an even
 * dither, as the timer bar is drawn. The card sweep thresholds a tone per
 * column against the same matrix on a canvas.
 */

/** The 4×4 Bayer matrix, as thresholds 0–15. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** Levels a mask can take: 0 hides everything, 16 shows everything. */
export const LEVELS = 16;

const tiles = new Map<number, string>();

/** A CSS `url()` of one tile showing the cells lit at `level` (0–16). */
function tile(level: number) {
  const cached = tiles.get(level);
  if (cached) return cached;
  let rects = '';
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if (BAYER[y]![x]! < level) rects += `<rect x='${x}' y='${y}' width='1' height='1'/>`;
    }
  }
  const url = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4' shape-rendering='crispEdges'>${rects}</svg>`
  )}")`;
  tiles.set(level, url);
  return url;
}

/** Masks an element to an even dither at `level` (0–16), in cells of `cell` px. Full or empty need no mask. */
export function maskStyle(level: number, cell = 2): CSSProperties {
  const clamped = Math.max(0, Math.min(LEVELS, Math.round(level)));
  if (clamped >= LEVELS) return {};
  const image = clamped === 0 ? 'linear-gradient(transparent, transparent)' : tile(clamped);
  const size = `${cell * 4}px ${cell * 4}px`;
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: size,
    WebkitMaskSize: size,
    maskRepeat: 'repeat',
    WebkitMaskRepeat: 'repeat',
  };
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** How wide the band of dither cells behind the head is, as a share of the card's width. */
const BAND = 0.34;
/** The width of one column of cells, in px: about a character, so the card is built as the text is. */
const COLUMN = 8;

export type SweepPhase = 'in' | 'out' | 'done';

/**
 * Builds a card out of dither cells the way a line of text is built: a head
 * moves across it, the columns it has just passed arrive as solid cells in
 * the accent, and they thin out through the dither to show the card. On the
 * way out the columns thicken into solid cells and go, from the start edge.
 *
 * Returns a mask for the card, which shows only what the head has passed (or
 * what the tail has not), and a canvas of the cells, to sit over the card.
 */
export function useCardSweep(phase: SweepPhase, duration: number) {
  const [progress, setProgress] = useState(phase === 'done' ? 1 : 0);

  useEffect(() => {
    if (phase === 'done') return;
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }
    const began = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const t = Math.min(1, (time - began) / duration);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setProgress(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, duration]);

  // The head (arriving) or the tail (leaving), in units of the card's width.
  const edge = progress * (1 + BAND);
  let mask: CSSProperties = {};
  if (phase === 'in' && progress < 1) {
    const image = `linear-gradient(to right, #000 ${edge * 100}%, transparent ${edge * 100}%)`;
    mask = { maskImage: image, WebkitMaskImage: image };
  } else if (phase === 'out') {
    const tail = Math.max(0, edge - BAND);
    const image = `linear-gradient(to right, transparent ${tail * 100}%, #000 ${tail * 100}%)`;
    mask = { maskImage: image, WebkitMaskImage: image };
  }
  const sweeping = phase !== 'done' && progress > 0 && progress < 1;
  return { mask, progress, edge, sweeping };
}

/** The cells of a card sweep, drawn over the card in `color`. */
export function SweepCells({
  phase,
  edge,
  color,
  className,
}: {
  phase: SweepPhase;
  edge: number;
  color: string;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = canvas.current;
    const context = node?.getContext('2d');
    if (!node || !context) return;
    node.style.color = color;
    const ink = getComputedStyle(node).color;
    const ratio = window.devicePixelRatio || 1;
    const width = node.clientWidth;
    const height = node.clientHeight;
    if (node.width !== Math.round(width * ratio)) node.width = Math.round(width * ratio);
    if (node.height !== Math.round(height * ratio)) node.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (phase === 'done' || width === 0) return;
    context.fillStyle = ink;

    const dot = 2;
    const head = edge * width;
    const band = BAND * width;
    for (let column = 0; column * COLUMN < width; column++) {
      const x = column * COLUMN;
      // How far through its change this column is: 1 just behind the head, 0 at the band's far end.
      const distance = phase === 'in' ? (head - (x + COLUMN)) / band : (x - (head - band)) / band;
      if (distance < 0 || distance > 1) continue;
      // Arriving, a column starts solid and thins; leaving, it thickens to solid and goes.
      const tone = phase === 'in' ? 1 - distance : 1 - distance;
      for (let y = 0; y < height; y += dot) {
        for (let dx = 0; dx < COLUMN; dx += dot) {
          const threshold = BAYER[(y / dot) % 4]![((x + dx) / dot) % 4]!;
          if (tone * LEVELS > threshold + 0.5) context.fillRect(x + dx, y, dot, dot);
        }
      }
    }
    // The caret rides the head on the way in, as it does on a line of text.
    if (phase === 'in' && head > 0 && head < width) {
      context.fillRect(Math.round(head) - 1, Math.round(height * 0.18), 2, Math.round(height * 0.64));
    }
  }, [phase, edge, color]);

  return <canvas ref={canvas} aria-hidden="true" className={className} />;
}
