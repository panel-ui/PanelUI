/**
 * Colours for an apparatus figure, worked out from the theme's own tokens.
 *
 * A figure is drawn in four greys and one accent. The greys are the card the
 * figure sits on with a measured amount of the foreground mixed into it, so
 * they follow every theme, light and dark, with no colour written down
 * anywhere. The accent is the theme's primary, used on exactly one part: the
 * one the reader should watch.
 *
 * Pure functions, no React Native, so the ladder can be tested in Node.
 */
import type { Tone } from './iso';

export interface Palette {
  /** The surface the figure is drawn on: `--color-card`. */
  card: string;
  /** `--color-foreground`. */
  ink: string;
  /** `--color-primary`. */
  accent: string;
}

type Rgba = [number, number, number, number];

/** Parse `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()`. Anything else is mid grey. */
export function parse(color: string): Rgba {
  const value = color.trim();
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    if ([r, g, b].some(Number.isNaN)) return [128, 128, 128, 1];
    return [r, g, b, a];
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    return [parts[0] ?? 128, parts[1] ?? 128, parts[2] ?? 128, parts[3] ?? 1];
  }
  return [128, 128, 128, 1];
}

const hex2 = (value: number) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');

function format([r, g, b]: Rgba): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** `a` with `amount` of `b` mixed in, opaque. A token with alpha is composited over `under` first. */
export function mix(a: string, b: string, amount: number, under = '#808080'): string {
  const base = flatten(parse(a), parse(under));
  const over = flatten(parse(b), base);
  const t = Math.max(0, Math.min(1, amount));
  return format([
    base[0] + (over[0] - base[0]) * t,
    base[1] + (over[1] - base[1]) * t,
    base[2] + (over[2] - base[2]) * t,
    1,
  ]);
}

function flatten(color: Rgba, under: Rgba): Rgba {
  const a = color[3];
  return [
    color[0] * a + under[0] * (1 - a),
    color[1] * a + under[1] * (1 - a),
    color[2] * a + under[2] * (1 - a),
    1,
  ];
}

/** Relative luminance, 0 to 1. */
export function luminance(color: string): number {
  const [r, g, b] = parse(color).map((c, i) => {
    if (i === 3) return c;
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgba;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDark(palette: Palette): boolean {
  return luminance(palette.card) < 0.4;
}

/**
 * How much ink each tone starts from, and how far light moves it. A `hi` part
 * in shadow still reads lighter than a `lo` part in full light, so the
 * hierarchy survives the shading.
 */
const BASE: Record<Exclude<Tone, 'lit'>, number> = { ground: 0.03, lo: 0.08, mid: 0.15, hi: 0.24 };
const RANGE = 0.16;

/**
 * The fill for a face of a given tone catching a given amount of light.
 *
 * Light makes a face brighter in both themes, which means more ink on a dark
 * card and less on a light one. The accent darkens towards whichever of card
 * and ink is darker, so its shaded sides never wash out to white.
 */
export function shade(palette: Palette, tone: Tone, light: number): string {
  const dark = isDark(palette);
  const l = Math.max(0, Math.min(1, light));
  if (tone === 'lit') {
    const shadow = dark ? palette.card : palette.ink;
    return mix(palette.accent, shadow, (1 - l) * (dark ? 0.55 : 0.35), palette.card);
  }
  const base = BASE[tone];
  const amount = dark ? base + l * RANGE : base + (1 - l) * RANGE;
  return mix(palette.card, palette.ink, amount, palette.card);
}

/** Stroke colours: outlines, seams and fine detail. */
export function strokes(palette: Palette) {
  const dark = isDark(palette);
  return {
    /** Silhouettes and the edges of faces. */
    edge: mix(palette.card, palette.ink, dark ? 0.42 : 0.5, palette.card),
    /** Seams, grooves and minor ticks. */
    faint: mix(palette.card, palette.ink, dark ? 0.26 : 0.3, palette.card),
    /** Major ticks, needles and anything the eye should follow. */
    strong: mix(palette.card, palette.ink, dark ? 0.7 : 0.75, palette.card),
    /** Screws and terminal dots. */
    dot: mix(palette.card, palette.ink, dark ? 0.55 : 0.6, palette.card),
  };
}
