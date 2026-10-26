'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The install command with a copy button — the highest-intent element on the
 * page, so it sits directly under the headline.
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
    <div className="flex w-full max-w-xl items-center gap-2 rounded-lg border bg-card p-1.5 pl-4">
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {command}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy install command'}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  );
}
