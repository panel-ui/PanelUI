'use client';

import { Pagination } from 'panelui-web/pagination';

export default function PaginationManyPages() {
  return (
    <Pagination
      count={64}
      defaultPage={32}
      siblings={1}
      boundaries={1}
      aria-label="Archive pages"
      className="max-w-2xl"
    />
  );
}
