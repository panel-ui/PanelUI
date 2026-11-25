'use client';

import { useState } from 'react';
import { Cancel01Icon, Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from 'panelui-web/button';
import { Card } from 'panelui-web/card';
import { Select } from 'panelui-web/select';

const LIMIT = 280;

const TONES = {
  plain: {
    label: 'Plain',
    main: 'The export runs overnight now, so the morning report is ready when you arrive.',
    also: [
      'Exports now run overnight. The morning report will be waiting.',
      'We moved the export to night time; the report is ready by morning.',
    ],
  },
  brief: {
    label: 'Brief',
    main: 'Exports now run overnight. Report ready by 8am.',
    also: ['Overnight exports: report ready at 8.', 'Report now ready first thing.'],
  },
  warm: {
    label: 'Warm',
    main: 'Good news: the export now runs while you sleep, so your report is waiting with your coffee.',
    also: ['Your morning report now arrives before you do.', 'No more waiting on exports. They finish overnight.'],
  },
} as const;

type Tone = keyof typeof TONES;

const TONE_ITEMS = (Object.keys(TONES) as Tone[]).map((value) => ({ value, label: TONES[value].label }));

export default function CardInset() {
  const [draft, setDraft] = useState(
    'we changed it so that the export job happens during the night which means the report should be done in the morning',
  );
  const [tone, setTone] = useState<Tone>('plain');
  const [copied, setCopied] = useState(false);
  const result = TONES[tone];

  return (
    <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
      <Card variant="inset" className="min-h-72">
        <Card.Header>
          <Card.Title as="div">Your draft</Card.Title>
        </Card.Header>
        <Card.Content>
          <textarea
            value={draft}
            maxLength={LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Draft"
            placeholder="Write something to rewrite"
            className="min-h-28 w-full flex-1 resize-none bg-transparent text-[0.9375rem] leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <Card.Action>
            <Button
              variant="ghost"
              size="icon-sm"
              shape="pill"
              aria-label="Clear draft"
              disabled={draft === ''}
              onClick={() => setDraft('')}
            >
              <HugeiconsIcon icon={Cancel01Icon} />
            </Button>
          </Card.Action>
          <Card.Meta label="Characters">
            {draft.length} / {LIMIT}
          </Card.Meta>
        </Card.Content>
      </Card>

      <Card variant="inset" className="min-h-72">
        <Card.Header>
          <Card.Title as="div">Rewrite</Card.Title>
          <Card.Action>
            <Select items={TONE_ITEMS} value={tone} onValueChange={(value) => setTone(value as Tone)}>
              <Select.Trigger variant="ghost" size="sm" aria-label="Tone">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {(Object.keys(TONES) as Tone[]).map((key) => (
                  <Select.Item key={key} value={key}>
                    {TONES[key].label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Card.Action>
        </Card.Header>
        <Card.Content>
          <p className="text-[0.9375rem] leading-relaxed">{draft ? result.main : ''}</p>
          <Card.Action>
            <Button
              variant="ghost"
              size="icon-sm"
              shape="pill"
              aria-label={copied ? 'Copied' : 'Copy rewrite'}
              disabled={!draft}
              onClick={() => {
                void navigator.clipboard?.writeText(result.main);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              }}
            >
              {copied ? <HugeiconsIcon icon={Tick02Icon} /> : <HugeiconsIcon icon={Copy01Icon} />}
            </Button>
          </Card.Action>
          {draft && (
            <div className="mt-auto pt-8">
              <p className="mb-2 text-xs text-muted-foreground">Other ways to say it</p>
              <ul className="space-y-1.5 text-sm leading-snug">
                {result.also.map((line) => (
                  <li key={line}>
                    <button
                      type="button"
                      onClick={() => setDraft(line)}
                      className="text-left text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {line}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
