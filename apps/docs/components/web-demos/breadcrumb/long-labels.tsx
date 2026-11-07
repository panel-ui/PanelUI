'use client';

import { Breadcrumb } from 'panelui-web/breadcrumb';

export default function BreadcrumbLongLabels() {
  return (
    <div className="w-full max-w-sm">
      <Breadcrumb>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/projects/autumn-catalogue">
              The autumn catalogue of new and returning titles
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              Field notes from the fourth proof, with every correction still open
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    </div>
  );
}
