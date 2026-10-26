'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';

/**
 * The install command with a copy button — the highest-intent element on the
 * page, so it sits directly under the headline.
 *
 * It is drawn like the segmented tabs that sit above it in the hero: the
 * same muted track, radius and padding, so the two read as one control, and
 * the copy button rises out of the track on hover the way a chosen tab does.
 *
 * A long command scrolls sideways inside the box on a narrow screen rather
 * than being cut off with an ellipsis: a command that is only half visible
 * cannot be read back to check what the button copied.
 */
export function CopyInstall({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex w-full max-w-xl items-center gap-2 rounded-xl bg-muted p-1 pl-4">
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy install command'}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,box-shadow] duration-200 hover:bg-background hover:text-foreground hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-input [&_svg]:size-4"
      >
        {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      </button>
    </div>
  );
}
