/**
 * The truth behind the token hopper: a token bucket, the rate limiter most
 * APIs put in front of themselves.
 *
 * The bucket holds up to `capacity` tokens and gains one every `1 / rate`
 * seconds while it has room. A request takes one token and goes through; a
 * request that finds the bucket empty is refused. So a client can burst up to
 * the capacity at once, and after that it gets exactly the refill rate however
 * fast it asks.
 *
 * The hopper's magazine is the bucket, its balls are the tokens, the feeder on
 * top is the refill and the lever is a request.
 */

export const BUCKET = {
  capacity: 5,
  /** Tokens added per second. */
  rate: 1.25,
} as const;

/** Seconds until the next token arrives, from how far the refill has got (0–1). */
export function nextIn(progress: number, tokens: number): number {
  'worklet';
  if (tokens >= BUCKET.capacity) return 0;
  return (1 - progress) / BUCKET.rate;
}

/** The readout: tokens left, when the next one lands, and how many were refused. */
export function describe(tokens: number, wait: number, refused: number): string {
  const head = `${tokens} of ${BUCKET.capacity}`;
  const next = tokens >= BUCKET.capacity ? 'full' : `next ${wait.toFixed(1)} s`;
  return refused ? `${head} · ${next} · ${refused} refused` : `${head} · ${next}`;
}
