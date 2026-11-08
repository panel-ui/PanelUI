'use client';

import { Pagination } from 'panelui-web/pagination';

export default function PaginationThumb() {
  return <Pagination count={12} defaultPage={3} variant="compact" size="sm" aria-label="Pages" />;
}
