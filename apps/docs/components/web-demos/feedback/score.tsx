'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { cn } from '@/lib/utils';
import { Feedback } from 'panelui-web/feedback';

export default function FeedbackScore() {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setScore(null);
      setMessage('');
    }
  };

  return (
    <Feedback open={open} onOpenChange={close} value={message} onValueChange={setMessage}>
      <Feedback.Trigger render={<Button variant="outline" />}>Rate the new editor</Feedback.Trigger>
      <Feedback.Content>
        {score === null ? (
          <>
            <Feedback.Panel>
              <Feedback.Title>How is the new editor?</Feedback.Title>
              <Feedback.Close />
              <Feedback.Rating
                minHeight={120}
                onValueChange={setScore}
                startLabel="Worse"
                endLabel="Much better"
              />
            </Feedback.Panel>
            <Feedback.Footer>
              <Feedback.Cancel>Not now</Feedback.Cancel>
            </Feedback.Footer>
          </>
        ) : (
          <>
            <Feedback.Panel>
              <Feedback.Title>
                What made it a <span className={cn(score >= 4 && 'text-emerald-500')}>{score}</span>?
              </Feedback.Title>
              <Feedback.Close />
              <Feedback.Field autoFocus minHeight={120} placeholder="In your own words" />
            </Feedback.Panel>
            <Feedback.Footer>
              {/* Back, not Cancel: preventDefault keeps the dialog open. */}
              <Feedback.Cancel
                onClick={(event) => {
                  event.preventDefault();
                  setScore(null);
                }}
              >
                Back
              </Feedback.Cancel>
              <Feedback.Submit onSubmit={() => close(false)} />
            </Feedback.Footer>
          </>
        )}
      </Feedback.Content>
    </Feedback>
  );
}
