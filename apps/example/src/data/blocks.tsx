import type { ReactNode } from 'react';

/**
 * Composed page sections built from several components — sign-in forms,
 * settings panels, pricing tables and the like.
 *
 * Empty for now. The home screen count and the blocks screen both read from
 * here, so adding the first entry lights both up without further changes.
 */
export interface BlockEntry {
  slug: string;
  name: string;
  summary: string;
  render: () => ReactNode;
}

export const BLOCKS: BlockEntry[] = [];
