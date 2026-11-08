'use client';

import { Pagination } from 'panelui-web/pagination';

export default function PaginationCompact() {
  return (
    <Pagination
      count={18}
      defaultPage={6}
      variant="compact"
      aria-label="Invoices"
      className="max-w-xs"
    />
  );
}
