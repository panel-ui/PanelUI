'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { cn } from '@/lib/utils';
import { Feedback } from 'panelui-web/feedback';

const TAGS = ['Bug', 'Slow', 'Confusing', 'Missing feature', 'Praise'];

export default function FeedbackTags() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const toggle = (tag: string) =>
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );

  // A tag on its own says something, so it is enough to send.
  const nothingToSend = tags.length === 0 && message.trim().length === 0;

  return (
    <Feedback open={open} onOpenChange={setOpen} value={message} onValueChange={setMessage}>
      <Feedback.Trigger render={<Button variant="outline" />}>Send feedback</Feedback.Trigger>
      <Feedback.Content>
        <Feedback.Panel>
          <Feedback.Title>What is this about?</Feedback.Title>
          <Feedback.Close />
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const picked = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => toggle(tag)}
                  className={cn(
                    'h-8 cursor-pointer rounded-full px-3 text-sm font-medium transition-colors',
                    picked
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-foreground/10 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <Feedback.Field minHeight={120} placeholder="Anything to add? (optional)" />
        </Feedback.Panel>
        <Feedback.Footer>
          <Feedback.Cancel />
          <Feedback.Submit
            disabled={nothingToSend}
            onSubmit={() => {
              setOpen(false);
              setMessage('');
              setTags([]);
            }}
          />
        </Feedback.Footer>
      </Feedback.Content>
    </Feedback>
  );
}
