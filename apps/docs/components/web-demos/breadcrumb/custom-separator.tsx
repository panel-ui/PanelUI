'use client';

import { Breadcrumb } from 'panelui-web/breadcrumb';

export default function BreadcrumbCustomSeparator() {
  return (
    <Breadcrumb separator="/">
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/docs">Docs</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/docs/guides">Guides</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Breadcrumb.Page>Theming</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  );
}
