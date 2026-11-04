'use client';

import { useEffect, useState } from 'react';
import { Usage, type UsageVariant } from 'panelui-web/usage';

const LIMIT = 200_000;
const LOOKS: UsageVariant[] = ['ring', 'dots', 'gauge', 'bar', 'cells', 'pill'];

/** A conversation filling up in steps, finishing, and starting over. */
const STEPS = [0, 22_000, 64_000, 108_000, 146_000, 171_000, 188_000, -1];

export default function UsageStates() {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => setStep((current) => (current + 1) % STEPS.length), 1400);
    return () => clearInterval(timer);
  }, []);

  const done = STEPS[step] === -1;
  const messages = done ? 188_000 : STEPS[step]!;
  const segments = messages > 0 ? [{ label: 'System prompt', value: 9_400 }, { label: 'Messages', value: messages - 9_400 }] : [];
  const state = step === 0 ? 'idle' : done ? 'done' : 'active';

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {LOOKS.map((look) => (
        <Usage key={look} limit={LIMIT} segments={segments} state={state}>
          <Usage.Trigger variant={look} />
          <Usage.Content side="bottom" align="center">
            <Usage.Summary unit="tokens" />
          </Usage.Content>
        </Usage>
      ))}
    </div>
  );
}
