'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { TableOfContents } from 'panelui-web/table-of-contents';

const STEPS = [
  {
    value: 'details',
    label: 'Details',
    heading: 'Order details',
    text: 'Three items, placed on 2 November and shipping to 14 Corfield Road. The invoice is addressed to the card holder.',
  },
  {
    value: 'delivery',
    label: 'Delivery',
    heading: 'Delivery',
    text: 'Standard delivery, three to five working days. The parcel is with the carrier and the tracking link is live.',
  },
  {
    value: 'payment',
    label: 'Payment',
    heading: 'Payment',
    text: 'Paid in full with the card ending 4417. Nothing else is due, and the receipt is in the order email.',
  },
];

export default function TableOfContentsControlled() {
  const [active, setActive] = useState('details');
  const at = Math.max(
    0,
    STEPS.findIndex((step) => step.value === active)
  );
  const section = STEPS[at]!;

  return (
    <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm font-medium text-foreground">Invoice 2041</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={at === 0}
            onClick={() => setActive(STEPS[at - 1]!.value)}
          >
            Back
          </Button>
          <Button size="sm" disabled={at === STEPS.length - 1} onClick={() => setActive(STEPS[at + 1]!.value)}>
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-5 p-4">
        <TableOfContents value={active} onValueChange={setActive} observe={false}>
          <TableOfContents.Title>On this page</TableOfContents.Title>
          <TableOfContents.List>
            {STEPS.map((step) => (
              <TableOfContents.Item key={step.value} value={step.value}>
                <TableOfContents.Link href={`#toc-controlled-${step.value}`}>{step.label}</TableOfContents.Link>
              </TableOfContents.Item>
            ))}
          </TableOfContents.List>
        </TableOfContents>

        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Step {at + 1} of {STEPS.length}
          </p>
          <h3 id={`toc-controlled-${section.value}`} className="mt-1 scroll-mt-4 text-sm font-semibold text-foreground">
            {section.heading}
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{section.text}</p>
        </div>
      </div>
    </div>
  );
}
