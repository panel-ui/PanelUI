'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import meta from '@/scripts/web-meta.json';
import { SECTIONS } from '@/components/gallery-sections';
import { WEB_DEMOS } from './web-demos/index.generated';

/**
 * The web collection's index: every component as a card with the component
 * itself running in it, and a line under it saying what it is for.
 *
 * The app's index draws a silhouette of each component, because a React Native
 * component cannot run on a web page. These can, so the card shows the real
 * thing: the globe is turning and the number is rolling before anybody has
 * read a name.
 *
 * What runs in a card is the component's `thumb` demo, a small one written for
 * this size. A page's lead demo is laid out for a wide frame and would be a
 * corner of itself here.
 */

type MetaOptions = { category?: string; title?: string };
type MetaEntry = [string, string, string, MetaOptions?];

const entries = Object.entries(meta as unknown as Record<string, MetaEntry>);

const titleOf = (entry: MetaEntry) => entry[3]?.title ?? entry[0];

function ComponentCard({ slug, entry }: { slug: string; entry: MetaEntry }) {
  const Thumb = WEB_DEMOS[`${slug}/thumb`];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card transition-colors hover:border-fd-primary/40">
      {/*
        The whole card is one link, so the component in it is a moving picture
        and not a control: it takes no pointer, no focus and is not read out.
        A slider that answered a drag here would be a slider that stopped the
        reader getting to its page.
      */}
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none flex h-56 items-center justify-center overflow-hidden border-b border-fd-border bg-fd-muted/40 p-5"
      >
        {Thumb ? (
          <Suspense fallback={null}>
            <Thumb />
          </Suspense>
        ) : null}
      </div>

      <div className="grid gap-1 p-4">
        <h3 className="text-sm font-semibold text-fd-foreground">
          {/* The link's own box is only the name, stretched over the card,
              so the heading keeps its semantics. */}
          <Link
            href={`/docs/web/${entry[3]?.category === 'charts' ? 'charts' : 'components'}/${slug}`}
            className="before:absolute before:inset-0">
            {titleOf(entry)}
          </Link>
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-fd-muted-foreground sm:h-[2lh]">
          {entry[1]}
        </p>
      </div>
    </div>
  );
}

export function WebComponentGallery() {
  return (
    <div className="not-prose flex flex-col gap-12">
      {SECTIONS.map(([category, heading, lede]) => {
        const section = entries
          .filter(([, entry]) => (entry[3]?.category ?? 'layout') === category)
          .sort(([, a], [, b]) => titleOf(a).localeCompare(titleOf(b)));
        if (section.length === 0) return null;

        return (
          <section key={category} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id={category} className="scroll-m-20 text-xl font-semibold text-fd-foreground">
                {heading}
              </h2>
              <p className="text-sm text-fd-muted-foreground">{lede}</p>
            </div>
            {/* Three across at the top width, one fewer than the app's index:
                a running component needs more room than a silhouette of one. */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {section.map(([slug, entry]) => (
                <ComponentCard key={slug} slug={slug} entry={entry} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
