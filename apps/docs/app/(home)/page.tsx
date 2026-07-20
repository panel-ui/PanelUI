import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AccessibilityIcon,
  ArrowRightIcon,
  GaugeIcon,
  MoonStarIcon,
  PackageIcon,
  PaletteIcon,
  ZapIcon,
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
import { CopyInstall } from '@/components/copy-install';
import { absoluteUrl, site } from '@/lib/site';

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  alternates: { canonical: absoluteUrl('/') },
};

const INSTALL = 'npx expo install panelui-native';

const FEATURES = [
  {
    icon: ZapIcon,
    title: 'Tailwind CSS for React Native',
    body: 'Built on Uniwind — no Babel transform, and roughly 2.4–3× faster styling than NativeWind.',
  },
  {
    icon: GaugeIcon,
    title: '60fps on the UI thread',
    body: 'Press feedback, switches, sheets, dialogs and tabs run on Reanimated 4 and never touch the JS thread.',
  },
  {
    icon: PaletteIcon,
    title: 'Six themes, three families',
    body: 'A theme sets radius as well as colour, so switching one restyles the shape of the UI too.',
  },
  {
    icon: MoonStarIcon,
    title: 'Native dark mode',
    body: 'Theme changes are applied natively by Uniwind, without re-rendering your component tree.',
  },
  {
    icon: AccessibilityIcon,
    title: 'Accessible by default',
    body: 'Every interactive component wires up its role, mirrors its state, and hides decorative icons from screen readers.',
  },
  {
    icon: PackageIcon,
    title: 'Zero native modules',
    body: 'Pure TypeScript, tree-shakeable and typed. Runs in Expo Go with no prebuild.',
  },
];

const COMPONENTS = [
  ['Accordion', 'accordion'], ['Alert', 'alert'], ['Avatar', 'avatar'],
  ['Badge', 'badge'], ['BottomSheet', 'bottom-sheet'], ['Button', 'button'],
  ['Card', 'card'], ['Checkbox', 'checkbox'], ['Dialog', 'dialog'],
  ['EmptyState', 'empty-state'], ['Frame', 'frame'], ['InlineSelect', 'inline-select'],
  ['Input', 'input'], ['InputGroup', 'input-group'], ['Label', 'label'],
  ['Progress', 'progress'], ['RadioGroup', 'radio-group'], ['Select', 'select'],
  ['Skeleton', 'skeleton'], ['Spinner', 'spinner'], ['Steps', 'steps'],
  ['Switch', 'switch'], ['Tabs', 'tabs'], ['Timeline', 'timeline'],
  ['Toast', 'toast'], ['Typography', 'typography'],
] as const;

const THEMES = [
  { name: 'Panel', body: 'The Coss default — neutral greys, moderate corners.', swatch: '#262626' },
  { name: 'Moon', body: 'Monochrome and high-contrast, with tight corners.', swatch: '#0070f3' },
  { name: 'Grass', body: 'Green accent on warm neutrals, soft generous corners.', swatch: '#24b47e' },
];

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
    a: '26, covering overlays, forms, feedback and layout — from bottom sheets and dialogs to timelines, steppers and toasts.',
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

      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-6 py-24 text-center">
        <Badge variant="secondary">26 components · MIT · Expo SDK 57+</Badge>
        <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          React Native UI components for Expo, styled with Tailwind CSS
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground text-balance">
          Accessible, high-performance components — bottom sheets, dialogs, selects, toasts,
          forms — animated on the UI thread with Reanimated. Zero native code, so it runs in
          Expo Go.
        </p>

        <CopyInstall command={INSTALL} />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button render={<Link href="/docs" />}>
            Get started
            <ArrowRightIcon />
          </Button>
          <Button variant="outline" render={<Link href={site.repo} />}>
            View on GitHub
          </Button>
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
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="mb-2 size-5 text-muted-foreground" aria-hidden="true" />
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Components */}
      <section className="border-t px-6 py-20" id="components">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              26 components, documented
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Each page covers the anatomy, every prop, and the variants — read straight from
              the library's TypeScript, so it cannot drift from the code.
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {COMPONENTS.map(([name, slug]) => (
              <li key={slug}>
                <Link
                  href={`/docs/components/${slug}`}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:bg-accent"
                >
                  {name}
                  <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
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
              Tokens come from Coss UI. A family sets its own radius scale as well as its
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

          <Button variant="outline" className="self-start" render={<Link href="/docs/theming" />}>
            Read the theming guide
            <ArrowRightIcon />
          </Button>
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
          <p>MIT © Khalid Abdi</p>
          <nav className="flex gap-6" aria-label="Footer">
            <Link href="/docs" className="hover:text-foreground">
              Documentation
            </Link>
            <Link href={site.npm} className="hover:text-foreground">
              npm
            </Link>
            <Link href={site.repo} className="hover:text-foreground">
              GitHub
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
