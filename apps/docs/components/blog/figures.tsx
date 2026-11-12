import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * Figures for blog posts, drawn in the page rather than as images so they
 * follow the reader's theme and stay sharp at any width. Brand marks are the
 * files in `public/blog/icons`, from theSVG's catalogue.
 */

type Brand = 'expo' | 'react' | 'shopify' | 'discord' | 'rust' | 'swift' | 'kotlin';

/** Marks drawn in one colour, which take the text colour instead of their own. */
const MONO: ReadonlySet<Brand> = new Set(['rust', 'expo']);

function BrandMark({ brand, className }: { brand: Brand; className?: string }) {
  const src = `/blog/icons/${brand}.svg`;
  if (MONO.has(brand)) {
    return (
      <span
        aria-hidden="true"
        className={cn('inline-block size-5 shrink-0 bg-foreground', className)}
        style={{ mask: `url(${src}) center / contain no-repeat`, WebkitMask: `url(${src}) center / contain no-repeat` }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden="true" className={cn('size-5 shrink-0 object-contain', className)} />;
}

function Figure({ caption, children }: { caption: ReactNode; children: ReactNode }) {
  return (
    <figure className="not-prose my-10 flex flex-col gap-3">
      <div className="rounded-2xl border bg-card p-4 sm:p-6">{children}</div>
      <figcaption className="px-1 text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

const EVENTS: { date: string; brand: Brand; title: string; detail: string }[] = [
  {
    date: '24 Feb',
    brand: 'react',
    title: 'React Native moves to the React Foundation',
    detail: 'Meta hands React and React Native to a foundation run by eight companies, Expo among them.',
  },
  {
    date: '10 Sep',
    brand: 'shopify',
    title: 'Shopify goes back to native',
    detail: 'Shop is rebuilt in Swift and Kotlin in 12 weeks. The main app follows later this year.',
  },
  {
    date: '19 Oct',
    brand: 'react',
    title: 'React Native 0.88',
    detail: 'The third release in a row with no breaking changes. Expo SDK 58 ships it.',
  },
  {
    date: '4 Nov',
    brand: 'discord',
    title: 'Discord moves its client to Rust',
    detail: 'Native interfaces on phones over a shared Rust core, replacing React Native and Electron.',
  },
  {
    date: '9 Nov',
    brand: 'expo',
    title: 'Expo previews Exact',
    detail: 'A runtime in Rust with no React in it, built for apps that agents write and test.',
  },
];

/** The months that started the question, in order. */
export function NativeTimeline() {
  return (
    <Figure caption="2026, in five dates. Two companies leaving, one experiment, and React Native carrying on.">
      <ol className="relative flex flex-col gap-5 before:absolute before:inset-y-2 before:left-[4.75rem] before:w-px before:bg-border sm:before:left-[5.25rem]">
        {EVENTS.map((event) => (
          <li key={event.date + event.title} className="relative grid grid-cols-[4rem_1.5rem_1fr] items-start gap-x-2 sm:grid-cols-[4.5rem_1.5rem_1fr]">
            <span className="pt-0.5 text-sm font-medium tabular-nums text-muted-foreground">{event.date}</span>
            <span className="relative z-10 flex size-6 items-center justify-center rounded-full border bg-card">
              <BrandMark brand={event.brand} className="size-3.5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-foreground">{event.title}</span>
              <span className="text-sm text-muted-foreground text-pretty">{event.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </Figure>
  );
}

/** One layer of a stack: shared across platforms, or split into one cell per platform. */
function Layer({ cells, shared = false }: { cells: string[]; shared?: boolean }) {
  return (
    <div className="flex gap-1">
      {cells.map((cell) => (
        <span
          key={cell}
          className={cn(
            'flex min-h-9 flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-center text-xs leading-tight',
            shared
              ? 'bg-foreground font-medium text-background'
              : 'border border-dashed border-foreground/25 text-muted-foreground'
          )}
        >
          {cell}
        </span>
      ))}
    </div>
  );
}

const STACKS: { name: string; brands: Brand[]; summary: string; layers: { cells: string[]; shared?: boolean }[] }[] = [
  {
    name: 'React Native',
    brands: ['react', 'expo'],
    summary: 'One codebase draws real native views on both platforms.',
    layers: [
      { cells: ['Your app in React and TypeScript'], shared: true },
      { cells: ['Hermes and JSI'], shared: true },
      { cells: ['UIKit views', 'Android views'] },
    ],
  },
  {
    name: 'Shopify, from now on',
    brands: ['swift', 'kotlin'],
    summary: 'Each platform written in its own language, with agents doing much of the writing twice.',
    layers: [
      { cells: ['Swift interface', 'Kotlin interface'] },
      { cells: ['Swift logic', 'Kotlin logic'] },
      { cells: ['UIKit', 'Android'] },
    ],
  },
  {
    name: 'Discord, as announced',
    brands: ['rust', 'discord'],
    summary: 'A native interface on each platform, over one core in Rust that desktop shares.',
    layers: [
      { cells: ['iOS', 'Android', 'Desktop'] },
      { cells: ['Shared core in Rust'], shared: true },
    ],
  },
  {
    name: 'Exact, in preview',
    brands: ['expo', 'rust'],
    summary: 'A small interface language compiled to a plan, run by Rust on native hosts and by the DOM on the web.',
    layers: [
      { cells: ['Contract view, TypeScript or Rust data'], shared: true },
      { cells: ['Compiled plan'], shared: true },
      { cells: ['Web DOM', 'UIKit', 'AppKit', 'Linux'] },
    ],
  },
];

/** How much of an app each approach shares, layer by layer. */
export function StackComparison() {
  return (
    <Figure caption="Solid layers are written once and shared. Dashed layers are written again for each platform.">
      <div className="grid gap-4 sm:grid-cols-2">
        {STACKS.map((stack) => (
          <div key={stack.name} className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <span className="flex -space-x-1">
                {stack.brands.map((brand) => (
                  <span key={brand} className="flex size-7 items-center justify-center rounded-full border bg-card">
                    <BrandMark brand={brand} className="size-4" />
                  </span>
                ))}
              </span>
              <span className="font-medium text-foreground">{stack.name}</span>
            </div>
            <div className="flex flex-col gap-1">
              {stack.layers.map((layer, index) => (
                <Layer key={index} cells={layer.cells} shared={layer.shared} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-pretty">{stack.summary}</p>
          </div>
        ))}
      </div>
    </Figure>
  );
}

const COSTS: { label: string; react: number; native: number; note: string }[] = [
  { label: 'Writing a feature', react: 1, native: 1.2, note: 'Agents write the second copy' },
  { label: 'Reviewing it', react: 1, native: 2, note: 'Two diffs to read' },
  { label: 'Testing it', react: 1.2, native: 2, note: 'Two apps to test' },
  { label: 'Keeping both in step', react: 0.4, native: 1.6, note: 'Parity drifts' },
];

/** Where the cost of a second codebase went, and where it did not. */
export function SecondCodebase() {
  const max = Math.max(...COSTS.flatMap((cost) => [cost.react, cost.native]));
  return (
    <Figure caption="An illustration, not a measurement: agents cut the cost of writing the second copy, not the review, testing and upkeep that come with it.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-foreground" /> One shared codebase
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-dashed border-foreground/50" /> Two native codebases
          </span>
        </div>
        {COSTS.map((cost) => (
          <div key={cost.label} className="grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{cost.label}</span>
              <span className="text-xs text-muted-foreground">{cost.note}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="h-2.5 rounded-sm bg-foreground" style={{ width: `${(cost.react / max) * 100}%` }} />
              <span
                className="h-2.5 rounded-sm border border-dashed border-foreground/50"
                style={{ width: `${(cost.native / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Figure>
  );
}
