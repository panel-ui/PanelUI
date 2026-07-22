import type { ReactNode } from 'react';

export interface PreviewFrameProps {
  children: ReactNode;
  /** Optional line under the frame. */
  caption?: string;
}

/**
 * The shaded, bordered container a preview sits in.
 *
 * It exists so the shot reads as an inset artifact rather than as part of the
 * page — which matters because most of these are of a dark app, and the docs
 * may well be in light mode.
 */
export function PreviewFrame({ children, caption }: PreviewFrameProps) {
  return (
    <figure className="not-prose my-6">
      <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-muted/50 p-4 sm:p-6 dark:bg-fd-card/60">
        {children}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-fd-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
