import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  InboxIcon,
  MegaphoneIcon,
  MessageSquareIcon,
} from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Hero } from '@/components/hero';
import { IsoFigure, type IsoFigureKind } from '@/components/iso-figures';
import { LayoutLink } from '@/components/layout-link';
import { Showcase } from '@/components/showcase';
import { absoluteUrl, site } from '@/lib/site';
import meta from '@/scripts/meta.json';

export const metadata: Metadata = {
  // `absolute` because this title already carries the brand. A plain string
  // here goes through the root's `%s — PanelUI` template and comes out saying
  // PanelUI twice, which is what the home page was serving.
  title: { absolute: `${site.name} — ${site.titleTagline}` },
  description: site.description,
  alternates: { canonical: absoluteUrl('/') },
};

/**
 * What the web collection holds itself to. The first is the wide card: two of
 * its claims are one act, adding a component and having it come out in your
 * colours, and it gets the room to show that as one thing.
 */
const WEB_FEATURES: { figure: IsoFigureKind; title: string; body: string }[] = [
  {
    figure: 'workbench',
    title: 'Copied in, and drawn in your theme',
    body: 'A component is a file the shadcn CLI adds to your project, yours to read and to change. Its colour is one of five roles your theme defines, so it matches the rest of your interface in light and dark.',
  },
  {
    figure: 'arrows',
    title: 'Keyboard first, motion optional',
    body: 'Grids, boards and canvases take the arrow keys. Every animation stops for anyone who has asked for reduced motion.',
  },
  {
    figure: 'twins',
    title: 'The same parts as the app',
    body: 'KPI and Flow have the parts and props of the React Native library. KPI runs on the server and sends no JavaScript.',
  },
];

const FEATURES: { figure: IsoFigureKind; title: string; body: string }[] = [
  {
    figure: 'tailwind',
    title: 'Tailwind CSS for React Native',
    body: 'Built on Uniwind — no Babel transform, and roughly 2.4–3× faster styling than NativeWind.',
  },
  {
    figure: 'fps',
    title: '60fps on the UI thread',
    body: 'Press feedback, switches, sheets, dialogs and tabs run on Reanimated 4 and never touch the JS thread.',
  },
  {
    figure: 'themes',
    title: 'Six themes, three families',
    body: 'A theme sets radius as well as colour, so switching one restyles the shape of the UI too.',
  },
  {
    figure: 'dark',
    title: 'Native dark mode',
    body: 'Theme changes are applied natively by Uniwind, without re-rendering your component tree.',
  },
  {
    figure: 'a11y',
    title: 'Accessible by default',
    body: 'Every interactive component wires up its role, mirrors its state, and hides decorative icons from screen readers.',
  },
  {
    figure: 'native',
    title: 'Zero native modules',
    body: 'Pure TypeScript, tree-shakeable and typed. Runs in Expo Go with no prebuild.',
  },
];

/**
 * Counted from the same file the documentation is generated from, rather than
 * written here.
 *
 * The number was once kept beside a hand-written list, which meant it went
 * stale every time a component shipped. A component is counted now because it
 * has a page, which is the thing the number is actually claiming.
 */
const COMPONENT_COUNT = Object.keys(meta).length;

const THEMES = [
  { name: 'Panel', body: 'The default — neutral greys, moderate corners.', swatch: '#262626' },
  {
    name: 'Moon',
    body: 'A near-black canvas, a lavender accent, and elevation carried by hairlines.',
    swatch: '#5e6ad2',
  },
  { name: 'Grass', body: 'Green accent on warm neutrals, soft generous corners.', swatch: '#24b47e' },
];

const STUDIO_TOOLS = [
  {
    icon: MessageSquareIcon,
    title: 'Feedback',
    body: 'Reports with screenshots and device context, each one a two-way conversation.',
  },
  {
    icon: MegaphoneIcon,
    title: 'Announcements',
    body: 'Write a message once and show it in every app that asks for it.',
  },
  {
    icon: InboxIcon,
    title: 'Support inbox',
    body: 'Users start a conversation themselves, and your team answers from one place.',
  },
];

/**
 * The inbox thread drawn beside the Studio copy. Static markup, not a
 * screenshot, so it follows the active theme and stays sharp at any size.
 */
const STUDIO_THREAD = {
  number: 42,
  title: 'The workout screen freezes.',
  context: ['iOS 26.1', 'v2.4.0 (118)', '/workout/start', 'en-GB'],
  messages: [
    { mine: false, author: 'User', body: 'Tapping start does nothing after the update.' },
    { mine: true, author: 'You', body: 'Thanks — fixed in 2.4.1, out today. Can you try again?' },
    { mine: false, author: 'User', body: 'Works now, thank you!' },
  ],
};

/** Reused from the README — these are the questions people actually search. */
const FAQ = [
  {
    q: 'How is PanelUI different from NativeWind?',
    a: 'NativeWind is a styling engine; PanelUI is a component library. PanelUI is built on Uniwind, a faster Tailwind v4 engine for React Native that skips the Babel transform and applies theme changes natively.',
  },
  {
    q: 'Does it work with Expo Go?',
    a: 'Yes. PanelUI is pure TypeScript with no native modules, so no development build or prebuild is required.',
  },
  {
    q: 'Is it accessible?',
    a: 'Every interactive component sets an accessibility role, mirrors its state through accessibilityState, and exposes labels. Decorative icons are hidden from screen readers.',
  },
  {
    q: 'Can I use it in a bare React Native app?',
    a: 'Yes, as long as Uniwind, Reanimated and Gesture Handler are configured. Expo is the tested path.',
  },
  {
    q: 'How many components are there?',
    a: `${COMPONENT_COUNT}, covering overlays, forms, feedback, data and layout — from bottom sheets and popovers to chat transcripts, animated line charts, file attachments, timelines and toasts.`,
  },
  {
    q: 'Does PanelUI work on the web?',
    a: 'The React Native library is for iOS and Android. For the web there is a separate collection of React components built on shadcn/ui, installed one at a time from a registry or from npm. Components that exist in both, such as KPI and Flow, have the same parts and props.',
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Rich result / AI answer metadata for the package itself. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'SoftwareApplication',
                name: site.name,
                description: site.description,
                url: site.url,
                applicationCategory: 'DeveloperApplication',
                operatingSystem: 'iOS, Android',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                license: 'https://opensource.org/licenses/MIT',
                author: { '@type': 'Person', name: 'Khalid Abdi' },
                softwareHelp: absoluteUrl('/docs'),
                downloadUrl: site.npm,
              },
              {
                '@type': 'FAQPage',
                mainEntity: FAQ.map(({ q, a }) => ({
                  '@type': 'Question',
                  name: q,
                  acceptedAnswer: { '@type': 'Answer', text: a },
                })),
              },
            ],
          }),
        }}
      />

      <Hero />

      <Showcase />

      {/* The web collection */}
      <section className="border-t px-6 py-20" id="web">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              And built for the web you already have
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              A collection of components for React, built on shadcn/ui. Each one is copied into
              your project, drawn in your theme, and usable from the keyboard.
            </p>
          </div>

          {/*
            One card the width of the section over two that share it, where
            the section above is a grid of six equals. The wide card is the
            figure with two machines on it, so its panel is the shape of a
            bench, and its words sit beside the bench and not under it.
          */}
          <div className="grid gap-4 lg:grid-cols-2">
            {WEB_FEATURES.map(({ figure, title, body }, index) =>
              index === 0 ? (
                <Card
                  key={title}
                  className="lg:col-span-2 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]"
                >
                  <CardHeader className="justify-center lg:py-10">
                    <CardTitle className="text-2xl leading-tight">{title}</CardTitle>
                    <CardDescription className="text-base">{body}</CardDescription>
                  </CardHeader>
                  <div className="flex flex-col justify-center border-t px-5 pt-4 pb-3 lg:border-s lg:border-t-0">
                    <IsoFigure kind={figure} />
                  </div>
                </Card>
              ) : (
                <Card key={title}>
                  <div className="border-b px-5 pt-4 pb-3">
                    <IsoFigure kind={figure} />
                  </div>
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{body}</CardDescription>
                  </CardHeader>
                </Card>
              )
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/docs/web/components" />}>
              See the web components
              <ArrowRightIcon />
            </Button>
            <Button variant="outline" render={<Link href="/docs/web/installation" />}>
              Install for your framework
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t px-6 py-20" id="features">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Built for production Expo apps
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Every component follows the same rules: variants computed once at module scope,
              animations on the UI thread, and overlays that unmount after they animate out.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ figure, title, body }) => (
              <Card key={title}>
                <div className="border-b px-5 pt-4 pb-3">
                  <IsoFigure kind={figure} />
                </div>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Theming */}
      <section className="border-t px-6 py-20" id="theming">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Three theme families, light and dark
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              A family sets its own radius scale as well as its
              palette, so switching one changes the shape of the UI, not just the colour.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {THEMES.map(({ name, body, swatch }) => (
              <Card key={name}>
                <CardHeader>
                  <span
                    className="mb-3 block size-8 rounded-full"
                    style={{ backgroundColor: swatch }}
                    aria-hidden="true"
                  />
                  <CardTitle>{name}</CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Button variant="outline" className="self-start" render={<Link href="/docs/customization/theming" />}>
            Read the theming guide
            <ArrowRightIcon />
          </Button>
        </div>
      </section>

      {/* Studio */}
      <section className="border-t px-6 py-20" id="studio">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Badge variant="secondary" className="self-start">
                PanelUI Studio · Free for one project
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight">
                Feedback and support, answered from one inbox
              </h2>
              <p className="max-w-xl text-muted-foreground">
                Studio is the hosted backend for what your users send. Install the{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
                  panelui-studio
                </code>{' '}
                SDK, ship a publishable key, and reply from an inbox your team shares. You
                run no backend of your own, and your users need no account.
              </p>
            </div>

            <ul className="flex flex-col gap-4">
              {STUDIO_TOOLS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card">
                    <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <Button render={<Link href={site.studio} target="_blank" rel="noreferrer" />}>
                Explore Studio
                <ArrowUpRightIcon />
              </Button>
              <Button variant="outline" render={<Link href="/docs/studio" />}>
                Read the Studio docs
              </Button>
            </div>
          </div>

          {/* An example thread, drawn on a dot grid so it reads as a product
              surface rather than one more card in the page's card grids. */}
          <div className="relative rounded-2xl border bg-muted/40 p-4 sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px]"
              aria-hidden="true"
            />
            <Card
              className="relative gap-0 overflow-hidden py-0 shadow-lg"
              role="figure"
              aria-label="An example Studio conversation"
            >
              <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <InboxIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">Inbox</span>
                </div>
                <Badge variant="success">Resolved</Badge>
              </div>

              <div className="flex flex-col gap-3 border-b px-5 py-4">
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground">#{STUDIO_THREAD.number}</span>{' '}
                  {STUDIO_THREAD.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STUDIO_THREAD.context.map((item) => (
                    <Badge key={item} variant="outline" className="font-mono">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <ol className="flex flex-col gap-3 px-5 py-5">
                {STUDIO_THREAD.messages.map(({ mine, author, body }) => (
                  <li
                    key={body}
                    className={mine ? 'flex flex-col items-end gap-1' : 'flex flex-col items-start gap-1'}
                  >
                    <span className="px-1 text-xs text-muted-foreground">{author}</span>
                    <p
                      className={
                        mine
                          ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground'
                          : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm'
                      }
                    >
                      {body}
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t px-6 py-20" id="faq">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>

          <Accordion>
            {FAQ.map(({ q, a }) => (
              <AccordionItem key={q}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionPanel>{a}</AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <p>MIT © Khalid Abdi</p>
            <p>
              Analytics provided by{' '}
              <a
                href="https://openpanel.dev"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                OpenPanel
              </a>
            </p>
          </div>
          {/* Six links are wider than a phone, so they wrap to a second row
              there in place of pushing the page sideways. */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Footer">
            <LayoutLink href="/docs" className="hover:text-foreground">
              Documentation
            </LayoutLink>
            <LayoutLink href="/docs/components" className="hover:text-foreground">
              Components
            </LayoutLink>
            <Link href={site.npm} className="hover:text-foreground">
              npm
            </Link>
            <Link href={site.repo} className="hover:text-foreground">
              GitHub
            </Link>
            <LayoutLink href="/privacy" className="hover:text-foreground">
              Privacy
            </LayoutLink>
            {/* A mark rather than a word. The row beside it is four
                destinations named in text, and a fifth reading "X" is a letter
                nobody would recognise as a link to anywhere. */}
            <Link
              href={site.x}
              aria-label={`${site.name} on X`}
              className="inline-flex items-center hover:text-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
