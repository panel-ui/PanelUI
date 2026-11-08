'use client';

import { useRef } from 'react';
import { TableOfContents } from 'panelui-web/table-of-contents';

type Section = {
  value: string;
  label: string;
  depth: 0 | 1;
  code?: boolean;
  text: string;
};

const SECTIONS: Section[] = [
  {
    value: 'usage',
    label: 'Usage',
    depth: 0,
    text: 'Import the button and give it a label. It takes the full press, hover and focus treatment from the theme, so a plain call already matches every other control on the page.',
  },
  {
    value: 'sizes',
    label: 'Sizes',
    depth: 0,
    text: 'Five sizes share one type scale. Pick the one that matches the row it sits in rather than the importance of the action: emphasis is the variant’s job.',
  },
  {
    value: 'size',
    label: 'size',
    depth: 1,
    code: true,
    text: 'From xs to xl. The default is md, which lines up with an input of the same size, so a field and its submit button share a baseline.',
  },
  {
    value: 'full-width',
    label: 'fullWidth',
    depth: 1,
    code: true,
    text: 'Stretches the button across its container, for the single action at the end of a form or the bottom of a sheet.',
  },
  {
    value: 'api',
    label: 'API reference',
    depth: 0,
    text: 'Every prop is typed and documented in the source. The table below is generated from those types, so it cannot drift from what the component accepts.',
  },
  {
    value: 'button',
    label: 'Button',
    depth: 1,
    text: 'Accepts every attribute of a native button as well as its own props. A render prop draws it as a link or a router’s link instead.',
  },
  {
    value: 'notes',
    label: 'Notes',
    depth: 0,
    text: 'A few details that only matter in particular layouts.',
  },
  {
    value: 'large-text',
    label: 'Large text',
    depth: 1,
    text: 'Labels wrap rather than truncate when the reader has asked for larger text, so an action is never cut down to its first word.',
  },
  {
    value: 'icons',
    label: 'Icon buttons',
    depth: 1,
    text: 'A button with only an icon needs an aria-label. The icon is decoration to a screen reader, and a button with no name is announced as nothing.',
  },
  {
    value: 'loading',
    label: 'Loading',
    depth: 1,
    text: 'While loading is set the label stays in place and a spinner covers it, so the button keeps its width and the row around it does not jump.',
  },
];

const heading = { 0: "text-base font-semibold", 1: "text-sm font-semibold" };

export default function TableOfContentsContour() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-[minmax(0,1fr)_10rem]">
        <div ref={scroller} className="h-96 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          <article className="px-5 pt-5 pb-48">
            {SECTIONS.map((section) => (
              <section key={section.value} id={"toc-contour-" + section.value} className="mt-6 scroll-mt-4 first:mt-0">
                <h3 className={heading[section.depth] + " text-foreground"}>
                  {section.code ? <code className="font-mono">{section.label}</code> : section.label}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{section.text}</p>
              </section>
            ))}
          </article>
        </div>

        <TableOfContents
          variant="contour"
          root={scroller}
          offset={16}
          defaultValue="usage"
          className="self-start p-4 ps-2"
        >
          <TableOfContents.Title>On this page</TableOfContents.Title>
          <TableOfContents.List>
            {SECTIONS.map((section) => (
              <TableOfContents.Item key={section.value} value={section.value} depth={section.depth}>
                <TableOfContents.Link href={"#toc-contour-" + section.value}>
                  {section.code ? <TableOfContents.Code>{section.label}</TableOfContents.Code> : section.label}
                </TableOfContents.Link>
              </TableOfContents.Item>
            ))}
          </TableOfContents.List>
        </TableOfContents>
      </div>
    </div>
  );
}
