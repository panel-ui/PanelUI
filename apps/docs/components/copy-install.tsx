'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The install command with a copy button — the highest-intent element on the
 * page, so it sits directly under the headline.
 */
export function CopyInstall({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex w-full max-w-md items-center gap-2 rounded-lg border bg-card p-1.5 pl-4">
      <code className="flex-1 truncate font-mono text-sm text-muted-foreground">
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
