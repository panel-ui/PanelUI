"use client";

import { cssColor, DEFAULT_PALETTE, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** A point in the box: x from the left, y from the top, both 0 to 1. */
export type GlowPoint = readonly [number, number];

/** Where the glow sits: an edge, a corner, the centre, or any point. */
export type GlowPosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | GlowPoint;

export type DitherGlowProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Where the light comes from. Default `"top"`. */
  position?: GlowPosition;
  /** How far the light reaches. 1 reaches the farthest corner. Default 0.7. */
  radius?: number;
  /** Brightness at the centre, 0 (none) to 1 (full ink). Default 0.75. */
  intensity?: number;
};

const POSITIONS = {
  bottom: [0.5, 1.05],
  "bottom-left": [0, 1],
  "bottom-right": [1, 1],
  center: [0.5, 0.5],
  left: [-0.05, 0.5],
  right: [1.05, 0.5],
  top: [0.5, -0.05],
  "top-left": [0, 0],
  "top-right": [1, 0],
} as const satisfies Record<string, GlowPoint>;

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 c = vec2(glowCenter.x * aspect, 1.0 - glowCenter.y);
  vec2 far = vec2(max(c.x, aspect - c.x), max(c.y, 1.0 - c.y));
  float reach = length(far) * glowRadius;
  float breathe = 1.0 + 0.045 * sin(t * 0.32);
  float warp = fbm(p * 1.6 + vec2(t * 0.035, -t * 0.025)) - 0.5;
  float d = length(p - c) / (reach * breathe) + warp * 0.22;
  d = max(d, 0.0);
  float core = exp(-d * d * 4.5);
  float halo = exp(-d * 2.6) * (1.0 - smoothstep(0.55, 1.25, d));
  return glowIntensity * (core * 0.6 + halo * 0.4);
}
`;

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const resolvePosition = (position: GlowPosition): GlowPoint =>
  typeof position === "string" ? POSITIONS[position] : position;

/** A soft CSS glow in the same place, shown without WebGL. */
const fallbackImage = (
  [x, y]: GlowPoint,
  radius: number,
  intensity: number,
  palette: DitherPalette
) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const strength = Math.round(Math.min(1, Math.max(0, intensity)) * 70);
  return `radial-gradient(circle farthest-corner at ${percent(x)} ${percent(y)}, color-mix(in oklch, ${ink} ${strength}%, transparent) 0%, transparent ${percent(radius * 0.9)})`;
};

/**
 * A soft dithered light from an edge, a corner or any point: the quiet
 * spotlight behind a hero or a card. It breathes slowly. Decorative and
 * full-bleed: size it with `className`, usually `absolute inset-0`.
 */
export const DitherGlow = ({
  position = "top",
  radius = 0.7,
  intensity = 0.75,
  palette = DEFAULT_PALETTE,
  matrix = "bayer8",
  ...props
}: DitherGlowProps) => {
  const center = resolvePosition(position);
  const reach = Math.max(0.05, radius);

  return (
    <DitherShader
      {...props}
      field={FIELD}
      palette={palette}
      matrix={matrix}
      uniforms={{
        glowCenter: center,
        glowIntensity: intensity,
        glowRadius: reach,
      }}
      fallback={
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: cssColor(palette[0]),
            backgroundImage: fallbackImage(center, reach, intensity, palette),
          }}
        />
      }
    />
  );
};
