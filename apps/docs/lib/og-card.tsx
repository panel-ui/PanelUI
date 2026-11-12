import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { site } from '@/lib/site';

/**
 * The social card, shared by the site's root image and the per-page generator.
 *
 * One component because there are two entry points — `app/opengraph-image.tsx`
 * for the root and `app/og/route.tsx` for every docs page — and a card is the
 * kind of thing nobody re-checks once it looks right. Drawn twice, the two
 * drift, and the drift is invisible until someone shares a link.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * The mark, inlined as a data URI.
 *
 * Satori has no network: an `<img src="/logo-dark.png">` renders as nothing at
 * all rather than failing, so the bytes have to be in the document. Read once
 * at module load — these routes are prerendered, so this happens at build.
 *
 * `logo-dark.png` is the variant drawn *on* dark surfaces — white on
 * transparent — which is what this card's background needs. The names follow
 * the theme the mark belongs to, not the colour of its ink.
 */
const LOGO = `data:image/png;base64,${fs
  .readFileSync(path.join(process.cwd(), 'public', 'logo-dark.png'))
  .toString('base64')}`;

const INK = '#fafafa';
const MUTED = '#a1a1a1';
const LINE = 'rgba(250,250,250,0.12)';

export interface OgCardProps {
  /** Small line above the title — the section, or what kind of page this is. */
  eyebrow: string;
  title: string;
  description: string;
  /** Bottom-left slot. The install line on the root, the URL on a docs page. */
  footer: string;
  /**
   * A picture beside the title, such as a blog post's cover. The title column
   * narrows to make room; everything else on the card stays where it is, so a
   * card with art is still recognisably the same card.
   */
  art?: ReactNode;
}

export function OgCard({ eyebrow, title, description, footer, art }: OgCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        color: INK,
        fontFamily: 'sans-serif',
        // Not a flat fill: a card that is one solid colour edge to edge reads
        // as a screenshot of nothing. The lift toward the top-left sits under
        // the mark and gives the panel a light source.
        backgroundColor: '#0a0a0a',
        backgroundImage:
          'radial-gradient(900px 500px at 12% -10%, #232323 0%, rgba(35,35,35,0) 60%)',
      }}
    >
      {/* Masthead: the mark, the name, and the section it belongs to. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <img src={LOGO} width={64} height={64} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>
            {site.name}
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>{eyebrow}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              fontSize: art ? 58 : 66,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: art ? 26 : 29, color: MUTED, lineHeight: 1.35 }}>
            {description}
          </div>
        </div>
        {art ? <div style={{ display: 'flex', flexShrink: 0 }}>{art}</div> : null}
      </div>

      {/* A rule above the footer so the card has a floor, and the footer reads
          as chrome rather than as a third line of the description. */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', height: 1, backgroundColor: LINE, marginBottom: 26 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 25,
              color: INK,
              border: `1px solid ${LINE}`,
              borderRadius: 10,
              padding: '10px 18px',
            }}
          >
            {footer}
          </div>
          <div style={{ display: 'flex', fontSize: 25, color: MUTED }}>panelui.dev</div>
        </div>
      </div>
    </div>
  );
}
