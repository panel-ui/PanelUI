/**
 * Cover images for blog posts, by the key a post names in its frontmatter
 * (`cover: <key>`).
 *
 * Each cover is a 16:9 image in `public/blog/covers`: a WebP at the width of
 * the article column on a high-density screen, and a smaller JPEG for the
 * social card, which embeds the image in the card and does not take WebP.
 * The images sit on a mid-grey ground, so one file reads in either theme.
 */
export interface BlogCover {
  /** The page's image, 1600 × 900. */
  src: string;
  /** The social card's image, 800 × 450. */
  card: string;
  width: number;
  height: number;
  /** What the image shows, for a screen reader. */
  alt: string;
}

export const COVERS: Record<string, BlogCover> = {
  'why-panelui-exists': {
    src: '/blog/covers/why-panelui-exists.webp',
    card: '/blog/covers/why-panelui-exists-card.jpg',
    width: 1600,
    height: 900,
    alt: 'A phone with interface pieces drifting in from either side and settling into place on its screen: a toggle, a button, a chart, a calendar and a bottom sheet.',
  },
  'end-of-react-native': {
    src: '/blog/covers/end-of-react-native.webp',
    card: '/blog/covers/end-of-react-native-card.jpg',
    width: 1600,
    height: 900,
    alt: 'A phone whose screen, showing a glowing atom, is split by a crack down the middle, with a question mark behind it and three coloured blocks to its right.',
  },
};
