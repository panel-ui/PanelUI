'use client';

import { Pagination } from 'panelui-web/pagination';

export default function PaginationSimple() {
  return (
    <Pagination
      count={6}
      defaultPage={2}
      variant="simple"
      aria-label="Onboarding steps"
      className="max-w-md"
    />
  );
}
