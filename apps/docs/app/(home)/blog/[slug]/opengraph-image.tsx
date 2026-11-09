import { ImageResponse } from 'next/og';
import { authorOf, formatDate, getPost, getPosts, slugOf } from '@/lib/blog';
import { COVER_HEIGHT, COVER_WIDTH, COVERS } from '@/lib/blog-covers';
import { OG_SIZE } from '@/lib/og-card';
import { site } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = `${site.name} blog`;

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: slugOf(post) }));
}

/**
 * The cover's roles in fixed colours. A social card is a picture of the page,
 * not the page, so there is no reader's theme to follow; it is drawn dark.
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

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const rows = post ? COVERS[post.cover] : undefined;
  const scale = 8;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#18181b',
          color: '#f5f5f5',
          padding: 56,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
            <div style={{ fontSize: 26, color: '#a1a1aa' }}>{`${site.name} blog`}</div>
            <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1 }}>
              {post?.title ?? site.name}
            </div>
          </div>
          {rows ? (
            <svg
              width={COVER_WIDTH * scale}
              height={COVER_HEIGHT * scale}
              viewBox={`0 0 ${COVER_WIDTH} ${COVER_HEIGHT}`}
              shapeRendering="crispEdges"
            >
              {rows.flatMap((row, y) =>
                [...row].map((char, x) =>
                  char === '.' ? null : (
                    <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[char]} />
                  )
                )
              )}
            </svg>
          ) : null}
        </div>
        <div style={{ fontSize: 26, color: '#a1a1aa' }}>
          {post ? `${authorOf(post).name} · ${formatDate(post.date)}` : site.url}
        </div>
      </div>
    ),
    size
  );
}
