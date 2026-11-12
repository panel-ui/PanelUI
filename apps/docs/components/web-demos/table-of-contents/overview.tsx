'use client';

import { useRef } from 'react';
import { ScrollArea } from 'panelui-web/scroll-area';
import { TableOfContents } from 'panelui-web/table-of-contents';

const SECTIONS = [
  {
    value: 'introduction',
    label: 'Introduction',
    text: 'Orders leave the warehouse within two working days. What follows is how a parcel gets from there to a doorstep, and what to do when it does not arrive at all.',
  },
  {
    value: 'shipping',
    label: 'Shipping',
    text: 'Standard delivery is free over £40 and takes three to five working days. Express orders placed before noon are sent the same day, and a tracking link arrives by email as soon as the carrier has scanned the parcel.',
  },
  {
    value: 'returns',
    label: 'Returns',
    text: 'Anything unused can come back within thirty days. Print the label from the order page, put the item in its original box, and leave it at any drop-off point; the refund is issued when it reaches the warehouse.',
  },
  {
    value: 'exchanges',
    label: 'Exchanges',
    text: 'For a different size or colour, send the first item back and place a new order. It is quicker than a two-way exchange, and the new parcel is not held while the old one is in transit.',
  },
  {
    value: 'contact',
    label: 'Contact',
    text: 'The team answers from 09:00 to 18:00 on weekdays. Include the order number in the first message and the reply can be answered in one go rather than three.',
  },
];

export default function TableOfContentsOverview() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="grid w-full max-w-2xl grid-cols-[minmax(0,1fr)_8.5rem] gap-5">
      <ScrollArea viewportRef={scroller} className="h-80 rounded-xl border bg-card">
        <article className="px-5 py-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Guide</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Shipping and returns</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Everything about getting an order to you, and getting it back to us.
          </p>

          {SECTIONS.map((section) => (
            <section key={section.value} id={`toc-overview-${section.value}`} className="mt-8">
              <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{section.text}</p>
            </section>
          ))}
        </article>
      </ScrollArea>

      <TableOfContents root={scroller} offset={16} defaultValue="introduction" className="self-start py-1">
        <TableOfContents.Title>On this page</TableOfContents.Title>
        <TableOfContents.List>
          {SECTIONS.map((section) => (
            <TableOfContents.Item key={section.value} value={section.value}>
              <TableOfContents.Link href={`#toc-overview-${section.value}`}>{section.label}</TableOfContents.Link>
            </TableOfContents.Item>
          ))}
        </TableOfContents.List>
      </TableOfContents>
    </div>
  );
}
