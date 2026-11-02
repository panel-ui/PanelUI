'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Feedback } from 'panelui-web/feedback';

export default function FeedbackBlur() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <Feedback open={open} onOpenChange={setOpen} value={message} onValueChange={setMessage}>
      <Feedback.Trigger render={<Button variant="outline" />}>Suggest a feature</Feedback.Trigger>
      {/* `blur` frosts the page behind the dialog instead of only darkening it. */}
      <Feedback.Content blur>
        <Feedback.Panel>
          <Feedback.Title>What would you add to the calendar?</Feedback.Title>
          <Feedback.Close />
          <Feedback.Field autoFocus placeholder="A view, a shortcut, a setting…" />
        </Feedback.Panel>
        <Feedback.Footer>
          <Feedback.Cancel />
          <Feedback.Submit
            onSubmit={() => {
              setOpen(false);
              setMessage('');
            }}
          />
        </Feedback.Footer>
      </Feedback.Content>
    </Feedback>
  );
}
