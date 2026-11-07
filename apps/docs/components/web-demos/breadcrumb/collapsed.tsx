'use client';

import { Breadcrumb } from 'panelui-web/breadcrumb';

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Library', href: '/library' },
  { label: 'Components', href: '/library/components' },
  { label: 'Navigation', href: '/library/components/navigation' },
  { label: 'Guides', href: '/library/components/navigation/guides' },
];

export default function BreadcrumbCollapsed() {
  return (
    <Breadcrumb maxItems={3}>
      <Breadcrumb.List>
        {CRUMBS.map((crumb) => (
          <Breadcrumb.Item key={crumb.href}>
            <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
          </Breadcrumb.Item>
        ))}
        <Breadcrumb.Item>
          <Breadcrumb.Page>Breadcrumb</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  );
}
