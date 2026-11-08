'use client';

import { useState } from 'react';
import { Pagination } from 'panelui-web/pagination';

const TOTAL = 143;
const PAGE_SIZE = 20;
const PAGES = Math.ceil(TOTAL / PAGE_SIZE);

export default function PaginationWithStatus() {
  const [page, setPage] = useState(1);

  return (
    <Pagination
      count={PAGES}
      page={page}
      onPageChange={setPage}
      aria-label="Invoices"
      className="max-w-2xl"
    >
      <Pagination.Status page={page} pageSize={PAGE_SIZE} total={TOTAL} />
    </Pagination>
  );
}
