import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { site } from '@/lib/site';

/**
 * Social card generator, driven by query params.
 *
 * A route handler rather than a colocated `opengraph-image.tsx`: the docs
 * route is an optional catch-all (`[[...slug]]`), and Next forbids nesting a
 * file segment under one.
 */
export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title')?.slice(0, 90) ?? site.name;
  const description = searchParams.get('description')?.slice(0, 130) ?? site.tagline;
  const eyebrow = searchParams.get('eyebrow') ?? `${site.name} docs`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0a',
          padding: 80,
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, color: '#a1a1a1' }}>{eyebrow}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#a1a1a1', lineHeight: 1.35 }}>
            {description}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#a1a1a1' }}>panelui.dev</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
