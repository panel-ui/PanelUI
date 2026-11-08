'use client';

import { TableOfContents } from 'panelui-web/table-of-contents';

const SECTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'start', label: 'Getting started' },
  { value: 'states', label: 'States' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'api', label: 'API reference' },
];

export default function TableOfContentsThumb() {
  return (
    <TableOfContents defaultValue="states" className="w-52">
      <TableOfContents.Title>On this page</TableOfContents.Title>
      <TableOfContents.List>
        {SECTIONS.map((section) => (
          <TableOfContents.Item key={section.value} value={section.value}>
            <TableOfContents.Link href={`#toc-thumb-${section.value}`}>{section.label}</TableOfContents.Link>
          </TableOfContents.Item>
        ))}
      </TableOfContents.List>
    </TableOfContents>
  );
}
