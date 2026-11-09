import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import { ShowcaseCard } from '@/components/showcase-card';
import { SHOWCASE } from '@/lib/showcase';
import { absoluteUrl, site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Showcase',
  description: `Apps built with ${site.name}: React Native and Expo apps on the App Store and Google Play that use its components.`,
  alternates: { canonical: absoluteUrl('/showcase') },
};

/** A new issue with the showcase form already chosen. */
const SUBMIT_ISSUE = `${site.repo}/issues/new?template=showcase.yml`;
/** The file a pull request edits to add an app. */
const SUBMIT_PR = `${site.repo}/edit/main/apps/docs/lib/showcase.ts`;

export default function ShowcasePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-6 pt-20 pb-14">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <p className="text-sm text-muted-foreground">Showcase</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Built with {site.name}.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground text-balance">
            Apps in the stores that use {site.name} for their interface. Open one to see its
            screens and where to get it.
          </p>
        </div>
      </section>

      <section className="border-t px-6 py-16">
        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE.map((app) => (
            <li key={app.slug}>
              <ShowcaseCard app={app} />
            </li>
          ))}

          {/* The way in for the next one, in the grid rather than under it, so
              it is seen at the same moment as the apps already there. */}
          <li className="flex flex-col justify-between gap-6 rounded-2xl border border-dashed p-6">
            <div className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-full border text-muted-foreground">
                <PlusIcon className="size-5" />
              </span>
              <h2 className="font-heading text-lg font-semibold tracking-tight">Add your app</h2>
              <p className="text-sm text-muted-foreground">
                Shipped something with {site.name}? Open an issue with its name, store links and a
                few screenshots, or send a pull request that adds it to the list.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={SUBMIT_ISSUE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline underline-offset-4"
              >
                Open an issue
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href={SUBMIT_PR}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
              >
                Or edit the list on GitHub
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </li>
        </ul>
      </section>
    </main>
  );
}
