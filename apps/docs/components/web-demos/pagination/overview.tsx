'use client';

import { Pagination } from 'panelui-web/pagination';

export default function PaginationOverview() {
  return (
    <Pagination
      count={12}
      defaultPage={3}
      aria-label="Search results"
      className="max-w-md"
    />
  );
}
