'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ShowcaseApp } from '@/lib/showcase';

/**
 * One app on the showcase: a card with its first screen, which opens a dialog
 * with the rest of them and the links to get it.
 *
 * The whole card is the trigger, so the press target is the thing a reader is
 * looking at. The store links live in the dialog, not on the card, because a
 * card with three buttons on it is three decisions before the reader has seen
 * what the app is.
 */
export function ShowcaseCard({ app }: { app: ShowcaseApp }) {
  const [first] = app.screens;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-start transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        {/* The screen is cut off at the bottom by the frame, never cropped in
            the file: the whole screenshot is there, the card shows its top. */}
        <span className="relative block h-72 overflow-hidden border-b bg-muted px-10 pt-8">
          {first ? (
            <Image
              src={first.src}
              alt=""
              width={first.width}
              height={first.height}
              sizes="(min-width: 640px) 18rem, 70vw"
              className="mx-auto w-full max-w-56 rounded-t-[1.75rem] border border-b-0 shadow-lg/5 transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none"
            />
          ) : null}
        </span>
        <span className="flex items-center gap-3 p-4">
          <Image
            src={app.icon}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-[0.6rem] border"
          />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">{app.name}</span>
            <span className="truncate text-sm text-muted-foreground">{app.tagline}</span>
          </span>
        </span>
      </DialogTrigger>

      <DialogPopup className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pe-8">
            <Image
              src={app.icon}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-xl border"
            />
            <div className="flex flex-col gap-1">
              <DialogTitle>{app.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                by{' '}
                <Link
                  href={app.maker.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {app.maker.name}
                </Link>
              </p>
            </div>
            <Badge variant="outline" className="ms-auto max-sm:hidden">
              {app.uses}
            </Badge>
          </div>
          <DialogDescription className="text-base">{app.description}</DialogDescription>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-6">
          <ul
            aria-label={`${app.name} screenshots`}
            className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:thin]"
          >
            {app.screens.map((screen) => (
              <li key={screen.src} className="w-44 shrink-0 snap-start sm:w-52">
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  width={screen.width}
                  height={screen.height}
                  sizes="13rem"
                  className="h-auto w-full rounded-2xl border"
                />
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            {app.appStore ? (
              <Button render={<Link href={app.appStore} target="_blank" rel="noreferrer" />}>
                <AppleMark />
                App Store
              </Button>
            ) : null}
            {app.playStore ? (
              <Button
                variant="outline"
                render={<Link href={app.playStore} target="_blank" rel="noreferrer" />}
              >
                <PlayMark />
                Google Play
              </Button>
            ) : null}
            <Button variant="ghost" render={<Link href={app.url} target="_blank" rel="noreferrer" />}>
              Website
              <ArrowUpRightIcon />
            </Button>
          </div>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.66-.39 6.59 1.1 8.75.73 1.05 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.56-1.23Z" />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M4.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l9.3-9.7-9.3-9.7Zm10.4 10.8 2.6 2.7-11 6.3 8.4-9Zm0-2.2L6.6 1.9l11 6.3-2.6 2.7Zm3.9-1.9 2.6 1.5c.8.5.8 1.3 0 1.8l-2.6 1.5-2.8-2.4 2.8-2.4Z" />
    </svg>
  );
}
