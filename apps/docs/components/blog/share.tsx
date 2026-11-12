'use client';

import { CheckIcon, LinkIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';

/*
 * The share row under a post's byline: the four places a post like this gets
 * passed on, and a copy of the link for everywhere else.
 *
 * Each network is a plain link to its own share page, opened in a new tab,
 * rather than a script from the network: nothing loads until someone presses
 * it, and nothing about the reader is sent anywhere before then.
 */

/** A brand mark, drawn from a 24-unit path in the current text colour. */
function Mark({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <path d={d} />
    </svg>
  );
}

const X_MARK = 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z';
const LINKEDIN_MARK = 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z';
const HACKER_NEWS_MARK = 'M0 24V0h24v24H0zM6.951 5.896l4.112 7.708v5.064h1.583v-4.972l4.148-7.799h-1.749l-2.457 4.875c-.372.745-.688 1.434-.688 1.434s-.297-.708-.651-1.434L8.831 5.896h-1.88z';
const REDDIT_MARK = 'M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z';

function ShareButton({ label, children, href, onClick }: { label: string; children: ReactNode; href?: string; onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          href ? (
            <Button
              variant="ghost"
              size="icon-sm"
              render={<a href={href} target="_blank" rel="noopener noreferrer" />}
              aria-label={label}
            />
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={onClick} aria-label={label} />
          )
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

export function Share({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const link = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // A browser that refuses the clipboard leaves the address bar as the way to copy.
    }
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Share this post">
      <span className="me-1 text-sm text-muted-foreground">Share</span>
      <ShareButton label="Share on X" href={`https://x.com/intent/post?text=${text}&url=${link}`}>
        <Mark d={X_MARK} />
      </ShareButton>
      <ShareButton label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${link}`}>
        <Mark d={LINKEDIN_MARK} />
      </ShareButton>
      <ShareButton label="Submit to Hacker News" href={`https://news.ycombinator.com/submitlink?u=${link}&t=${text}`}>
        <Mark d={HACKER_NEWS_MARK} />
      </ShareButton>
      <ShareButton label="Share on Reddit" href={`https://www.reddit.com/submit?url=${link}&title=${text}`}>
        <Mark d={REDDIT_MARK} />
      </ShareButton>
      <ShareButton label={copied ? 'Link copied' : 'Copy link'} onClick={copy}>
        {copied ? <CheckIcon aria-hidden="true" className="size-4" /> : <LinkIcon aria-hidden="true" className="size-4" />}
      </ShareButton>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Link copied' : ''}
      </span>
    </div>
  );
}
