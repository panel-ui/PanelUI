import { ImageResponse } from 'next/og';
import { site } from '@/lib/site';

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Social card for the site root. Component pages generate their own. */
export default function Image() {
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
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 600 }}>
          {site.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 600, lineHeight: 1.1 }}>
            {site.tagline}
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#a1a1a1' }}>
            26 accessible components · Reanimated · Expo Go
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#a1a1a1' }}>
          npm i {site.package}
        </div>
      </div>
    ),
    size
  );
}
