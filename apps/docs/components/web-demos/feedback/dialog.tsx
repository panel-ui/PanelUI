'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Feedback } from 'panelui-web/feedback';

export default function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <Feedback open={open} onOpenChange={setOpen} value={message} onValueChange={setMessage}>
      <Feedback.Trigger render={<Button variant="outline" />}>Send feedback</Feedback.Trigger>
      <Feedback.Content>
        <Feedback.Panel>
          <Feedback.Title>What should we fix first?</Feedback.Title>
          <Feedback.Close />
          <Feedback.Field autoFocus placeholder="Tell us what got in your way" />
        </Feedback.Panel>
        <Feedback.Footer>
          <Feedback.Cancel />
          <Feedback.Submit
            onSubmit={() => {
              // Send `message` here, then close and clear for next time.
              setOpen(false);
              setMessage('');
            }}
          />
        </Feedback.Footer>
      </Feedback.Content>
    </Feedback>
  );
}
