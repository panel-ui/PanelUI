/**
 * Apps built with PanelUI, as listed on /showcase.
 *
 * Adding one is a pull request to this file: one entry, with its screens in
 * `public/showcase/<slug>/`. Screens are whole frames at their real pixel size
 * — the dialog sizes each one from `width` and `height`, so a wrong number is a
 * screenshot that jumps as it loads.
 */
export interface ShowcaseScreen {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ShowcaseApp {
  /** Stable id, also the folder its images live in. */
  slug: string;
  name: string;
  /** One line under the name on the card. */
  tagline: string;
  /** A short paragraph for the dialog: what the app does, in its own terms. */
  description: string;
  /** Who makes it, and where to find them. */
  maker: { name: string; url: string };
  /** The app's website. */
  url: string;
  appStore?: string;
  playStore?: string;
  /** Square app icon. */
  icon: string;
  /** Which PanelUI package it uses. */
  uses: 'panelui-native' | 'panelui-web' | 'both';
  /** Screenshots, shown in the dialog in this order; the first is the card's. */
  screens: ShowcaseScreen[];
}

const PHONE = { width: 880, height: 1912 };

export const SHOWCASE: ShowcaseApp[] = [
  {
    slug: 'outlayr',
    name: 'Outlayr',
    tagline: 'Expense tracker, budgets and subscriptions',
    description:
      'Outlayr logs a purchase from one typed or spoken sentence, a receipt scan or a bank export. ' +
      'Budgets, goals, subscriptions and spending insights update as you log, in any of 165 ' +
      'currencies, and entries are saved on the phone first so it works offline.',
    maker: { name: 'danestves', url: 'https://github.com/danestves' },
    url: 'https://tryoutlayr.com',
    appStore: 'https://apps.apple.com/app/id6801652978',
    playStore: 'https://play.google.com/store/apps/details?id=com.tryoutlayr.app',
    icon: '/showcase/outlayr/icon.jpg',
    uses: 'panelui-native',
    screens: [
      { src: '/showcase/outlayr/log.webp', alt: 'The Log screen: net this month, accounts and today’s expenses', ...PHONE },
      { src: '/showcase/outlayr/budgets.webp', alt: 'Budgets: what is left this month and where spending is heading', ...PHONE },
      { src: '/showcase/outlayr/insights.webp', alt: 'Insights: spending by day and by category', ...PHONE },
      { src: '/showcase/outlayr/subscriptions.webp', alt: 'Upcoming subscriptions and bills, with what each costs', ...PHONE },
      { src: '/showcase/outlayr/accounts.webp', alt: 'Accounts across currencies', ...PHONE },
    ],
  },
];
