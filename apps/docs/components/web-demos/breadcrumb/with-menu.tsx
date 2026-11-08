'use client';

import { useState } from 'react';
import { Breadcrumb } from 'panelui-web/breadcrumb';
import { Menu } from 'panelui-web/menu';

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Library', href: '/library' },
  { label: 'Components', href: '/library/components' },
  { label: 'Navigation', href: '/library/components/navigation' },
  { label: 'Guides', href: '/library/components/navigation/guides' },
  { label: 'Breadcrumb', href: '/library/components/navigation/breadcrumb' },
];

export default function BreadcrumbWithMenu() {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hidden = CRUMBS.slice(1, -1);

  return (
    <Breadcrumb
      maxItems={4}
      ellipsisOpen={open}
      onEllipsisClick={(event) => {
        setAnchor(event.currentTarget);
        setOpen(true);
      }}
    >
      <Breadcrumb.List>
        {CRUMBS.map((crumb, index) => (
          <Breadcrumb.Item key={crumb.href}>
            {index === CRUMBS.length - 1 ? (
              <Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
            ) : (
              <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
            )}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb.List>
      <Menu open={open} onOpenChange={setOpen}>
        <Menu.Content anchor={anchor} align="start">
          {hidden.map((crumb) => (
            <Menu.Item key={crumb.href} render={<a href={crumb.href} />}>
              {crumb.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu>
    </Breadcrumb>
  );
}
