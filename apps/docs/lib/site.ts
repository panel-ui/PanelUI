/** Canonical site metadata, used by every page's SEO tags and the sitemap. */
export const site = {
  name: 'PanelUI',
  /** Override in the environment to point a preview deploy at its own host. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://panelui.dev',
  tagline: 'React Native UI components for Expo, styled with Tailwind CSS',
  description:
    'PanelUI is an accessible, high-performance React Native component library for Expo. ' +
    '39 typed components — bottom sheets, dialogs, selects, toasts, forms — styled with ' +
    'Tailwind CSS v4 and animated on the UI thread with Reanimated. Zero native code, so it ' +
    'runs in Expo Go.',
  package: 'panelui-native',
  repo: 'https://github.com/panel-ui/PanelUI',
  npm: 'https://www.npmjs.com/package/panelui-native',
  /**
   * Google Analytics measurement ID. Not a secret — it ships in the page
   * source either way — but it lives here so a fork or a preview deploy can
   * point at its own property instead of reporting into this one.
   */
  analyticsId: process.env.NEXT_PUBLIC_GA_ID ?? 'G-7LGNDVHWPZ',
} as const;

/** Absolute URL for a path, for canonical tags and the sitemap. */
export function absoluteUrl(path = '/'): string {
  return new URL(path, site.url).toString();
}
