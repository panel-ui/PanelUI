/** A wedge's place on the dial, in turns clockwise from twelve o'clock. */
export interface PolarWedge {
  from: number;
  to: number;
  /** Halfway along it, which is where its label sits. */
  mid: number;
  /** How far out it reaches, in pixels. */
  radius: number;
  /** Its value against the maximum, 0 to 1. */
  fraction: number;
}

/** What a wedge's radius stands for. */
export type PolarAreaScale = 'radius' | 'area';

export interface PolarLayoutOptions {
  /** The outermost ring, in pixels, standing for `maxValue`. */
  radius: number;
  maxValue: number;
  scale: PolarAreaScale;
  /** Where the first wedge begins, in degrees clockwise from twelve o'clock. */
  startAngle: number;
  /** Gap between one wedge and the next, in degrees. */
  padAngle: number;
}

const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** The first round number at or above `value`, so the outer ring reads as a figure somebody would pick. */
export function polarNiceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  return (NICE_STEPS.find((step) => scaled <= step) ?? 10) * magnitude;
}

/**
 * A value's distance from the centre. One conversion for the wedges and the rings,
 * so a ring is always where its value falls. Under `area` it is the square root, so
 * the ink is proportional to the value and the rings are not evenly spaced.
 */
export function polarReach(value: number, { radius, maxValue, scale }: Pick<PolarLayoutOptions, 'radius' | 'maxValue' | 'scale'>): number {
  const fraction = Math.min(Math.max(value, 0) / maxValue, 1);
  return radius * (scale === 'area' ? Math.sqrt(fraction) : fraction);
}

/** Every wedge takes the same angle, and only the value decides how far it reaches. */
export function polarWedges(values: readonly number[], options: PolarLayoutOptions): PolarWedge[] {
  if (!values.length) return [];
  const each = 1 / values.length;
  const origin = options.startAngle / 360;
  const pad = Math.min(options.padAngle / 360, each / 2);
  return values.map((value, index) => {
    const from = origin + each * index + pad / 2;
    const to = origin + each * (index + 1) - pad / 2;
    return {
      from,
      to,
      mid: (from + to) / 2,
      radius: polarReach(value, options),
      fraction: Math.min(Math.max(value, 0) / options.maxValue, 1),
    };
  });
}

/** The wedge under a point measured from the centre, or -1 for a gap or past its reach. */
export function polarWedgeAt(wedges: readonly PolarWedge[], x: number, y: number): number {
  const distance = Math.hypot(x, y);
  const turn = Math.atan2(x, -y) / (Math.PI * 2);
  return wedges.findIndex((wedge) => {
    if (distance > wedge.radius) return false;
    const past = (((turn - wedge.from) % 1) + 1) % 1;
    return past < wedge.to - wedge.from;
  });
}

/** Radii part way through a change, `progress` running 0 to 1. A wedge with no earlier radius grows from the centre. */
export function polarRadiiBetween(from: readonly number[], to: readonly number[], progress: number): number[] {
  return to.map((radius, index) => {
    const start = from[index] ?? 0;
    return start + (radius - start) * progress;
  });
}

/** A point on the dial, from the top-left of a box with its centre at `center`. */
export function polarPoint(center: number, radius: number, turn: number): { x: number; y: number } {
  const angle = turn * Math.PI * 2;
  return { x: center + Math.sin(angle) * radius, y: center - Math.cos(angle) * radius };
}

/** Where a box goes over a point, pushed back inside the plot, because a readout half off the edge is half a readout. */
export function polarBoxInside(point: number, boxSize: number, plot: number): number {
  return Math.max(0, Math.min(plot - boxSize, point - boxSize / 2));
}

/** The wedge a navigation key moves the reading to, or undefined for any other key. Stops at the ends. */
export function polarKeyWalk(current: number, count: number, key: string): number | undefined {
  const last = count - 1;
  if (last < 0) return undefined;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(current + 1, last);
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(current - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return undefined;
  }
}
