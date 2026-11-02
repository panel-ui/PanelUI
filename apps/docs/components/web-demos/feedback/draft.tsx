'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Feedback } from 'panelui-web/feedback';

/** Short answers are rarely useful ones. */
const ENOUGH = 20;

export default function FeedbackDraft() {
  const [open, setOpen] = useState(false);
  // Held here, so it is still there when the dialog is opened again.
  const [draft, setDraft] = useState('');
  const written = draft.trim().length;

  return (
    <div className="flex flex-col items-center gap-3">
      <Feedback open={open} onOpenChange={setOpen} value={draft} onValueChange={setDraft}>
        <Feedback.Trigger render={<Button variant="outline" />}>
          {written > 0 ? 'Continue your message' : 'Send feedback'}
        </Feedback.Trigger>
        <Feedback.Content>
          <Feedback.Panel>
            <Feedback.Title>What would you change?</Feedback.Title>
            <Feedback.Close />
            <Feedback.Field autoFocus minHeight={160} placeholder="One thing is plenty" />
            <Feedback.Message>
              {written < ENOUGH ? `${ENOUGH - written} more characters` : 'Ready to send'}
            </Feedback.Message>
          </Feedback.Panel>
          <Feedback.Footer>
            <Feedback.Cancel>Keep for later</Feedback.Cancel>
            <Feedback.Submit
              disabled={written < ENOUGH}
              onSubmit={() => {
                setOpen(false);
                setDraft('');
              }}
            />
          </Feedback.Footer>
        </Feedback.Content>
      </Feedback>
      <p className="text-sm text-muted-foreground">
        {written > 0 ? `Draft kept: ${written} characters` : 'No draft'}
      </p>
    </div>
  );
}
