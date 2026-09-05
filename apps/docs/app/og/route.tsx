import { createHash } from 'node:crypto';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { OG_SIZE, OgCard } from '@/lib/og-card';
import { site } from '@/lib/site';

/**
 * Social card generator, driven by query params.
 *
 * A route handler rather than a colocated `opengraph-image.tsx`: the docs
 * route is an optional catch-all (`[[...slug]]`), and Next forbids nesting a
 * file segment under one.
 *
 * The card itself is `lib/og-card.tsx`, shared with the root image so the two
 * cannot drift.
 */

/**
 * A year, and unconditional. The card is a pure function of the query string —
 * change the title and the URL changes with it — so there is no version of
 * this image that goes stale at its own address.
 *
 * Both figures on purpose: `max-age` is what a browser reads and `s-maxage`
 * what the CDN in front of this route reads. With only the first, every
 * request reached the function and re-rendered the PNG.
 */
const CACHE = 'public, max-age=31536000, s-maxage=31536000, immutable';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title')?.slice(0, 90) ?? site.name;
  const description = searchParams.get('description')?.slice(0, 130) ?? site.tagline;
  const eyebrow = searchParams.get('eyebrow') ?? `${site.name} docs`;

  const image = new ImageResponse(
    (
      <OgCard
        eyebrow={eyebrow}
        title={title}
        description={description}
        footer={`npm i ${site.package}`}
      />
    ),
    OG_SIZE
  );

  /*
   * Drained into a buffer rather than passed straight through.
   *
   * An `ImageResponse` is a stream, and a streamed response carries no
   * `Content-Length` and no `ETag` — the two things the site's other card, a
   * file on the CDN, has and this one did not. The audience for this route is
   * a link crawler unfurling a URL somebody pasted: it fetches the image once,
   * out of band, and gives up quietly, so it never reports what it disliked.
   * Holding 40KB to declare a length and an entity tag is the cheapest way to
   * stop guessing at that.
   */
  const body = await image.arrayBuffer();

  return new Response(body, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(body.byteLength),
      'Cache-Control': CACHE,
      ETag: `"${createHash('sha1').update(Buffer.from(body)).digest('hex')}"`,
    },
  });
}
