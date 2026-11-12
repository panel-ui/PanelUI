import { ImageResponse } from 'next/og';
import { authorOf, formatDate, getPost, getPosts, slugOf } from '@/lib/blog';
import { COVER_HEIGHT, COVER_WIDTH, COVERS } from '@/lib/blog-covers';
import { OG_SIZE, OgCard } from '@/lib/og-card';
import { site } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = `${site.name} blog`;

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: slugOf(post) }));
}

/**
 * The cover's roles in fixed colours. A social card is a picture of the page,
 * not the page, so there is no reader's theme to follow; it is drawn dark, to
 * sit on the card's own dark ground.
 */
const PALETTE: Record<string, string> = {
  '-': '#2d2d32',
  '#': '#f0f0f0',
  o: '#1e1e22',
  c: '#26262b',
  m: '#78787f',
  p: '#f0f0f0',
  '1': '#1d4ed8',
  '2': '#10b981',
  '3': '#f59e0b',
  '4': '#a855f7',
  '5': '#f43f5e',
};

/** Cut at a word, with an ellipsis, so the description keeps to two lines beside the cover. */
const clamp = (text: string, length: number) => {
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
};

/** The post's card: the site's own card, with the post's cover beside its title. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const rows = post ? COVERS[post.cover] : undefined;
  const scale = 6;

  const cover = rows ? (
    <svg
      width={COVER_WIDTH * scale}
      height={COVER_HEIGHT * scale}
      viewBox={`0 0 ${COVER_WIDTH} ${COVER_HEIGHT}`}
      shapeRendering="crispEdges"
      style={{ borderRadius: 16, background: '#1a1a1d' }}
    >
      {rows.flatMap((row, y) =>
        [...row].map((char, x) =>
          char === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[char]} />
        )
      )}
    </svg>
  ) : undefined;

  return new ImageResponse(
    (
      <OgCard
        eyebrow={post?.tags[0] ? `Blog · ${post.tags[0]}` : 'Blog'}
        title={post?.title ?? site.name}
        description={clamp(post?.description ?? site.tagline, 84)}
        footer={post ? `${authorOf(post).name} · ${formatDate(post.date)}` : site.url}
        art={cover}
      />
    ),
    size
  );
}
