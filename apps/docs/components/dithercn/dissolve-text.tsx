"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

import {
  cssColor,
  ditherMask,
  fillTile,
  getThresholdMap,
  MOTION,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** The Bayer matrices. Blue noise tiles are too large to step through in CSS. */
export type DissolveMatrix = Exclude<DitherMatrix, "blue-noise">;

/**
 * What the letters settle into.
 * `solid`: plain text. `gradient`: a dither held at `level`.
 * `dotted`, `hatched`: the style kit's textures.
 */
export const DISSOLVE_FILLS = [
  "solid",
  "gradient",
  "dotted",
  "hatched",
] as const;
export type DissolveFill = (typeof DISSOLVE_FILLS)[number];

/**
 * The order units dissolve in: reading order, reversed, from the middle
 * out, from both ends in, or shuffled (the same shuffle every time).
 */
export const DISSOLVE_ORDERS = [
  "start",
  "end",
  "center",
  "edges",
  "random",
] as const;
export type DissolveOrder = (typeof DISSOLVE_ORDERS)[number];

export type DissolveTextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

export type DissolveTextProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "color"
> & {
  /** The text. Each character (or word) stays real, selectable text. */
  children: string;
  /** The element to render. Default `"span"`. */
  as?: DissolveTextTag;
  /** Dissolve each character, each word, or the whole text at once. Default `"char"`. */
  by?: "char" | "word" | "line";
  /** The order units dissolve in. Default `"start"`. */
  direction?: DissolveOrder;
  /** Start on mount, or when scrolled into view. Default `"in-view"`. */
  trigger?: "mount" | "in-view";
  /** `false` dissolves the text out; `true` brings it back. Default `true`. */
  show?: boolean;
  /** Text colour: a palette name or any CSS colour. Default: the text colour. */
  color?: DitherColor;
  /** Colour each unit has while it dissolves in, fading to `color`. `"none"` skips it. Default `"none"`. */
  accent?: DitherColor | "none";
  /** What the letters settle into. Default `"solid"`. */
  fill?: DissolveFill;
  /** Gradient fill only: coverage the letters settle at, 0 to 1. Default 0.625. */
  level?: number;
  /** Milliseconds for one character, word or line. Default 600. */
  duration?: number;
  /** Milliseconds between one unit and the next. Default 28 per character, 90 per word. */
  stagger?: number;
  /** Milliseconds before the first unit starts. Default 0. */
  delay?: number;
  /** Multiplies every timing: 2 plays twice as fast. Default 1. */
  speed?: number;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DissolveMatrix;
  /** Cell size in CSS pixels. Default `--dither-cell`. */
  cell?: number;
};

type DissolveState = "waiting" | "in" | "out";

// Levels stepped through per matrix: every level of bayer2 and bayer4,
// and every fourth of bayer8.
const STEPS: Record<DissolveMatrix, number> = {
  bayer2: 4,
  bayer4: 16,
  bayer8: 16,
};

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

const svgUrl = (size: number, path: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

interface Sheet {
  matrix: DissolveMatrix;
  fill: DissolveFill;
  /** Gradient: the last step, out of `STEPS[matrix]`. */
  last: number;
}

const sheetName = ({ matrix, fill, last }: Sheet) =>
  `${matrix}-${fill}${fill === "gradient" ? `-${last}` : ""}`;

/**
 * The mask at step `k`: the matrix level, intersected with a texture for
 * dotted and hatched. The final solid step has no mask.
 */
const maskAt = ({ matrix, fill, last }: Sheet, k: number) => {
  const steps = STEPS[matrix];
  if (fill === "dotted" || fill === "hatched") {
    const { size, path } = fillTile(fill);
    const texture = svgUrl(size, path);
    return k >= steps
      ? texture
      : `${ditherMask(k / steps, { matrix })},${texture}`;
  }
  if (fill === "solid" && k >= steps) {
    return "none";
  }
  return ditherMask(Math.min(k, last) / steps, { matrix });
};

const sheets = new Map<string, string>();

/**
 * Keyframes that step a mask through the matrix's levels with an ease-out
 * shape: level k lands at t where 1 - (1 - t)^2 = k / steps.
 */
const keyframesFor = (sheet: Sheet) => {
  const name = sheetName(sheet);
  const cached = sheets.get(name);
  if (cached !== undefined) {
    return cached;
  }
  const steps = STEPS[sheet.matrix];
  const ks = Array.from({ length: steps + 1 }, (_, k) => k);
  const frame = (offset: number, k: number) => {
    const image = maskAt(sheet, k);
    return `${percent(offset)}{-webkit-mask-image:${image};mask-image:${image}}`;
  };
  const offset = (k: number) => 1 - Math.sqrt(1 - k / steps);
  const into = ks.map((k) => frame(offset(k), k));
  const out = ks.map((k) => frame(offset(k), steps - k));
  const css = `@keyframes dcn-dissolve-in-${name}{${into.join("")}}@keyframes dcn-dissolve-out-${name}{${out.join("")}}`;
  sheets.set(name, css);
  return css;
};

const BASE_CSS = `
@keyframes dcn-dissolve-tint{from{color:var(--dissolve-accent)}}
.dcn-dissolve [data-dissolve-unit]{
  -webkit-mask-repeat:repeat;mask-repeat:repeat;
  -webkit-mask-size:var(--dissolve-tile);mask-size:var(--dissolve-tile);
  -webkit-mask-composite:source-in;mask-composite:intersect;
  animation-duration:var(--dissolve-duration),calc(var(--dissolve-duration) * 2);
  animation-delay:calc(var(--i, 0) * var(--dissolve-stagger) + var(--dissolve-delay));
  animation-fill-mode:both;
  animation-timing-function:step-end,${MOTION.ease};
}
.dcn-dissolve:is([data-state=in],[data-state=waiting]) [data-dissolve-unit]{animation-name:var(--dissolve-in),var(--dissolve-tint)}
.dcn-dissolve[data-state=waiting] [data-dissolve-unit]{animation-play-state:paused}
.dcn-dissolve[data-state=out] [data-dissolve-unit]{animation-name:var(--dissolve-out),none}
@media (prefers-reduced-motion:reduce){
  .dcn-dissolve [data-dissolve-unit]{animation:none}
  .dcn-dissolve[data-state=out]{opacity:0}
}`;

const NOSCRIPT_CSS =
  ".dcn-dissolve[data-state=waiting] [data-dissolve-unit]{animation:none}";

const unitStyle = (rank: number) => {
  const style: CSSProperties & Record<"--i", number> = { "--i": rank };
  return style;
};

// A stable hash in [0, 1) for the shuffled order.
const jitter = (index: number) => {
  const s = Math.sin(index * 78.233 + 12.9898) * 43_758.5453;
  return s - Math.floor(s);
};

/** Each unit's place in the dissolve order, by its reading index. */
const ranks = (count: number, order: DissolveOrder): number[] => {
  const middle = (count - 1) / 2;
  const indices = Array.from({ length: count }, (_, index) => index);
  switch (order) {
    case "start": {
      return indices;
    }
    case "end": {
      return indices.map((index) => count - 1 - index);
    }
    case "center": {
      return indices.map((index) => Math.abs(index - middle));
    }
    case "edges": {
      return indices.map((index) => middle - Math.abs(index - middle));
    }
    case "random": {
      const shuffled = indices.toSorted((a, b) => jitter(a) - jitter(b));
      const rank = Array.from({ length: count }, () => 0);
      for (const [place, index] of shuffled.entries()) {
        rank[index] = place;
      }
      return rank;
    }
    default: {
      const _exhaustive: never = order;
      return _exhaustive;
    }
  }
};

interface RootVars {
  sheet: Sheet;
  by: "char" | "word" | "line";
  accent: DitherColor | "none";
  color: DitherColor | undefined;
  cell: number | undefined;
  delay: number;
  duration: number;
  speed: number;
  stagger: number | undefined;
}

/** The custom properties the stylesheet reads, timings scaled by `speed`. */
const rootVars = ({
  sheet,
  by,
  accent,
  color,
  cell,
  delay,
  duration,
  speed,
  stagger,
}: RootVars) => {
  const name = sheetName(sheet);
  const pace = Math.max(0.05, speed);
  const { size } = getThresholdMap(sheet.matrix);
  const cellSize = cell === undefined ? "var(--dither-cell)" : `${cell}px`;
  const vars: CSSProperties & Record<`--${string}`, string> = {
    "--dissolve-delay": `${delay / pace}ms`,
    "--dissolve-duration": `${duration / pace}ms`,
    "--dissolve-in": `dcn-dissolve-in-${name}`,
    "--dissolve-out": `dcn-dissolve-out-${name}`,
    "--dissolve-stagger": `${(stagger ?? (by === "word" ? 90 : 28)) / pace}ms`,
    "--dissolve-tile": `calc(${cellSize} * ${size})`,
    "--dissolve-tint": accent === "none" ? "none" : "dcn-dissolve-tint",
    ...(accent === "none" ? {} : { "--dissolve-accent": cssColor(accent) }),
    ...(color === undefined ? {} : { color: cssColor(color) }),
  };
  return vars;
};

interface Unit {
  text: string;
  index: number;
}

/** Words with their characters, numbered in reading order. */
const splitText = (text: string, by: "char" | "word") => {
  let index = 0;
  return text.split(/(\s+)/u).map((part) => {
    if (part.trim() === "") {
      return { space: part, units: [] satisfies Unit[] };
    }
    const pieces = by === "char" ? [...part] : [part];
    const units = pieces.map((piece) => {
      const unit = { index, text: piece };
      index += 1;
      return unit;
    });
    return { space: "", units };
  });
};

/**
 * Text that dissolves in through the levels of a Bayer matrix, one
 * character, word or line at a time, in any order, and optionally back
 * out. The letters stay real text; each one is masked by a dither that
 * fills in over `duration`, settling solid, at a dither level, or into a
 * dotted or hatched texture. Under reduced motion it appears and
 * disappears instantly.
 */
export const DissolveText = ({
  as: Tag = "span",
  children,
  by = "char",
  direction = "start",
  trigger = "in-view",
  show = true,
  color,
  accent = "none",
  fill = "solid",
  level = 0.625,
  duration = MOTION.slow,
  stagger,
  delay = 0,
  speed = 1,
  matrix = "bayer4",
  cell,
  className,
  style,
  ...rest
}: DissolveTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const inView = useInView(ref, { rootMargin: "0px 0px -8% 0px" });
  const reducedMotion = usePrefersReducedMotion();
  const [seen, setSeen] = useState(trigger === "mount");

  useEffect(() => {
    if (inView) {
      setSeen(true);
    }
  }, [inView]);

  let state: DissolveState = "in";
  if (!show) {
    state = "out";
  } else if (!(seen || reducedMotion)) {
    state = "waiting";
  }

  const sheet: Sheet = {
    fill,
    last: Math.max(
      1,
      Math.min(STEPS[matrix], Math.round(level * STEPS[matrix]))
    ),
    matrix,
  };
  const rootStyle = {
    ...rootVars({
      accent,
      by,
      cell,
      color,
      delay,
      duration,
      sheet,
      speed,
      stagger,
    }),
    ...style,
  };

  const words = by === "line" ? [] : splitText(children, by);
  const count = words.reduce((total, word) => total + word.units.length, 0);
  const order = ranks(count, direction);

  return (
    <Tag
      {...rest}
      ref={setRef}
      data-state={state}
      aria-hidden={show ? rest["aria-hidden"] : true}
      className={cn("dcn-dissolve", className)}
      style={rootStyle}
    >
      <style href="dcn-dissolve" precedence="default">
        {BASE_CSS}
      </style>
      <style href={`dcn-dissolve-${sheetName(sheet)}`} precedence="default">
        {keyframesFor(sheet)}
      </style>
      <noscript>
        <style>{NOSCRIPT_CSS}</style>
      </noscript>
      {by === "line" ? (
        <span data-dissolve-unit="">{children}</span>
      ) : (
        words.map(({ space, units }, wordIndex) =>
          space === "" ? (
            <span key={wordIndex} className="whitespace-nowrap">
              {units.map((unit) => (
                <span
                  key={unit.index}
                  data-dissolve-unit=""
                  style={unitStyle(order[unit.index] ?? unit.index)}
                >
                  {unit.text}
                </span>
              ))}
            </span>
          ) : (
            space
          )
        )
      )}
    </Tag>
  );
};
