'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Feedback } from 'panelui-web/feedback';

/** Stands in for a request. It fails once, so there is a failure to look at. */
function send(attempt: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => (attempt === 0 ? reject(new Error('offline')) : resolve()), 900);
  });
}

export default function FeedbackFailed() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('The export button does nothing on Safari.');
  const [status, setStatus] = useState<'idle' | 'sending' | 'failed'>('idle');
  const [attempt, setAttempt] = useState(0);

  const submit = async () => {
    setStatus('sending');
    try {
      await send(attempt);
      setOpen(false);
      setMessage('');
      setStatus('idle');
      setAttempt(0);
    } catch {
      // The dialog is still open, so the failure has somewhere to be said
      // and the message is still in the field to send again.
      setStatus('failed');
      setAttempt((current) => current + 1);
    }
  };

  return (
    <Feedback open={open} onOpenChange={setOpen} value={message} onValueChange={setMessage}>
      <Feedback.Trigger render={<Button variant="outline" />}>Report a problem</Feedback.Trigger>
      <Feedback.Content>
        <Feedback.Panel>
          <Feedback.Title>What went wrong?</Feedback.Title>
          <Feedback.Close />
          <Feedback.Field minHeight={160} placeholder="What were you doing when it happened?" />
          {status === 'failed' ? (
            <Feedback.Message tone="destructive">
              That did not send. Your message is still here.
            </Feedback.Message>
          ) : null}
        </Feedback.Panel>
        <Feedback.Footer>
          <Feedback.Cancel />
          <Feedback.Submit disabled={status === 'sending' ? true : undefined} onSubmit={submit}>
            {status === 'sending' ? 'Sending…' : status === 'failed' ? 'Try again' : 'Submit'}
          </Feedback.Submit>
        </Feedback.Footer>
      </Feedback.Content>
    </Feedback>
  );
}
