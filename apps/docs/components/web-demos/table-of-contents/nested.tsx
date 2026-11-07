'use client';

import { TableOfContents } from 'panelui-web/table-of-contents';

export default function TableOfContentsNested() {
  return (
    <div className="w-full max-w-xs rounded-xl border bg-card p-4">
      <TableOfContents defaultValue="presets">
        <TableOfContents.Title>On this page</TableOfContents.Title>
        <TableOfContents.List>
          <TableOfContents.Item value="overview">
            <TableOfContents.Link href="#toc-nested-overview">Overview</TableOfContents.Link>
          </TableOfContents.Item>
          <TableOfContents.Item value="installation">
            <TableOfContents.Link href="#toc-nested-installation">Installation</TableOfContents.Link>
          </TableOfContents.Item>
          <TableOfContents.Item value="npm" depth={1}>
            <TableOfContents.Link href="#toc-nested-npm">From npm</TableOfContents.Link>
          </TableOfContents.Item>
          <TableOfContents.Item value="manual" depth={1}>
            <TableOfContents.Link href="#toc-nested-manual">By hand</TableOfContents.Link>
          </TableOfContents.Item>
          <TableOfContents.Item value="configuration">
            <TableOfContents.Link href="#toc-nested-configuration">Configuration</TableOfContents.Link>
          </TableOfContents.Item>
          <TableOfContents.Item value="presets" depth={1}>
            <TableOfContents.Link href="#toc-nested-presets">Presets</TableOfContents.Link>
          </TableOfContents.Item>
          <TableOfContents.Item value="api">
            <TableOfContents.Link href="#toc-nested-api">API reference</TableOfContents.Link>
          </TableOfContents.Item>
        </TableOfContents.List>
      </TableOfContents>
    </div>
  );
}
