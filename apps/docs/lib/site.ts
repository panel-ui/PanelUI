import meta from '@/scripts/meta.json';

/**
 * How many components the library ships, counted rather than written down.
 *
 * It was written down three times, and by the time anyone noticed, the social
 * card claimed 26, the meta description and the JSON-LD claimed 39, and the
 * library shipped 74. A number that appears in marketing copy is exactly the
 * number nobody remembers to update, so this is counted from the file the
 * documentation is generated from: a component is counted because it has a
 * page, which is the thing the number is claiming.
 *
 * Counted here rather than off the generated sidebar groups, which is where it
 * used to come from: those hold pages, and one of the pages is now the
 * components index, which is not a component.
 */
export const componentCount = Object.keys(meta).length;

/** Canonical site metadata, used by every page's SEO tags and the sitemap. */
export const site = {
  name: 'PanelUI',
  /** Override in the environment to point a preview deploy at its own host. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://panelui.dev',
  tagline: 'React Native UI components for Expo, styled with Tailwind CSS',
  /**
   * Shorter than `tagline`, for the `<title>` tag only. Google truncates a
   * title past roughly 60 characters, and `name` + `tagline` is 71 — so the
   * long form was being cut mid-phrase in the results it was written for.
   * `tagline` still runs in full on the social cards, which have the room.
   */
  titleTagline: 'React Native UI components for Expo',
  /**
   * Kept under 160 characters, which is where Google stops rendering a
   * description. The previous one ran to 270 and its last third — the Expo Go
   * claim, the best part — was never once displayed.
   */
  description:
    `An accessible React Native component library for Expo. ${componentCount} typed ` +
    'components, styled with Tailwind CSS, animated on the UI thread, and running in Expo Go.',
  package: 'panelui-native',
  repo: 'https://github.com/panel-ui/PanelUI',
  npm: 'https://www.npmjs.com/package/panelui-native',
  /** Where the library is written about as it is being built. */
  x: 'https://x.com/KhalidDevLog',
  /**
   * Where the sponsors page sends somebody who wants to fund the work.
   *
   * The handle is the one in `.github/FUNDING.yml`, which is what puts the
   * Sponsor button on the repository. Changing one without the other gives a
   * project two funding destinations, so change both.
   */
  sponsors: 'https://github.com/sponsors/Khalidabdi1',
  /** PanelUI Studio, the hosted feedback and support backend. */
  studio: 'https://studio.panelui.dev/',
  /**
   * Google Analytics measurement ID. Not a secret — it ships in the page
   * source either way — but it lives here so a fork or a preview deploy can
   * point at its own property instead of reporting into this one.
   */
  analyticsId: process.env.NEXT_PUBLIC_GA_ID ?? 'G-B7QYTQH288',
  /**
   * OpenPanel client ID. Public in the same way the measurement ID above is —
   * it ships in the page source — but there is no default, so a fork or a
   * preview deploy that has not set it simply does not report anywhere. The
   * matching client secret is server-only and must never be given a
   * NEXT_PUBLIC_ name.
   */
  openPanelClientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID,
} as const;

/** Absolute URL for a path, for canonical tags and the sitemap. */
export function absoluteUrl(path = '/'): string {
  return new URL(path, site.url).toString();
}
