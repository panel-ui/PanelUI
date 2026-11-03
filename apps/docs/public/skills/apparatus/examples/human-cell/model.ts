/**
 * The truth behind the cell: how a human cell gets energy out of glucose.
 *
 * A glucose molecule enters through a transporter in the membrane. In the
 * cytoplasm, glycolysis splits it and nets 2 ATP. What is left goes into a
 * mitochondrion, where it is burned with oxygen and yields about 28 more, so a
 * whole glucose is worth about 30 ATP. The figure releases them where they are
 * really made: two on the way in, the rest from the mitochondrion.
 *
 * Times are the figure's, slowed so each step can be followed; the counts are
 * the cell's.
 */

export const YIELD = {
  /** ATP netted by glycolysis, in the cytoplasm. */
  glycolysis: 2,
  /** ATP from the mitochondrion, per glucose, with oxygen. */
  mitochondrion: 28,
} as const;

export const PER_GLUCOSE = YIELD.glycolysis + YIELD.mitochondrion;

/** How long each leg of a glucose's trip takes, in seconds. */
export const TRIP = {
  /** From the medium through the transporter. */
  enter: 0.9,
  /** Across the cytoplasm, splitting on the way. */
  cross: 1.1,
  /** Inside the mitochondrion, while it burns. */
  burn: 0.9,
} as const;

export const TRIP_TIME = TRIP.enter + TRIP.cross + TRIP.burn;

const grouped = (value: number) => Math.round(value).toLocaleString('en-US');

/** The readout: ATP made so far and the glucose it came from. */
export function describe(atp: number, glucose: number): string {
  if (!atp) return `about ${PER_GLUCOSE} ATP per glucose`;
  if (!glucose) return `${grouped(atp)} ATP · glycolysis so far`;
  return `${grouped(atp)} ATP · from ${glucose} glucose`;
}
