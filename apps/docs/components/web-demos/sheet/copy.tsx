'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet } from 'panelui-web/sheet';

const CODES = ['7KQ2-M9XD', 'HV4T-28PL', 'Q0RS-6WNE', 'ZB3J-T1YC', 'LM8F-UA5K', 'D6GX-4PEQ', 'W2NH-9VRB', 'C5YT-KJ70'];

export default function SheetCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODES.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // The codes can still be selected and copied by hand.
    }
  };

  return (
    <Sheet>
      <Sheet.Trigger render={<Button variant="outline" />}>Show recovery codes</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header
          title="Recovery codes"
          description="Each code signs you in once if you lose your phone. Keep them somewhere other than this computer."
        />
        <Sheet.Body>
          <ol className="grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-2xl bg-muted px-5 py-4 font-mono text-[15px] tabular-nums">
            {CODES.map((code, at) => (
              <li key={code} className="flex items-baseline gap-3">
                <span className="w-4 text-end text-xs text-muted-foreground select-none">{at + 1}</span>
                {code}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted-foreground">
            Generated 26 October. Making new codes turns these off.
          </p>
        </Sheet.Body>
        <Sheet.Footer>
          <Button size="lg" onClick={copy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy all eight'}
          </Button>
          <Sheet.Close render={<Button size="lg" variant="ghost" />}>Done</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet>
  );
}
