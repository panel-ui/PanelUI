'use client';

import { useRef } from 'react';
import { TableOfContents } from 'panelui-web/table-of-contents';

const SECTIONS = [
  {
    value: 'highlights',
    label: 'Highlights',
    text: 'Charts can now stack a series by a second key, tooltips stay inside the plot at its edges, and a legend can be placed on any side. The theme gained a muted surface for panels that sit inside a card.',
  },
  {
    value: 'fixes',
    label: 'Fixes',
    text: 'A popover opened from a row no longer closes when the row is scrolled under the pointer. Menus keep their place after a resize, and the focus ring is drawn on the element that takes focus rather than the one that wraps it.',
  },
  {
    value: 'breaking',
    label: 'Breaking changes',
    text: 'The `tone` prop on Alert is now `variant`. The old name still works for this release and is removed in 3.0, with a warning in development. Nothing else changes shape.',
  },
  {
    value: 'upgrade',
    label: 'Upgrade guide',
    text: 'Upgrade the package, then run the codemod if the project uses `tone`. The theme file needs no edits: every token the release reads already exists in 2.3, and the new surface is an addition rather than a rename.',
  },
  {
    value: 'next',
    label: 'What comes next',
    text: 'Work has started on a table that sorts and filters without a data library, and on a command palette that can be opened from anywhere in an app. Both are in the next minor.',
  },
];

export default function TableOfContentsScrolling() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-[minmax(0,1fr)_8.5rem]">
        <div ref={scroller} className="h-80 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-5 py-2.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <span>Release notes</span>
            <span className="tabular-nums">v2.4</span>
          </div>

          <article className="px-5 pt-5 pb-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">What changed in 2.4</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              A small release: one new surface, a few fixes, and one rename that will be removed in 3.0.
            </p>

            {SECTIONS.map((section) => (
              <section key={section.value} id={`toc-scrolling-${section.value}`} className="mt-7 scroll-mt-12">
                <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{section.text}</p>
              </section>
            ))}
          </article>
        </div>

        {/* The bar inside the scroller is why the reading line is pushed down:
            without `offset`, a heading would count as read while it was still
            behind the bar. */}
        <TableOfContents root={scroller} offset={56} defaultValue="highlights" className="self-start p-4 ps-2">
          <TableOfContents.Title>On this page</TableOfContents.Title>
          <TableOfContents.List>
            {SECTIONS.map((section) => (
              <TableOfContents.Item key={section.value} value={section.value}>
                <TableOfContents.Link href={`#toc-scrolling-${section.value}`}>{section.label}</TableOfContents.Link>
              </TableOfContents.Item>
            ))}
          </TableOfContents.List>
        </TableOfContents>
      </div>
    </div>
  );
}
