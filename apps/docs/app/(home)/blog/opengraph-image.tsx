import { ImageResponse } from 'next/og';
import { getPosts } from '@/lib/blog';
import { OG_SIZE, OgCard } from '@/lib/og-card';
import { site } from '@/lib/site';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = `${site.name} blog`;

/** The blog index's card: the site's own card, naming the blog and its newest post. */
export default function Image() {
  const latest = getPosts()[0];
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Blog"
        title="Notes on building PanelUI"
        description={
          latest
            ? `Latest: ${latest.title}`
            : 'Components, theming, animation and releases for React Native and Expo.'
        }
        footer="panelui.dev/blog"
      />
    ),
    size
  );
}
