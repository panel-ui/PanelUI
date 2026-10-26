'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, GlobeIcon, SmartphoneIcon } from 'lucide-react';
import { Tabs } from 'panelui-web/tabs';
import { DissolveText } from '@/components/dithercn/dissolve-text';
import { DitherGlow } from '@/components/dithercn/dither-glow';
import { CopyInstall } from '@/components/copy-install';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/lib/dither';

type Platform = 'expo' | 'web';

/**
 * The two collections, each with the one command that works from nothing and
 * where its two buttons lead.
 *
 * Expo scaffolds a whole app rather than running `npx expo install
 * panelui-native`: a visitor with no app yet would copy that into an empty
 * folder and get a package with no project around it. The web line copies one
 * component into a project that already has shadcn, which is how the web
 * collection is installed.
 */
const PLATFORMS: {
  value: Platform;
  label: string;
  icon: typeof SmartphoneIcon;
  command: string;
  start: string;
  browse: string;
}[] = [
  {
    value: 'expo',
    label: 'Expo',
    icon: SmartphoneIcon,
    command: 'npx create-panelui-app@latest',
    start: '/docs',
    browse: '/docs/components',
  },
  {
    value: 'web',
    label: 'Web',
    icon: GlobeIcon,
    command: 'npx shadcn@latest add https://panelui.dev/r/web/button.json',
    start: '/docs/web',
    browse: '/docs/web/components',
  },
];

/**
 * The glow's settings, the same on every side: the ink colour, about a third
 * of full strength, reaching four tenths of the way across its box.
 */
const GLOW = {
  intensity: 0.35,
  radius: 0.4,
  palette: ['transparent', '--dither-ink'],
} as const;

/** The words the headline ends on, in turn. */
const WORDS = ['app', 'website'];
/** How long a word stays, and how long it takes to dissolve out, in ms. */
const HOLD = 2600;
const EXIT = 520;

/**
 * Steps through `WORDS`: holds a word, dissolves it out, swaps in the next.
 * Under reduced motion it stays on the first word, because a headline that
 * changes by itself is motion too.
 */
function useWordCycle() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (reduced) {
      setIndex(0);
      setShow(true);
      return;
    }
    const timer = setTimeout(
      () => {
        if (show) {
          setShow(false);
        } else {
          setIndex((value) => (value + 1) % WORDS.length);
          setShow(true);
        }
      },
      show ? HOLD : EXIT
    );
    return () => clearTimeout(timer);
  }, [show, reduced]);

  return { word: WORDS[index] ?? WORDS[0], index, show };
}

export function Hero() {
  const [platform, setPlatform] = useState<Platform>('expo');
  const { word, index, show } = useWordCycle();

  return (
    <section className="relative isolate flex flex-col items-center px-6 pt-44 pb-24 text-center sm:pt-56">
      {/*
        Light on three sides, each glow in a box of its own that stops short
        of the text: a band above it, and on wide screens a column either side
        that ends 48px before the text column. Each box fades out towards the
        text, so not one dot lands behind a word. Phones have no room beside
        the text, so they get the band alone. The paper is transparent so the
        boxes can meet without one covering another.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 sm:h-44 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]"
      >
        <DitherGlow position="top" {...GLOW} className="absolute inset-0" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 hidden w-[calc(50%-31rem)] [mask-image:linear-gradient(to_right,#000_55%,transparent)] xl:block"
      >
        <DitherGlow position="left" {...GLOW} className="absolute inset-0" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[calc(50%-31rem)] [mask-image:linear-gradient(to_left,#000_55%,transparent)] xl:block"
      >
        <DitherGlow position="right" {...GLOW} className="absolute inset-0" />
      </div>

      <div className="flex w-full max-w-4xl flex-col items-center gap-6">
        {/*
          The sentence a reader or a search engine gets is the whole one; the
          cycling word is drawn beside it for the eye only.
        */}
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          <span className="sr-only">Beautiful components for your app and your website</span>
          <span aria-hidden="true" className="block">
            <span className="text-muted-foreground">Beautiful components for your</span>
            <br />
            <DissolveText
              key={index}
              show={show}
              trigger="mount"
              duration={440}
              stagger={22}
              direction="random"
              color="ink"
              accent="--foreground"
            >
              {word}
            </DissolveText>
          </span>
        </h1>

        <p className="max-w-2xl text-lg text-muted-foreground text-balance">
          Accessible, animated components for Expo and the web, styled with Tailwind.
        </p>

        <Tabs
          value={platform}
          onValueChange={(value) => setPlatform(value as Platform)}
          className="w-full items-center gap-2"
        >
          <Tabs.List aria-label="Platform">
            {PLATFORMS.map(({ value, label, icon: Icon }) => (
              <Tabs.Trigger key={value} value={value}>
                <Icon aria-hidden="true" />
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {PLATFORMS.map(({ value, command, start, browse }) => (
            <Tabs.Content
              key={value}
              value={value}
              className="flex w-full flex-col items-center gap-6"
            >
              <CopyInstall key={command} command={command} />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button render={<Link href={start} />}>
                  Get Started
                  <ArrowRightIcon />
                </Button>
                <Button variant="outline" render={<Link href={browse} />}>
                  Browse Components
                </Button>
              </div>
            </Tabs.Content>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
