'use client';

import { ScrollArea } from 'panelui-web/scroll-area';

const TERMS = [
  'You can cancel at any time from the billing page. Your plan stays active until the end of the period you have paid for, and nothing further is charged.',
  'Refunds are given for annual plans cancelled within fourteen days of a renewal. Monthly plans are not refunded part way through a month.',
  'Seats can be added at any point and are charged for the rest of the current period. Seats removed are credited against the next invoice.',
  'Invoices are sent to the billing contact on the first working day of each period. A failed payment is retried three times over a week before the workspace is paused.',
  'A paused workspace keeps all of its data for ninety days. Paying the outstanding invoice restores it with nothing lost.',
  'Prices are shown before tax. Tax is added at checkout using the billing address on the account.',
];

export default function ScrollAreaFade() {
  return (
    <ScrollArea fade className="h-64 w-full max-w-md rounded-2xl border bg-background">
      <div className="flex flex-col gap-4 px-5 py-5 text-sm leading-6 text-muted-foreground">
        {TERMS.map((term, i) => (
          <p key={i}>{term}</p>
        ))}
      </div>
    </ScrollArea>
  );
}
