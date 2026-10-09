import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description: `What the ${site.name} app and panelui.dev collect, and what they do not.`,
  alternates: { canonical: absoluteUrl('/privacy') },
};

/** Bumped by hand whenever a section below changes meaning. */
const UPDATED = 'October 9, 2026';

/**
 * The privacy policy for the iOS and Android showcase app, and for this site.
 *
 * One page for both because they are one project with one maintainer, and a
 * reader arriving from the App Store listing should not have to work out which
 * of two policies applies to them. The app is first: it is the one a store
 * review links here for.
 *
 * Written as a list of what actually happens rather than as boilerplate. Each
 * paragraph should stay true to the code — when a demo starts sending
 * something somewhere, this page changes in the same commit.
 */
const SECTIONS: { title: string; body: React.ReactNode[] }[] = [
  {
    title: 'The PanelUI app',
    body: [
      'The PanelUI app is a catalogue of components you can try on your phone. It has no accounts, no sign-in, no analytics, no advertising and no tracking. It does not collect, store or sell personal data.',
      'Anything you type or choose in a demo stays on your device, and is gone when you leave the screen or close the app.',
    ],
  },
  {
    title: 'Microphone',
    body: [
      'The Soundwave demos ask for the microphone so the waveform can follow your voice. The sound level is measured on the device to draw the wave. A voice note recorded in a demo is written to a temporary file on the device so it can be played back on the same screen; it is never uploaded, and the system clears it with the app’s cache.',
      'You can say no and use every other part of the app. The demo then draws the wave from a slider instead.',
    ],
  },
  {
    title: 'Location',
    body: [
      'The Map demos ask for your location, only while the app is open, so the map can recentre on where you are. Your location is used on the device to move the map and is not stored or sent to us. You can say no and the maps still work.',
    ],
  },
  {
    title: 'Services the app talks to',
    body: [
      <>
        The Map demos load map tiles from CARTO, built on OpenStreetMap data. Like any web
        request, fetching a tile tells CARTO your IP address and which area of the map is on
        screen. Their handling of it is described in the{' '}
        <Link
          href="https://carto.com/privacy"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          CARTO privacy notice
        </Link>
        .
      </>,
      'When it starts, the app checks Expo’s update service for a newer version of its own code. That request carries the app’s version and platform, not anything about you.',
    ],
  },
  {
    title: 'This website',
    body: [
      'panelui.dev counts visits with three analytics tools: Vercel Web Analytics, which uses no cookies, Google Analytics and OpenPanel. They record things like which pages are read, which site you arrived from, your browser and your approximate region. We use those numbers to decide what to document next. Blocking them in your browser does not change anything on the site.',
    ],
  },
  {
    title: 'Children',
    body: [
      'Neither the app nor the site is directed at children, and neither knowingly collects information from anyone.',
    ],
  },
  {
    title: 'Changes and contact',
    body: [
      <>
        When this policy changes, the date at the top changes with it. Questions about it go to
        the{' '}
        <Link
          href={`${site.repo}/issues`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          issue tracker on GitHub
        </Link>
        .
      </>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-6 pt-20 pb-14">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <p className="text-sm text-muted-foreground">Privacy</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Privacy policy
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground text-balance">
            What the {site.name} app and this website collect, and what they do not.
          </p>
          <p className="text-sm text-muted-foreground">Last updated {UPDATED}</p>
        </div>
      </section>

      <section className="border-t px-6 py-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-12">
          {SECTIONS.map(({ title, body }) => (
            <div key={title} className="flex flex-col gap-3">
              <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
              {body.map((paragraph, index) => (
                <p key={index} className="leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
